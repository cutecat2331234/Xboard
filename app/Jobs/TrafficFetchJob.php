<?php

namespace App\Jobs;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class TrafficFetchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    protected $data;
    protected $server;
    protected $protocol;
    protected $timestamp;
    public $tries = 3;
    public $timeout = 20;

    public function __construct(array $server, array $data, $protocol, int $timestamp)
    {
        $this->onQueue('traffic_fetch');
        $this->server = $server;
        $this->data = $data;
        $this->protocol = $protocol;
        $this->timestamp = $timestamp;
    }

    public function handle(): void
    {
        // Batch idempotency: a retry (or duplicate dispatch) of this exact payload must not
        // double-count traffic into users.u/users.d. The key is derived from the node, the
        // batch timestamp and a hash of the payload, so retries (byte-identical data) are
        // skipped while distinct pushes proceed. Cache::add is atomic (SETNX-style).
        $idempotencyKey = $this->idempotencyKey();
        if (!Cache::add($idempotencyKey, 1, now()->addHours(24))) {
            Log::info('TrafficFetchJob skipped duplicate batch', ['key' => $idempotencyKey]);
            return;
        }

        $userIds = array_keys($this->data);

        // Per-user try/catch so one bad row cannot abort the whole batch and trigger a full
        // retry (which would re-apply already-incremented users). The idempotency key is kept
        // even when an individual row fails, deliberately favouring no double-count over a
        // rare under-count — re-applying applied rows on retry is the more harmful outcome.
        foreach ($this->data as $uid => $v) {
            try {
                User::where('id', $uid)
                    ->incrementEach(
                        [
                            'u' => $v[0] * $this->server['rate'],
                            'd' => $v[1] * $this->server['rate'],
                        ],
                        ['t' => time()]
                    );
            } catch (\Throwable $e) {
                Log::error('TrafficFetchJob increment failed for user ' . $uid . ': ' . $e->getMessage());
                continue;
            }
        }

        if (!empty($userIds)) {
            Redis::sadd('traffic:pending_check', ...$userIds);
        }
    }

    /**
     * Build a stable idempotency key for this batch.
     */
    protected function idempotencyKey(): string
    {
        $nodeId = $this->server['id'] ?? 'unknown';
        $payloadHash = md5(serialize([
            'rate' => $this->server['rate'] ?? null,
            'protocol' => $this->protocol,
            'data' => $this->data,
        ]));

        return "traffic_fetch:{$nodeId}:{$this->timestamp}:{$payloadHash}";
    }
}
