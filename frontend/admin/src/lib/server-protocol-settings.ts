export type TlsObjectSettings = {
  server_name: string
  allow_insecure: boolean
}

export type HysteriaProtocolSettings = {
  version: number
  alpn: string
  obfs: { open: boolean; type: string; password: string }
  tls: TlsObjectSettings
  bandwidth: { up: string; down: string }
}

export type TuicProtocolSettings = {
  version: number
  congestion_control: string
  alpn: string[]
  udp_relay_mode: string
  tls: TlsObjectSettings
}

export type AnyTlsProtocolSettings = {
  tls: TlsObjectSettings
  padding_scheme: string[]
}

export const HYSTERIA_VERSIONS = ['1', '2'] as const
export const HYSTERIA_ALPN_OPTIONS = ['hysteria', 'http/1.1', 'h2', 'h3'] as const
export const TUIC_VERSIONS = ['5', '4'] as const
export const TUIC_CONGESTION_CONTROLS = ['bbr', 'cubic', 'new_reno'] as const
export const TUIC_ALPN_OPTIONS = [
  { value: 'h3', label: 'HTTP/3' },
  { value: 'h2', label: 'HTTP/2' },
  { value: 'http/1.1', label: 'HTTP/1.1' },
] as const
export const TUIC_UDP_RELAY_MODES = [
  { value: 'native', label: 'Native' },
  { value: 'quic', label: 'QUIC' },
] as const

export const ANYTLS_DEFAULT_PADDING_SCHEME = [
  'stop=8',
  '0=30-30',
  '1=100-400',
  '2=400-500,c,500-1000,c,500-1000,c,500-1000,c,500-1000',
  '3=9-9,500-1000',
  '4=500-1000',
  '5=500-1000',
  '6=500-1000',
  '7=500-1000',
] as const

export const TLS_OBJECT_NODE_TYPES = new Set(['hysteria', 'tuic', 'anytls'])

export const TRANSPORT_NETWORK_OPTIONS = [
  { value: 'tcp', label: 'TCP' },
  { value: 'ws', label: 'Websocket' },
  { value: 'grpc', label: 'gRPC' },
  { value: 'h2', label: 'HTTP/2' },
  { value: 'kcp', label: 'mKCP' },
  { value: 'httpupgrade', label: 'HttpUpgrade' },
  { value: 'xhttp', label: 'XHTTP' },
] as const

export const TRANSPORT_NETWORKS_WITH_SUBFIELDS = new Set([
  'tcp',
  'ws',
  'grpc',
  'h2',
  'httpupgrade',
  'xhttp',
])

export type TransportNetworkSettingsFields = {
  path: string
  host: string
  serviceName: string
}

export function defaultTransportNetworkSettings(): TransportNetworkSettingsFields {
  return { path: '', host: '', serviceName: '' }
}

function readTransportNetworkHost(raw: Record<string, unknown>): string {
  const headers = (raw.headers ?? {}) as Record<string, unknown>
  if (headers.Host != null && headers.Host !== '') {
    return String(headers.Host)
  }
  if (raw.host != null && raw.host !== '') {
    const host = raw.host
    if (Array.isArray(host) && host.length > 0) {
      return String(host[0])
    }
    return String(host)
  }
  return ''
}

function readTcpTransportPathHost(settings: Record<string, unknown>): { path: string; host: string } {
  const header = (settings.header ?? {}) as Record<string, unknown>
  if (String(header.type ?? 'none') === 'none') {
    return { path: '', host: '' }
  }
  const request = (header.request ?? {}) as Record<string, unknown>
  const paths = request.path
  let path = ''
  if (Array.isArray(paths) && paths.length > 0) {
    path = String(paths[0])
  } else if (paths != null && paths !== '') {
    path = String(paths)
  }
  const reqHeaders = (request.headers ?? {}) as Record<string, unknown>
  const hosts = reqHeaders.Host
  let host = ''
  if (Array.isArray(hosts) && hosts.length > 0) {
    host = String(hosts[0])
  } else if (hosts != null && hosts !== '') {
    host = String(hosts)
  }
  return { path, host }
}

export function readTransportNetworkSettings(
  raw?: unknown,
  network?: string,
): TransportNetworkSettingsFields {
  const d = defaultTransportNetworkSettings()
  if (!raw || typeof raw !== 'object') return d
  const settings = raw as Record<string, unknown>

  if (network === 'tcp') {
    const tcp = readTcpTransportPathHost(settings)
    return {
      path: tcp.path || String(settings.path ?? d.path),
      host: tcp.host || readTransportNetworkHost(settings),
      serviceName: String(settings.serviceName ?? d.serviceName),
    }
  }

  return {
    path: String(settings.path ?? d.path),
    host: readTransportNetworkHost(settings),
    serviceName: String(settings.serviceName ?? d.serviceName),
  }
}

export function serializeTransportNetworkSettings(
  network: string,
  settings: TransportNetworkSettingsFields,
): Record<string, unknown> | undefined {
  if (!TRANSPORT_NETWORKS_WITH_SUBFIELDS.has(network)) return undefined

  const payload: Record<string, unknown> = {}

  if (network === 'grpc') {
    if (settings.serviceName) payload.serviceName = settings.serviceName
    return Object.keys(payload).length ? payload : undefined
  }

  if (network === 'tcp') {
    if (!settings.path && !settings.host) return undefined
    return {
      acceptProxyProtocol: false,
      header: {
        type: 'http',
        request: {
          version: '1.1',
          method: 'GET',
          path: [settings.path || '/'],
          ...(settings.host ? { headers: { Host: [settings.host] } } : {}),
        },
        response: {
          version: '1.1',
          status: '200',
          reason: 'OK',
        },
      },
    }
  }

  if (settings.path) payload.path = settings.path

  if (network === 'ws') {
    if (settings.host) payload.headers = { Host: settings.host }
  } else if (settings.host && (network === 'h2' || network === 'httpupgrade' || network === 'xhttp')) {
    payload.host = settings.host
  }

  return Object.keys(payload).length ? payload : undefined
}

export const VLESS_FLOW_OPTIONS = [
  'none',
  'xtls-rprx-direct',
  'xtls-rprx-splice',
  'xtls-rprx-vision',
] as const

export type TlsSettingsFields = {
  server_name: string
  allow_insecure: boolean
}

export type RealitySettingsFields = {
  server_name: string
  server_port: string
  allow_insecure: boolean
  private_key: string
  public_key: string
  short_id: string
}

export type VlessEncryptionFields = {
  enabled: boolean
  encryption: string
  decryption: string
}

export type TrojanProtocolSettings = {
  tls: number
  network: string
  tls_settings: TlsSettingsFields
  reality_settings: RealitySettingsFields
  network_settings: TransportNetworkSettingsFields
}

export type VlessProtocolSettings = {
  tls: number
  network: string
  flow: string
  tls_settings: TlsSettingsFields
  reality_settings: RealitySettingsFields
  encryption: VlessEncryptionFields
  network_settings: TransportNetworkSettingsFields
}

function readTlsObject(raw: unknown, fallback: TlsObjectSettings): TlsObjectSettings {
  const tls = (raw ?? {}) as Record<string, unknown>
  return {
    server_name: String(tls.server_name ?? fallback.server_name),
    allow_insecure: Boolean(tls.allow_insecure ?? fallback.allow_insecure),
  }
}

export function defaultHysteriaSettings(): HysteriaProtocolSettings {
  return {
    version: 2,
    alpn: 'h2',
    obfs: { open: false, type: 'salamander', password: '' },
    tls: { server_name: '', allow_insecure: false },
    bandwidth: { up: '', down: '' },
  }
}

export function normalizeHysteriaSettings(raw?: Record<string, unknown>): HysteriaProtocolSettings {
  const d = defaultHysteriaSettings()
  if (!raw) return d
  const obfs = (raw.obfs ?? {}) as Record<string, unknown>
  const bandwidth = (raw.bandwidth ?? {}) as Record<string, unknown>
  return {
    version: Number(raw.version ?? d.version),
    alpn: String(raw.alpn ?? d.alpn),
    obfs: {
      open: Boolean(obfs.open ?? d.obfs.open),
      type: String(obfs.type ?? d.obfs.type),
      password: String(obfs.password ?? d.obfs.password),
    },
    tls: readTlsObject(raw.tls, d.tls),
    bandwidth: {
      up: bandwidth.up != null && bandwidth.up !== '' ? String(bandwidth.up) : '',
      down: bandwidth.down != null && bandwidth.down !== '' ? String(bandwidth.down) : '',
    },
  }
}

export function serializeHysteriaSettings(s: HysteriaProtocolSettings): Record<string, unknown> {
  const settings: Record<string, unknown> = {
    version: s.version,
    obfs: {
      open: s.obfs.open,
      type: s.obfs.open && s.version === 2 ? s.obfs.type : 'salamander',
      password: s.obfs.open ? s.obfs.password || undefined : undefined,
    },
    tls: {
      server_name: s.tls.server_name || undefined,
      allow_insecure: s.tls.allow_insecure || undefined,
    },
    bandwidth: {
      up: s.bandwidth.up !== '' ? Number(s.bandwidth.up) : undefined,
      down: s.bandwidth.down !== '' ? Number(s.bandwidth.down) : undefined,
    },
  }
  if (s.version === 1) {
    settings.alpn = s.alpn
  }
  return settings
}

export function defaultTuicSettings(): TuicProtocolSettings {
  return {
    version: 5,
    congestion_control: 'bbr',
    alpn: ['h3'],
    udp_relay_mode: 'native',
    tls: { server_name: '', allow_insecure: false },
  }
}

export function normalizeTuicSettings(raw?: Record<string, unknown>): TuicProtocolSettings {
  const d = defaultTuicSettings()
  if (!raw) return d
  const alpn = Array.isArray(raw.alpn) ? raw.alpn.map(String) : d.alpn
  return {
    version: Number(raw.version ?? d.version),
    congestion_control: String(raw.congestion_control ?? d.congestion_control),
    alpn: alpn.length ? alpn : d.alpn,
    udp_relay_mode: String(raw.udp_relay_mode ?? d.udp_relay_mode),
    tls: readTlsObject(raw.tls, d.tls),
  }
}

export function serializeTuicSettings(s: TuicProtocolSettings): Record<string, unknown> {
  return {
    version: s.version,
    congestion_control: s.congestion_control,
    alpn: s.alpn,
    udp_relay_mode: s.udp_relay_mode,
    tls: {
      server_name: s.tls.server_name || undefined,
      allow_insecure: s.tls.allow_insecure || undefined,
    },
  }
}

export function defaultAnyTlsSettings(): AnyTlsProtocolSettings {
  return {
    tls: { server_name: '', allow_insecure: false },
    padding_scheme: [],
  }
}

export function normalizeAnyTlsSettings(raw?: Record<string, unknown>): AnyTlsProtocolSettings {
  const d = defaultAnyTlsSettings()
  if (!raw) return d
  const padding = Array.isArray(raw.padding_scheme) ? raw.padding_scheme.map(String) : d.padding_scheme
  return {
    tls: readTlsObject(raw.tls, d.tls),
    padding_scheme: padding,
  }
}

export function serializeAnyTlsSettings(s: AnyTlsProtocolSettings): Record<string, unknown> {
  return {
    tls: {
      server_name: s.tls.server_name || undefined,
      allow_insecure: s.tls.allow_insecure || undefined,
    },
    padding_scheme: s.padding_scheme.length ? s.padding_scheme : undefined,
  }
}

function readTlsSettings(raw: unknown, fallback: TlsSettingsFields): TlsSettingsFields {
  const tls = (raw ?? {}) as Record<string, unknown>
  return {
    server_name: String(tls.server_name ?? fallback.server_name),
    allow_insecure: Boolean(tls.allow_insecure ?? fallback.allow_insecure),
  }
}

function readRealitySettings(raw: unknown, fallback: RealitySettingsFields): RealitySettingsFields {
  const reality = (raw ?? {}) as Record<string, unknown>
  return {
    server_name: String(reality.server_name ?? fallback.server_name),
    server_port:
      reality.server_port != null && reality.server_port !== ''
        ? String(reality.server_port)
        : fallback.server_port,
    allow_insecure: Boolean(reality.allow_insecure ?? fallback.allow_insecure),
    private_key: String(reality.private_key ?? fallback.private_key),
    public_key: String(reality.public_key ?? fallback.public_key),
    short_id: String(reality.short_id ?? fallback.short_id),
  }
}

export function defaultTrojanSettings(): TrojanProtocolSettings {
  return {
    tls: 1,
    network: 'tcp',
    tls_settings: { server_name: '', allow_insecure: false },
    reality_settings: {
      server_name: '',
      server_port: '443',
      allow_insecure: false,
      private_key: '',
      public_key: '',
      short_id: '',
    },
    network_settings: defaultTransportNetworkSettings(),
  }
}

export function normalizeTrojanSettings(raw?: Record<string, unknown>): TrojanProtocolSettings {
  const d = defaultTrojanSettings()
  if (!raw) return d
  return {
    tls: Number(raw.tls ?? d.tls),
    network: String(raw.network ?? d.network),
    tls_settings: readTlsSettings(raw.tls_settings, d.tls_settings),
    reality_settings: readRealitySettings(raw.reality_settings, d.reality_settings),
    network_settings: readTransportNetworkSettings(raw.network_settings, String(raw.network ?? d.network)),
  }
}

export function serializeTrojanSettings(s: TrojanProtocolSettings): Record<string, unknown> {
  return {
    tls: s.tls,
    network: s.network,
    tls_settings: {
      server_name: s.tls_settings.server_name || undefined,
      allow_insecure: s.tls_settings.allow_insecure || undefined,
    },
    reality_settings: {
      server_name: s.reality_settings.server_name || undefined,
      server_port: s.reality_settings.server_port ? Number(s.reality_settings.server_port) : undefined,
      allow_insecure: s.reality_settings.allow_insecure || undefined,
      private_key: s.reality_settings.private_key || undefined,
      public_key: s.reality_settings.public_key || undefined,
      short_id: s.reality_settings.short_id || undefined,
    },
    network_settings: serializeTransportNetworkSettings(s.network, s.network_settings),
  }
}

export function defaultVlessSettings(): VlessProtocolSettings {
  return {
    tls: 0,
    network: 'tcp',
    flow: '',
    tls_settings: { server_name: '', allow_insecure: false },
    reality_settings: {
      server_name: '',
      server_port: '443',
      allow_insecure: false,
      private_key: '',
      public_key: '',
      short_id: '',
    },
    encryption: { enabled: false, encryption: '', decryption: '' },
    network_settings: defaultTransportNetworkSettings(),
  }
}

export function normalizeVlessSettings(raw?: Record<string, unknown>): VlessProtocolSettings {
  const d = defaultVlessSettings()
  if (!raw) return d
  const encryption = (raw.encryption ?? {}) as Record<string, unknown>
  return {
    tls: Number(raw.tls ?? d.tls),
    network: String(raw.network ?? d.network),
    flow: String(raw.flow ?? d.flow),
    tls_settings: readTlsSettings(raw.tls_settings, d.tls_settings),
    reality_settings: readRealitySettings(raw.reality_settings, d.reality_settings),
    encryption: {
      enabled: Boolean(encryption.enabled ?? d.encryption.enabled),
      encryption: String(encryption.encryption ?? d.encryption.encryption),
      decryption: String(encryption.decryption ?? d.encryption.decryption),
    },
    network_settings: readTransportNetworkSettings(raw.network_settings, String(raw.network ?? d.network)),
  }
}

export function serializeVlessSettings(s: VlessProtocolSettings): Record<string, unknown> {
  return {
    tls: s.tls,
    network: s.network,
    flow: s.flow || undefined,
    tls_settings: {
      server_name: s.tls_settings.server_name || undefined,
      allow_insecure: s.tls_settings.allow_insecure || undefined,
    },
    reality_settings: {
      server_name: s.reality_settings.server_name || undefined,
      server_port: s.reality_settings.server_port ? Number(s.reality_settings.server_port) : undefined,
      allow_insecure: s.reality_settings.allow_insecure || undefined,
      private_key: s.reality_settings.private_key || undefined,
      public_key: s.reality_settings.public_key || undefined,
      short_id: s.reality_settings.short_id || undefined,
    },
    encryption: s.encryption.enabled
      ? {
          enabled: true,
          encryption: s.encryption.encryption || undefined,
          decryption: s.encryption.decryption || undefined,
        }
      : undefined,
    network_settings: serializeTransportNetworkSettings(s.network, s.network_settings),
  }
}

export function defaultProtocolSettings(type: string): Record<string, unknown> | undefined {
  switch (type) {
    case 'shadowsocks':
      return { cipher: 'aes-256-gcm' }
    case 'vmess':
      return { tls: 0, network: 'tcp' }
    case 'vless':
      return serializeVlessSettings(defaultVlessSettings())
    case 'trojan':
      return serializeTrojanSettings(defaultTrojanSettings())
    case 'hysteria':
      return serializeHysteriaSettings(defaultHysteriaSettings())
    case 'tuic':
      return serializeTuicSettings(defaultTuicSettings())
    case 'anytls':
      return serializeAnyTlsSettings(defaultAnyTlsSettings())
    default:
      return undefined
  }
}

export function normalizeProtocolSettings(
  type: string,
  raw?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  switch (type) {
    case 'trojan':
      return serializeTrojanSettings(normalizeTrojanSettings(raw))
    case 'vless':
      return serializeVlessSettings(normalizeVlessSettings(raw))
    case 'hysteria':
      return serializeHysteriaSettings(normalizeHysteriaSettings(raw))
    case 'tuic':
      return serializeTuicSettings(normalizeTuicSettings(raw))
    case 'anytls':
      return serializeAnyTlsSettings(normalizeAnyTlsSettings(raw))
    default:
      return raw
  }
}

export function serializeProtocolSettings(
  type: string,
  settings:
    | TrojanProtocolSettings
    | VlessProtocolSettings
    | HysteriaProtocolSettings
    | TuicProtocolSettings
    | AnyTlsProtocolSettings,
): Record<string, unknown> {
  switch (type) {
    case 'trojan':
      return serializeTrojanSettings(settings as TrojanProtocolSettings)
    case 'vless':
      return serializeVlessSettings(settings as VlessProtocolSettings)
    case 'hysteria':
      return serializeHysteriaSettings(settings as HysteriaProtocolSettings)
    case 'tuic':
      return serializeTuicSettings(settings as TuicProtocolSettings)
    case 'anytls':
      return serializeAnyTlsSettings(settings as AnyTlsProtocolSettings)
    default:
      return {}
  }
}

export function randomObfsPassword(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => chars[b % chars.length])
    .join('')
}

export type ShadowsocksCertMode = 'none' | 'http' | 'dns' | 'self' | 'content'

export type ShadowsocksCertConfig = {
  cert_mode: ShadowsocksCertMode
  domain: string
  email: string
  http_port: string
  dns_provider: string
  dns_env_text: string
  cert_content: string
  key_content: string
}

export const SHADOWSOCKS_CERT_MODES = [
  { value: 'none', label: 'none' },
  { value: 'http', label: 'http-01 (ACME)' },
  { value: 'dns', label: 'dns-01 (ACME)' },
  { value: 'self', label: 'self-signed' },
  { value: 'content', label: 'content (Cert Push)' },
] as const

export function defaultShadowsocksCertConfig(): ShadowsocksCertConfig {
  return {
    cert_mode: 'none',
    domain: '',
    email: '',
    http_port: '80',
    dns_provider: '',
    dns_env_text: '',
    cert_content: '',
    key_content: '',
  }
}

export function serializeDnsEnvText(env?: unknown): string {
  if (!env || typeof env !== 'object' || Array.isArray(env)) {
    return typeof env === 'string' ? env : ''
  }
  return Object.entries(env as Record<string, unknown>)
    .map(([key, value]) => `${key}=${value ?? ''}`)
    .join('\n')
}

export function parseDnsEnvText(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    if (key) result[key] = line.slice(idx + 1).trim()
  }
  return result
}

export function normalizeShadowsocksCertConfig(raw?: Record<string, unknown>): ShadowsocksCertConfig {
  const d = defaultShadowsocksCertConfig()
  if (!raw) return d
  const mode = String(raw.cert_mode ?? d.cert_mode)
  const cert_mode = (
    ['none', 'http', 'dns', 'self', 'content'].includes(mode) ? mode : d.cert_mode
  ) as ShadowsocksCertMode
  return {
    cert_mode,
    domain: String(raw.domain ?? d.domain),
    email: String(raw.email ?? d.email),
    http_port:
      raw.http_port != null && raw.http_port !== '' ? String(raw.http_port) : d.http_port,
    dns_provider: String(raw.dns_provider ?? d.dns_provider),
    dns_env_text: serializeDnsEnvText(raw.dns_env),
    cert_content: String(raw.cert_content ?? d.cert_content),
    key_content: String(raw.key_content ?? d.key_content),
  }
}

export function serializeShadowsocksCertConfig(
  config: ShadowsocksCertConfig,
): Record<string, unknown> | undefined {
  if (config.cert_mode === 'none') return undefined
  const payload: Record<string, unknown> = { cert_mode: config.cert_mode }
  if (config.domain) payload.domain = config.domain
  if (config.email && (config.cert_mode === 'http' || config.cert_mode === 'dns')) {
    payload.email = config.email
  }
  if (config.cert_mode === 'http' && config.http_port) {
    payload.http_port = Number(config.http_port)
  }
  if (config.cert_mode === 'dns') {
    if (config.dns_provider) payload.dns_provider = config.dns_provider
    const dns_env = parseDnsEnvText(config.dns_env_text)
    if (Object.keys(dns_env).length) payload.dns_env = dns_env
  }
  if (config.cert_mode === 'content') {
    if (config.cert_content) payload.cert_content = config.cert_content
    if (config.key_content) payload.key_content = config.key_content
  }
  return payload
}

export function setPluginOptsPassword(opts: string, password: string): string {
  const trimmed = opts.trim()
  if (!trimmed) return `password=${password}`
  if (/(?:^|;)password=/.test(trimmed)) {
    return trimmed.replace(/(?:^|;)password=[^;]*/, (part) =>
      part.startsWith(';') ? `;password=${password}` : `password=${password}`,
    )
  }
  return `${trimmed};password=${password}`
}
