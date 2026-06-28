<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * App\Models\TicketType
 *
 * @property int $id
 * @property string $name 工单类型名称
 * @property int $sort 排序
 * @property bool $show 是否启用
 * @property int $created_at
 * @property int $updated_at
 *
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Ticket> $tickets 关联的工单
 */
class TicketType extends Model
{
    protected $table = 'v2_ticket_type';
    protected $dateFormat = 'U';
    protected $fillable = ['name', 'sort', 'show'];
    protected $casts = [
        'created_at' => 'timestamp',
        'updated_at' => 'timestamp',
        'sort' => 'integer',
        'show' => 'boolean',
    ];

    /**
     * 关联的工单
     */
    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'ticket_type_id', 'id');
    }
}
