<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * App\Models\Ticket
 *
 * @property int $id
 * @property int $user_id 用户ID
 * @property string $subject 工单主题
 * @property string|null $level 工单等级
 * @property int|null $ticket_type_id 工单类型ID
 * @property int $status 工单状态
 * @property int|null $reply_status 回复状态
 * @property int|null $last_reply_user_id 最后回复人
 * @property int $created_at
 * @property int $updated_at
 *
 * @property-read User $user 关联的用户
 * @property-read TicketType|null $ticketType 关联的工单类型
 * @property-read \Illuminate\Database\Eloquent\Collection<int, TicketMessage> $messages 关联的工单消息
 */
class Ticket extends Model
{
    protected $table = 'v2_ticket';
    protected $dateFormat = 'U';
    /**
     * Explicit allow-list (replaces the previous over-broad $guarded = ['id']). Covers every field
     * actually mass-assigned to Ticket today: TicketService::createTicket / createWithdrawTicket,
     * and the visual-gate seed (which also sets status + timestamps). Property-style writes
     * ($ticket->status = ...) and query-builder updates (Ticket::where()->update(...)) are not
     * subject to this list, so existing flows like close() / reply() / drop() are unaffected.
     */
    protected $fillable = [
        'user_id',
        'subject',
        'level',
        'ticket_type_id',
        'status',
        'reply_status',
        'last_reply_user_id',
        'created_at',
        'updated_at',
    ];
    protected $casts = [
        'created_at' => 'timestamp',
        'updated_at' => 'timestamp'
    ];

    const STATUS_OPENING = 0;
    const STATUS_CLOSED = 1;
    public static $statusMap = [
        self::STATUS_OPENING => '开启',
        self::STATUS_CLOSED => '关闭'
    ];

    const REPLY_STATUS_WAITING = 0;
    const REPLY_STATUS_REPLIED = 1;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /**
     * 关联的工单类型
     */
    public function ticketType(): BelongsTo
    {
        return $this->belongsTo(TicketType::class, 'ticket_type_id', 'id');
    }

    /**
     * 关联的工单消息
     */
    public function messages(): HasMany
    {
        return $this->hasMany(TicketMessage::class, 'ticket_id', 'id');
    }
    
    // 即将删除
    public function message(): HasMany
    {
        return $this->hasMany(TicketMessage::class, 'ticket_id', 'id');
    }
}
