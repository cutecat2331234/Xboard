<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * App\Models\ServerProvisioning
 *
 * SSH auto node-provisioning task record. Never stores SSH credentials.
 *
 * @property int $id
 * @property string $status pending/connecting/probing/preparing/installing/creating/waiting/done/failed/timeout
 * @property string|null $current_step
 * @property array|null $steps
 * @property string $host
 * @property int $port
 * @property string $ssh_user
 * @property string $auth_method password | key
 * @property string|null $host_key_fingerprint
 * @property string $mode machine | node
 * @property int|null $machine_id
 * @property int|null $server_id
 * @property array|null $node_params
 * @property string|null $log
 * @property string|null $error
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 *
 * @property-read ServerMachine|null $machine
 * @property-read Server|null $server
 */
class ServerProvisioning extends Model
{
    protected $table = 'v2_server_provisioning';

    // Lifecycle statuses
    public const STATUS_PENDING = 'pending';
    public const STATUS_CONNECTING = 'connecting';
    public const STATUS_PROBING = 'probing';
    public const STATUS_PREPARING = 'preparing';
    public const STATUS_INSTALLING = 'installing';
    public const STATUS_CREATING = 'creating';
    public const STATUS_WAITING = 'waiting';
    public const STATUS_DONE = 'done';
    public const STATUS_FAILED = 'failed';
    public const STATUS_TIMEOUT = 'timeout';

    // Step identifiers (state machine)
    public const STEP_CONNECT = 'connect';
    public const STEP_PROBE = 'probe';
    public const STEP_PREPARE_PANEL = 'prepare_panel';
    public const STEP_INSTALL_AGENT = 'install_agent';
    public const STEP_CREATE_SERVER = 'create_server';
    public const STEP_WAIT_ONLINE = 'wait_online';

    public const AUTH_PASSWORD = 'password';
    public const AUTH_KEY = 'key';

    public const MODE_MACHINE = 'machine';
    public const MODE_NODE = 'node';

    /**
     * Terminal statuses where no further work happens.
     */
    public const TERMINAL_STATUSES = [
        self::STATUS_DONE,
        self::STATUS_FAILED,
        self::STATUS_TIMEOUT,
    ];

    protected $guarded = ['id'];

    protected $casts = [
        'steps' => 'array',
        'node_params' => 'array',
        'port' => 'integer',
        'machine_id' => 'integer',
        'server_id' => 'integer',
        'created_by' => 'integer',
        'created_at' => 'timestamp',
        'updated_at' => 'timestamp',
    ];

    public function machine(): BelongsTo
    {
        return $this->belongsTo(ServerMachine::class, 'machine_id');
    }

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class, 'server_id');
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, self::TERMINAL_STATUSES, true);
    }
}
