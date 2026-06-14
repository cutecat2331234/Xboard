<?php

namespace App\Http\Controllers\V2\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\OrderAssign;
use App\Http\Requests\Admin\OrderUpdate;
use App\Models\Order;
use App\Models\Plan;
use App\Models\User;
use App\Models\CommissionLog;
use App\Services\OrderService;
use App\Services\PlanService;
use App\Services\UserService;
use App\Utils\Helper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Log;
use App\Traits\SafeQueryColumns;

class OrderController extends Controller
{
    use SafeQueryColumns;

    private const QUERY_COLUMNS = [
        'id', 'trade_no', 'user_id', 'plan_id', 'period', 'type', 'status',
        'total_amount', 'commission_status', 'commission_balance', 'payment_id',
        'invite_user_id', 'created_at', 'updated_at', 'paid_at', 'callback_no',
    ];
    public function detail(Request $request)
    {
        $order = Order::with(['user', 'plan', 'commission_log', 'invite_user'])->find($request->input('id'));
        if (!$order)
            return $this->fail([400202, '订单不存在']);
        if ($order->surplus_order_ids) {
            $order['surplus_orders'] = Order::whereIn('id', $order->surplus_order_ids)->get();
        }
        $order['period'] = PlanService::getLegacyPeriod((string) $order->period);
        return $this->success($order);
    }

    public function fetch(Request $request)
    {
        $current = $request->input('current', 1);
        $pageSize = $request->input('pageSize', 10);
        $orderModel = Order::with('plan:id,name');

        if ($request->boolean('is_commission')) {
            $orderModel->whereNotNull('invite_user_id')
                ->whereNotIn('status', [0, 2])
                ->where('commission_balance', '>', 0);
        }

        $this->applyFiltersAndSorts($request, $orderModel);

        /** @var \Illuminate\Pagination\LengthAwarePaginator $paginatedResults */
        $paginatedResults = $orderModel
            ->latest('created_at')
            ->paginate(
                perPage: $pageSize,
                page: $current
            );

        $paginatedResults->getCollection()->transform(function ($order) {
            $orderArray = $order->toArray();
            $orderArray['period'] = PlanService::getLegacyPeriod((string) $order->period);
            return $orderArray;
        });

        return $this->paginate($paginatedResults);
    }

    private function applyFiltersAndSorts(Request $request, Builder $builder): void
    {
        $this->applyFilters($request, $builder);
        $this->applySorting($request, $builder);
    }

    private function applyFilters(Request $request, Builder $builder): void
    {
        if (!$request->has('filter')) {
            return;
        }

        collect($request->input('filter'))->each(function ($filter) use ($builder) {
            $field = $this->resolveFilterField((string) ($filter['id'] ?? ''), self::QUERY_COLUMNS);
            if (!$field) {
                return;
            }
            $value = $filter['value'];

            $builder->where(function ($query) use ($field, $value) {
                $this->buildFilterQuery($query, $field, $value);
            });
        });
    }

    private function buildFilterQuery(Builder $query, string $field, mixed $value): void
    {
        // Handle array values for 'in' operations
        if (is_array($value)) {
            $query->whereIn($field, $value);
            return;
        }

        // Handle operator-based filtering
        if (!is_string($value) || !str_contains($value, ':')) {
            $query->where($field, 'like', "%{$value}%");
            return;
        }

        [$operator, $filterValue] = explode(':', $value, 2);

        // Convert numeric strings to appropriate type
        if (is_numeric($filterValue)) {
            $filterValue = strpos($filterValue, '.') !== false
                ? (float) $filterValue
                : (int) $filterValue;
        }

        // Apply operator
        $query->where($field, match (strtolower($operator)) {
            'eq' => '=',
            'gt' => '>',
            'gte' => '>=',
            'lt' => '<',
            'lte' => '<=',
            'like' => 'like',
            'notlike' => 'not like',
            'null' => static fn($q) => $q->whereNull($field),
            'notnull' => static fn($q) => $q->whereNotNull($field),
            default => 'like'
        }, match (strtolower($operator)) {
            'like', 'notlike' => "%{$filterValue}%",
            'null', 'notnull' => null,
            default => $filterValue
        });
    }

    private function applySorting(Request $request, Builder $builder): void
    {
        if (!$request->has('sort')) {
            return;
        }

        collect($request->input('sort'))->each(function ($sort) use ($builder) {
            $field = $this->resolveSortField((string) ($sort['id'] ?? ''), self::QUERY_COLUMNS);
            if (!$field) {
                return;
            }
            $direction = $sort['desc'] ? 'DESC' : 'ASC';
            $builder->orderBy($field, $direction);
        });
    }

    public function paid(Request $request)
    {
        return DB::transaction(function () use ($request) {
            $order = Order::where('trade_no', $request->input('trade_no'))
                ->lockForUpdate()
                ->first();
            if (!$order) {
                return $this->fail([400202, '订单不存在']);
            }
            if ($order->status !== 0) {
                return $this->fail([400, '只能对待支付的订单进行操作']);
            }

            $orderService = new OrderService($order);
            if (!$orderService->paid('manual_operation')) {
                return $this->fail([500, '更新失败']);
            }
            $order->refresh();
            if ((int) $order->status !== Order::STATUS_COMPLETED) {
                return $this->fail([500, '订单开通失败']);
            }
            return $this->success(true);
        });
    }

    public function cancel(Request $request)
    {
        return DB::transaction(function () use ($request) {
            $order = Order::where('trade_no', $request->input('trade_no'))
                ->lockForUpdate()
                ->first();
            if (!$order) {
                return $this->fail([400202, '订单不存在']);
            }
            if (!in_array((int) $order->status, [Order::STATUS_PENDING, Order::STATUS_PROCESSING], true)) {
                return $this->fail([400, '只能对待支付或处理中的订单进行操作']);
            }
            if ((int) $order->status === Order::STATUS_PROCESSING && $order->paid_at) {
                return $this->fail([400, '已支付订单不可取消，请先处理退款']);
            }

            $orderService = new OrderService($order);
            if (!$orderService->cancel()) {
                return $this->fail([400, '更新失败']);
            }
            return $this->success(true);
        });
    }

    public function update(OrderUpdate $request)
    {
        $params = $request->only([
            'commission_status'
        ]);

        $order = Order::where('trade_no', $request->input('trade_no'))
            ->first();
        if (!$order) {
            return $this->fail([400202, '订单不存在']);
        }

        if (
            isset($params['commission_status'])
            && (int) $params['commission_status'] === 2
            && (int) $order->commission_status !== 2
        ) {
            return $this->fail([400, '佣金状态不可手动标记为已结算']);
        }

        if (
            (int) $order->commission_status === 2
            && isset($params['commission_status'])
            && (int) $params['commission_status'] !== 2
        ) {
            return $this->fail([400, '已结算的佣金不可回退']);
        }

        if (
            isset($params['commission_status'])
            && (int) $params['commission_status'] === 1
            && CommissionLog::where('trade_no', $order->trade_no)->exists()
        ) {
            return $this->fail([400, '该订单已有佣金记录，不可重新标记为待确认']);
        }

        try {
            $order->update($params);
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, '更新失败']);
        }

        return $this->success(true);
    }

    public function assign(OrderAssign $request)
    {
        try {
            $tradeNo = DB::transaction(function () use ($request) {
                $user = User::byEmail($request->input('email'))->lockForUpdate()->first();
                $plan = Plan::where('id', $request->input('plan_id'))->lockForUpdate()->first();

                if (!$user) {
                    throw new \RuntimeException('该用户不存在');
                }

                if ($user->banned) {
                    throw new \RuntimeException('该用户已被封禁，无法分配订阅');
                }

                if (!$plan) {
                    throw new \RuntimeException('该订阅不存在');
                }

                $userService = new UserService();
                if ($userService->isNotCompleteOrderByUserId($user->id)) {
                    throw new \RuntimeException('该用户还有待支付的订单，无法分配');
                }

                $periodKey = PlanService::getPeriodKey((string) $request->input('period'));
                $price = $plan->prices[$periodKey] ?? null;
                if ($price === null) {
                    throw new \RuntimeException('该订阅周期不可购买');
                }

                $planService = new PlanService($plan);
                $planService->validatePurchase($user, (string) $request->input('period'));

                $order = new Order();
                $orderService = new OrderService($order);
                $order->user_id = $user->id;
                $order->plan_id = $plan->id;
                $order->period = $periodKey;
                $order->trade_no = Helper::generateOrderNo();
                $adminTotal = $request->filled('total_amount')
                    ? (int) $request->input('total_amount')
                    : (int) ($price * 100);
                $order->total_amount = $adminTotal;

                $orderService->setVipDiscount($user);
                $orderService->setOrderType($user);
                $order->total_amount = $adminTotal;
                $order->surplus_amount = 0;
                $order->surplus_credit = 0;
                $order->surplus_order_ids = null;

                $orderService->setInvite($user);

                if (!$order->save()) {
                    throw new \RuntimeException('订单创建失败');
                }

                $orderService = new OrderService($order->fresh());
                if (!$orderService->paid('ADMIN_ASSIGN_' . $order->trade_no)) {
                    throw new \RuntimeException('订单开通失败');
                }
                $order->refresh();
                if ((int) $order->status !== Order::STATUS_COMPLETED) {
                    throw new \RuntimeException('订单开通失败');
                }

                return $order->trade_no;
            });

            return $this->success($tradeNo);
        } catch (\App\Exceptions\ApiException $e) {
            return $this->fail([400, $e->getMessage()]);
        } catch (\RuntimeException $e) {
            $message = $e->getMessage();
            if ($message === '该用户不存在' || $message === '该订阅不存在') {
                return $this->fail([400202, $message]);
            }
            return $this->fail([500, $message]);
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, '订单开通失败']);
        }
    }
}
