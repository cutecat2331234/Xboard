package singbox

import (
	"context"
	"io"
	"net"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/sagernet/sing-box/adapter"
	"github.com/sagernet/sing/common/buf"
	singM "github.com/sagernet/sing/common/metadata"
	N "github.com/sagernet/sing/common/network"
	"golang.org/x/time/rate"

	"github.com/cedar2025/xboard-node/internal/nlog"
)

// ipPool caches ipSnapshot maps to reduce allocations.
var ipPool = sync.Pool{
	New: func() interface{} {
		return make(map[string]struct{}, 16)
	},
}

// ─── Per-user statistics ────────────────────────────────────────────────────

// userStats holds per-user traffic counters and alive IP tracking.
// Traffic counters are lock-free atomics (read on every packet).
// IP tracking uses a lightweight mutex (only touched at connect/disconnect).
type userStats struct {
	upload   atomic.Int64
	download atomic.Int64

	mu        sync.RWMutex   // RWMutex for concurrent reads
	ips       map[string]int // sourceIP → refcount (number of active conns from that IP)
	connCount int            // total active connections
}

// addConn registers a new connection from sourceIP.
func (u *userStats) addConn(sourceIP string) {
	u.mu.Lock()
	u.connCount++
	u.ips[sourceIP]++
	u.mu.Unlock()
}

// checkAndAddConn atomically decides whether a new connection from sourceIP
// would exceed the device limit and, if not, registers it — all under a single
// write lock. It returns true when the connection must be REJECTED (over limit
// and not selected); in that case nothing is registered.
//
// [H6] This collapses the former checkDeviceGate(RLock)+addConn(Lock) sequence
// into one critical section, eliminating the TOCTOU where two concurrent
// connections from new IPs could both observe "under limit" and both register,
// silently exceeding the limit. It mirrors the xray dispatcher's write-lock
// recheck-and-register pattern (dispatcher.go:317-358).
//
// globalIPs is an optional snapshot of IPs seen on OTHER nodes (already read by
// the caller under the global lock); when non-nil it is merged with the local
// set for the limit decision. The global set is inherently an eventually-
// consistent cross-node snapshot, so reading it slightly stale is acceptable —
// only the local count needs to be transactional, which it now is.
func (u *userStats) checkAndAddConn(sourceIP string, limit int, globalIPs map[string]bool) (rejected bool) {
	u.mu.Lock()
	defer u.mu.Unlock()

	// Already connected locally from this IP → always allowed (refcount bump).
	if u.ips[sourceIP] > 0 {
		u.connCount++
		u.ips[sourceIP]++
		return false
	}

	// Build the candidate set: local IPs (+ global IPs when provided), plus the
	// new sourceIP.
	candidate := make(map[string]bool, len(u.ips)+len(globalIPs)+1)
	for ip := range u.ips {
		candidate[ip] = true
	}
	for ip := range globalIPs {
		candidate[ip] = true
	}

	// Known on another node already → allowed.
	if globalIPs[sourceIP] {
		u.connCount++
		u.ips[sourceIP]++
		return false
	}

	if len(candidate) < limit {
		u.connCount++
		u.ips[sourceIP]++
		return false
	}

	// At/over limit → deterministic lexicographic selection so all nodes agree
	// on which IPs win the slots.
	ipList := make([]string, 0, len(candidate)+1)
	for ip := range candidate {
		ipList = append(ipList, ip)
	}
	ipList = append(ipList, sourceIP)
	sort.Strings(ipList)
	for i := 0; i < limit && i < len(ipList); i++ {
		if ipList[i] == sourceIP {
			u.connCount++
			u.ips[sourceIP]++
			return false
		}
	}
	return true
}

// removeConn unregisters a connection from sourceIP.
func (u *userStats) removeConn(sourceIP string) {
	u.mu.Lock()
	u.connCount--
	u.ips[sourceIP]--
	if u.ips[sourceIP] <= 0 {
		delete(u.ips, sourceIP)
	}
	u.mu.Unlock()
}

// distinctIPs returns the number of distinct IPs currently connected.
func (u *userStats) distinctIPs() int {
	u.mu.Lock()
	n := len(u.ips)
	u.mu.Unlock()
	return n
}

// ipSnapshot returns a pooled copy of the current IP set.
func (u *userStats) ipSnapshot() map[string]struct{} {
	cp := ipPool.Get().(map[string]struct{})
	for k := range cp {
		delete(cp, k)
	}
	u.mu.Lock()
	for ip := range u.ips {
		cp[ip] = struct{}{}
	}
	u.mu.Unlock()
	return cp
}

// releaseIPSnapshot returns the snapshot to pool.
// Large maps are discarded to prevent memory bloat.
func releaseIPSnapshot(m map[string]struct{}) {
	// Discard large maps to prevent pool memory bloat
	if len(m) > 64 {
		return
	}
	ipPool.Put(m)
}

// aliveIPList returns the set of alive IPs as a boolean map (for reporting).
func (u *userStats) aliveIPList() map[string]bool {
	u.mu.Lock()
	defer u.mu.Unlock()
	if len(u.ips) == 0 {
		return nil
	}
	result := make(map[string]bool, len(u.ips))
	for ip := range u.ips {
		result[ip] = true
	}
	return result
}

// ─── ConnTracker ────────────────────────────────────────────────────────────

// ConnTracker provides per-user traffic counting, alive IP tracking, device
// limit gate-keeping, and per-user speed limiting for the sing-box kernel.
//
// Architecture: instead of maintaining a per-connection map (O(connections)),
// it maintains per-user atomic counters and IP refcount sets (O(users)).
// This means:
//   - GetUserTraffic is O(users), not O(connections)
//   - No Snapshot/pending buffer needed
//   - No per-connection map lock contention
//   - Bytes are counted directly into per-user atomics via CountFunc callbacks
//
// The per-connection wrapper (trackedConn) is still needed for:
//   - Hooking into sing's ReadCounter/WriteCounter for zero-copy byte counting
//   - Close callback to decrement IP refcounts
//   - Per-connection rate limit token accumulation (amortized WaitN)
type ConnTracker struct {
	usersMu sync.RWMutex
	users   map[int]*userStats  // userID → stats
	uuidMap map[string]int      // UUID → userID (for lookup in RoutedConnection)
	connMap map[string]net.Conn // connID → conn (only for force-close support)

	idCounter atomic.Int64

	// speedLimitFunc resolves a user UUID to a *rate.Limiter.
	speedLimitFunc atomic.Pointer[func(uuid string) *rate.Limiter]

	// deviceLimitFunc resolves a user UUID to their device limit.
	deviceLimitFunc atomic.Pointer[func(uuid string) (int, bool)]

	// Multi-node device state from panel
	globalDevices    map[int]map[string]bool // userID → IP → exists
	globalMu         sync.RWMutex
	globalLastUpdate time.Time
}

// NewConnTracker creates a tracker.
func NewConnTracker(_ int) *ConnTracker {
	return &ConnTracker{
		users:         make(map[int]*userStats),
		uuidMap:       make(map[string]int),
		connMap:       make(map[string]net.Conn),
		globalDevices: make(map[int]map[string]bool),
	}
}

// SetSpeedLimitFunc configures the per-user speed limit lookup.
func (t *ConnTracker) SetSpeedLimitFunc(fn func(uuid string) *rate.Limiter) {
	t.speedLimitFunc.Store(&fn)
}

// SetDeviceLimitFunc configures the per-user device limit lookup for gate-keeping.
func (t *ConnTracker) SetDeviceLimitFunc(fn func(uuid string) (int, bool)) {
	t.deviceLimitFunc.Store(&fn)
}

// SetUserMap replaces the UUID→userID mapping and ensures per-user stats
// structs exist for all users. Old users that are no longer present keep
// their stats until their connections drain.
func (t *ConnTracker) SetUserMap(m map[string]int) {
	t.usersMu.Lock()
	t.uuidMap = m
	for _, uid := range m {
		if _, ok := t.users[uid]; !ok {
			t.users[uid] = &userStats{ips: make(map[string]int)}
		}
	}
	t.usersMu.Unlock()
}

// UpdateGlobalDevices syncs global device state from panel.
func (t *ConnTracker) UpdateGlobalDevices(users map[int][]string) {
	t.globalMu.Lock()
	t.globalDevices = make(map[int]map[string]bool, len(users))
	for uid, ips := range users {
		m := make(map[string]bool, len(ips))
		for _, ip := range ips {
			m[ip] = true
		}
		t.globalDevices[uid] = m
	}
	t.globalLastUpdate = time.Now()
	t.globalMu.Unlock()
	nlog.Core().Debug("global device state updated", "users", len(users))
}

// ClearGlobalDevices resets global device state (on WS disconnect).
func (t *ConnTracker) ClearGlobalDevices() {
	t.globalMu.Lock()
	t.globalDevices = make(map[int]map[string]bool)
	t.globalLastUpdate = time.Time{}
	t.globalMu.Unlock()
	nlog.Core().Debug("global device state cleared")
}

// ─── adapter.ConnectionTracker ──────────────────────────────────────────────

// RoutedConnection wraps a TCP conn to count bytes per-user, track IPs,
// and optionally rate-limit. Gate-keeps device limits at connection time.
func (t *ConnTracker) RoutedConnection(
	ctx context.Context, conn net.Conn,
	metadata adapter.InboundContext,
	_ adapter.Rule, _ adapter.Outbound,
) net.Conn {
	uuid := metadata.User
	sourceIP := metadata.Source.Addr.String()

	t.usersMu.RLock()
	uid := t.uuidMap[uuid]
	us := t.users[uid]
	t.usersMu.RUnlock()

	// Device limit gate-keeping + registration (atomic; see [H6]).
	// When no device-limit func is configured we still register the connection
	// so traffic/IP accounting stays correct.
	if dlf := t.deviceLimitFunc.Load(); dlf != nil {
		limit, hasLimit := (*dlf)(uuid)
		if !hasLimit {
			limit = 0 // unlimited → gateAndRegister just registers
		}
		if t.gateAndRegister(us, uid, sourceIP, limit) {
			nlog.Core().Info("singbox: device limit gate-keep, rejecting connection",
				"user", uuid, "ip", sourceIP, "limit", limit)
			conn.Close()
			return conn
		}
	} else if us != nil {
		us.addConn(sourceIP)
	}

	connID := t.nextID()

	// Store conn reference for force-close support
	t.usersMu.Lock()
	t.connMap[connID] = conn
	t.usersMu.Unlock()

	var lim *rate.Limiter
	if slf := t.speedLimitFunc.Load(); slf != nil {
		lim = (*slf)(uuid)
	}

	return &trackedConn{
		Conn:     conn,
		tracker:  t,
		us:       us,
		userID:   uid,
		connID:   connID,
		sourceIP: sourceIP,
		limiter:  lim,
		ctx:      ctx,
	}
}

// RoutedPacketConnection wraps UDP with per-user counting (UDP not in connMap).
// Note: UDP connections are NOT stored in connMap because connMap is typed as
// map[string]net.Conn, but PacketConn is a different interface. Force-close
// for UDP connections is handled directly via trackedPacketConn.Close().
func (t *ConnTracker) RoutedPacketConnection(
	ctx context.Context, conn N.PacketConn,
	metadata adapter.InboundContext,
	_ adapter.Rule, _ adapter.Outbound,
) N.PacketConn {
	uuid := metadata.User
	sourceIP := metadata.Source.Addr.String()

	t.usersMu.RLock()
	uid := t.uuidMap[uuid]
	us := t.users[uid]
	t.usersMu.RUnlock()

	// Device limit gate-keeping + registration (atomic; see [H6]).
	if dlf := t.deviceLimitFunc.Load(); dlf != nil {
		limit, hasLimit := (*dlf)(uuid)
		if !hasLimit {
			limit = 0 // unlimited → gateAndRegister just registers
		}
		if t.gateAndRegister(us, uid, sourceIP, limit) {
			nlog.Core().Info("singbox: device limit gate-keep, rejecting UDP connection",
				"user", uuid, "ip", sourceIP, "limit", limit)
			conn.Close()
			return conn
		}
	} else if us != nil {
		us.addConn(sourceIP)
	}

	connID := t.nextID()

	var lim *rate.Limiter
	if slf := t.speedLimitFunc.Load(); slf != nil {
		lim = (*slf)(uuid)
	}

	return &trackedPacketConn{
		PacketConn: conn,
		tracker:    t,
		us:         us,
		userID:     uid,
		connID:     connID,
		sourceIP:   sourceIP,
		limiter:    lim,
		ctx:        ctx,
	}
}

// gateAndRegister atomically enforces the device limit and, when the connection
// is admitted, registers it on the per-user stats. It returns true when the
// connection must be REJECTED.
//
// [H6] The local count check and the registration now happen together inside
// userStats.checkAndAddConn (one write lock), closing the previous TOCTOU. The
// global cross-node state is read here (a separate, eventually-consistent
// snapshot) and passed down: when it is stale or missing we fall back to a
// local-only decision by passing nil, exactly as before.
func (t *ConnTracker) gateAndRegister(us *userStats, userID int, sourceIP string, limit int) (rejected bool) {
	if us == nil {
		return false
	}
	if limit <= 0 {
		// No device limit → just register and admit.
		us.addConn(sourceIP)
		return false
	}

	// Read cross-node global state (separate lock; staleness is acceptable).
	t.globalMu.RLock()
	globalStale := time.Since(t.globalLastUpdate) > 60*time.Second
	globalIPs := t.globalDevices[userID]
	t.globalMu.RUnlock()

	// Stale or missing global state → local-only decision (pass nil).
	var merged map[string]bool
	if !globalStale && globalIPs != nil {
		merged = globalIPs
	}

	if us.checkAndAddConn(sourceIP, limit, merged) {
		nlog.Core().Debug("device limit: over limit, rejecting",
			"userID", userID, "ip", sourceIP, "limit", limit, "globalKnown", merged != nil)
		return true
	}
	return false
}

func (t *ConnTracker) nextID() string {
	return "sb-" + formatInt36(t.idCounter.Add(1))
}

func formatInt36(n int64) string {
	const digits = "0123456789abcdefghijklmnopqrstuvwxyz"
	if n == 0 {
		return "0"
	}
	var buf [13]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = digits[n%36]
		n /= 36
	}
	return string(buf[i:])
}

// ─── Public API ─────────────────────────────────────────────────────────────

// GetUserTraffic returns per-user cumulative traffic and alive IPs.
// This is O(users), not O(connections).
func (t *ConnTracker) GetUserTraffic() (traffic map[int][2]int64, aliveIPs map[int]map[string]bool, connCount int) {
	t.usersMu.RLock()
	traffic = make(map[int][2]int64, len(t.users))
	aliveIPs = make(map[int]map[string]bool, len(t.users))
	for uid, us := range t.users {
		up := us.upload.Load()
		down := us.download.Load()
		if up > 0 || down > 0 {
			traffic[uid] = [2]int64{up, down}
		}

		ips := us.aliveIPList()
		if ips != nil {
			aliveIPs[uid] = ips
		}

		us.mu.Lock()
		connCount += us.connCount
		us.mu.Unlock()
	}
	t.usersMu.RUnlock()
	return
}

// CloseByID force-closes a connection by its ID.
func (t *ConnTracker) CloseByID(id string) bool {
	t.usersMu.RLock()
	conn, ok := t.connMap[id]
	t.usersMu.RUnlock()
	if !ok {
		return false
	}
	if conn != nil {
		conn.Close()
	}
	return true
}

// CloseByUUID force-closes ALL connections for a given user UUID.
func (t *ConnTracker) CloseByUUID(uuid string) int {
	// This is a no-op for now — sing-box doesn't expose per-user connection
	// kill easily. The kernel's RemoveUsers removes the inbound user which
	// prevents new connections, and existing connections will fail on next I/O.
	return 0
}

// ActiveCount returns the total number of active connections.
func (t *ConnTracker) ActiveCount() int {
	t.usersMu.RLock()
	total := 0
	for _, us := range t.users {
		us.mu.Lock()
		total += us.connCount
		us.mu.Unlock()
	}
	t.usersMu.RUnlock()
	return total
}

// removeConnRef removes the connection reference from connMap on close.
func (t *ConnTracker) removeConnRef(connID string) {
	t.usersMu.Lock()
	delete(t.connMap, connID)
	t.usersMu.Unlock()
}

// ─── trackedConn (TCP) ──────────────────────────────────────────────────────

// RateLimitedWriter wraps a Writer with non-blocking rate limiting.
// Uses AllowN for instant checks and context-aware waiting when needed.
type RateLimitedWriter struct {
	writer  io.Writer
	limiter *rate.Limiter
	ctx     context.Context
}

// Write implements io.Writer with rate limiting.
func (w *RateLimitedWriter) Write(b []byte) (int, error) {
	// Truncate to burst size
	if burst := w.limiter.Burst(); len(b) > burst {
		b = b[:burst]
	}

	// Fast path: check if tokens available (non-blocking)
	if w.limiter.AllowN(time.Now(), len(b)) {
		return w.writer.Write(b)
	}

	// Slow path: wait for tokens with context cancellation support
	resv := w.limiter.ReserveN(time.Now(), len(b))
	if delay := resv.Delay(); delay > 0 {
		timer := time.NewTimer(delay)
		defer timer.Stop()
		select {
		case <-timer.C:
			// Tokens available, proceed
		case <-w.ctx.Done():
			resv.Cancel()
			return 0, w.ctx.Err()
		}
	}

	return w.writer.Write(b)
}

// RateLimitedReadCloser wraps a Reader with non-blocking rate limiting.
type RateLimitedReadCloser struct {
	reader  io.Reader
	limiter *rate.Limiter
	ctx     context.Context
}

// Read implements io.Reader with rate limiting.
func (r *RateLimitedReadCloser) Read(b []byte) (int, error) {
	// No limiter configured: pass through without rate limiting.
	if r.limiter == nil {
		return r.reader.Read(b)
	}

	// Truncate to burst size
	if burst := r.limiter.Burst(); len(b) > burst {
		b = b[:burst]
	}

	n, err := r.reader.Read(b)
	if n > 0 {
		// Fast path: check if tokens available (limiter non-nil, guarded above)
		if !r.limiter.AllowN(time.Now(), n) {
			// Slow path: wait with context cancellation
			resv := r.limiter.ReserveN(time.Now(), n)
			if delay := resv.Delay(); delay > 0 {
				timer := time.NewTimer(delay)
				defer timer.Stop()
				select {
				case <-timer.C:
					// Tokens available
				case <-r.ctx.Done():
					resv.Cancel()
					return n, r.ctx.Err()
				}
			}
		}
	}
	return n, err
}

type trackedConn struct {
	net.Conn
	tracker  *ConnTracker
	us       *userStats // per-user stats (upload/download atomics + IP tracking)
	userID   int        // user ID for device tracking
	connID   string
	sourceIP string
	limiter  *rate.Limiter
	ctx      context.Context
	closed   atomic.Bool
}

func (c *trackedConn) Read(b []byte) (int, error) {
	if c.limiter != nil {
		if burst := c.limiter.Burst(); len(b) > burst {
			b = b[:burst]
		}
	}
	n, err := c.Conn.Read(b)
	if n > 0 {
		if c.us != nil {
			c.us.upload.Add(int64(n)) // 从入站读取 = 用户上传
		}
		if c.limiter != nil {
			// Non-blocking rate limiting
			if !c.limiter.AllowN(time.Now(), n) {
				resv := c.limiter.ReserveN(time.Now(), n)
				if delay := resv.Delay(); delay > 0 {
					timer := time.NewTimer(delay)
					defer timer.Stop()
					select {
					case <-timer.C:
						// Tokens available
					case <-c.ctx.Done():
						resv.Cancel()
						return n, c.ctx.Err()
					}
				}
			}
		}
	}
	return n, err
}

func (c *trackedConn) Write(b []byte) (int, error) {
	// Apply rate limiting before write
	if c.limiter != nil {
		if burst := c.limiter.Burst(); len(b) > burst {
			b = b[:burst]
		}
		// Non-blocking check first
		if !c.limiter.AllowN(time.Now(), len(b)) {
			resv := c.limiter.ReserveN(time.Now(), len(b))
			if delay := resv.Delay(); delay > 0 {
				timer := time.NewTimer(delay)
				defer timer.Stop()
				select {
				case <-timer.C:
					// Tokens available
				case <-c.ctx.Done():
					resv.Cancel()
					return 0, c.ctx.Err()
				}
			}
		}
	}

	n, err := c.Conn.Write(b)
	if n > 0 && c.us != nil {
		c.us.download.Add(int64(n)) // 向入站写入 = 用户下载
	}
	return n, err
}

func (c *trackedConn) Close() error {
	if c.closed.CompareAndSwap(false, true) {
		if c.us != nil {
			c.us.removeConn(c.sourceIP)
		}
		c.tracker.removeConnRef(c.connID)
	}
	return c.Conn.Close()
}

// makeCountFunc builds a CountFunc for zero-copy byte counting via sing's
// ReadCounter/WriteCounter unwrap interfaces.
func (c *trackedConn) makeCountFunc(counter *atomic.Int64) N.CountFunc {
	if c.limiter == nil {
		return func(n int64) { counter.Add(n) }
	}
	return func(n int64) {
		counter.Add(n)
		// Non-blocking rate limiting with context cancellation
		if !c.limiter.AllowN(time.Now(), int(n)) {
			resv := c.limiter.ReserveN(time.Now(), int(n))
			if delay := resv.Delay(); delay > 0 {
				timer := time.NewTimer(delay)
				defer timer.Stop()
				select {
				case <-timer.C:
					// Tokens available
				case <-c.ctx.Done():
					resv.Cancel()
				}
			}
		}
	}
}

func (c *trackedConn) UnwrapReader() (io.Reader, []N.CountFunc) {
	if c.us == nil {
		return c.Conn, nil
	}
	return c.Conn, []N.CountFunc{c.makeCountFunc(&c.us.upload)} // 从入站读取 = 用户上传
}

func (c *trackedConn) UnwrapWriter() (io.Writer, []N.CountFunc) {
	if c.us == nil {
		return c.Conn, nil
	}
	return c.Conn, []N.CountFunc{c.makeCountFunc(&c.us.download)} // 向入站写入 = 用户下载
}

func (c *trackedConn) Upstream() any           { return c.Conn }
func (c *trackedConn) ReaderReplaceable() bool { return true }
func (c *trackedConn) WriterReplaceable() bool { return true }

// ─── trackedPacketConn (UDP / QUIC) ─────────────────────────────────────────

type trackedPacketConn struct {
	N.PacketConn
	tracker  *ConnTracker
	us       *userStats
	userID   int
	connID   string
	sourceIP string
	limiter  *rate.Limiter
	ctx      context.Context
	closed   atomic.Bool
}

func (c *trackedPacketConn) ReadPacket(buffer *buf.Buffer) (singM.Socksaddr, error) {
	dest, err := c.PacketConn.ReadPacket(buffer)
	if err == nil {
		n := int64(buffer.Len())
		if c.us != nil {
			c.us.upload.Add(n) // 从入站读取 = 用户上传
		}
		if c.limiter != nil {
			// Non-blocking rate limiting with context cancellation
			if !c.limiter.AllowN(time.Now(), int(n)) {
				resv := c.limiter.ReserveN(time.Now(), int(n))
				if delay := resv.Delay(); delay > 0 {
					timer := time.NewTimer(delay)
					defer timer.Stop()
					select {
					case <-timer.C:
						// Tokens available
					case <-c.ctx.Done():
						resv.Cancel()
						return dest, c.ctx.Err()
					}
				}
			}
		}
	}
	return dest, err
}

func (c *trackedPacketConn) WritePacket(buffer *buf.Buffer, dest singM.Socksaddr) error {
	n := int64(buffer.Len())

	// Apply rate limiting before write
	if c.limiter != nil {
		if !c.limiter.AllowN(time.Now(), int(n)) {
			resv := c.limiter.ReserveN(time.Now(), int(n))
			if delay := resv.Delay(); delay > 0 {
				timer := time.NewTimer(delay)
				defer timer.Stop()
				select {
				case <-timer.C:
					// Tokens available
				case <-c.ctx.Done():
					resv.Cancel()
					return c.ctx.Err()
				}
			}
		}
	}

	err := c.PacketConn.WritePacket(buffer, dest)
	if err == nil && c.us != nil {
		c.us.download.Add(n) // 向入站写入 = 用户下载
	}
	return err
}

func (c *trackedPacketConn) Close() error {
	if c.closed.CompareAndSwap(false, true) {
		if c.us != nil {
			c.us.removeConn(c.sourceIP)
		}
		c.tracker.removeConnRef(c.connID)
	}
	return c.PacketConn.Close()
}

func (c *trackedPacketConn) makeCountFunc(counter *atomic.Int64) N.CountFunc {
	if c.limiter == nil {
		return func(n int64) { counter.Add(n) }
	}
	return func(n int64) {
		counter.Add(n)
		// Non-blocking rate limiting with context cancellation
		if !c.limiter.AllowN(time.Now(), int(n)) {
			resv := c.limiter.ReserveN(time.Now(), int(n))
			if delay := resv.Delay(); delay > 0 {
				timer := time.NewTimer(delay)
				defer timer.Stop()
				select {
				case <-timer.C:
					// Tokens available
				case <-c.ctx.Done():
					resv.Cancel()
				}
			}
		}
	}
}

func (c *trackedPacketConn) UnwrapPacketReader() (N.PacketReader, []N.CountFunc) {
	if c.us == nil {
		return c.PacketConn, nil
	}
	return c.PacketConn, []N.CountFunc{c.makeCountFunc(&c.us.upload)} // 从入站读取 = 用户上传
}

func (c *trackedPacketConn) UnwrapPacketWriter() (N.PacketWriter, []N.CountFunc) {
	if c.us == nil {
		return c.PacketConn, nil
	}
	return c.PacketConn, []N.CountFunc{c.makeCountFunc(&c.us.download)} // 向入站写入 = 用户下载
}

func (c *trackedPacketConn) Upstream() any           { return c.PacketConn }
func (c *trackedPacketConn) ReaderReplaceable() bool { return true }
func (c *trackedPacketConn) WriterReplaceable() bool { return true }
