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
use App\Traits\QueryOperators;

class OrderController extends Controller
{
    use SafeQueryColumns;
    use QueryOperators;

    private const QUERY_COLUMNS = [
        'id', 'trade_no', 'user_id', 'plan_id', 'period', 'type', 'status',
        'total_amount', 'commission_status', 'commission_balance', 'payment_id',
        'invite_user_id', 'created_at', 'updated_at', 'paid_at', 'callback_no',
    ];
    public function detail(Request $request)
    {
        $request->validate([
            'id' => 'required|integer|min:1',
        ], [
            'id.required' => __('Order ID cannot be empty'),
            'id.integer' => __('Order ID format is invalid'),
            'id.min' => __('Order ID format is invalid'),
        ]);
        $order = Order::with(['user', 'plan', 'commission_log', 'invite_user'])->find($request->input('id'));
        if (!$order)
            return $this->fail([400202, __('Order does not exist')]);
        if ($order->surplus_order_ids) {
            $order['surplus_orders'] = Order::whereIn('id', $order->surplus_order_ids)->get();
        }
        $order['period'] = PlanService::getLegacyPeriod((string) $order->period);
        return $this->success($order);
    }

    public function fetch(Request $request)
    {
        [$current, $pageSize] = Helper::paginateParams(
            $request->input('current', 1),
            $request->input('pageSize', 10)
        );
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

        $this->applyQueryCondition($query, $field, $operator, $filterValue);
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
        $request->validate([
            'trade_no' => 'required|string|max:64|exists:v2_order,trade_no',
        ], [
            'trade_no.required' => __('Trade number cannot be empty'),
        ]);

        return DB::transaction(function () use ($request) {
            $order = Order::where('trade_no', $request->input('trade_no'))
                ->lockForUpdate()
                ->first();
            if (!$order) {
                return $this->fail([400202, __('Order does not exist')]);
            }
            if ($order->status !== 0) {
                return $this->fail([400, __('Only pending orders can be marked as paid')]);
            }

            $orderService = new OrderService($order);
            if (!$orderService->paid('manual_operation')) {
                return $this->fail([500, __('Update failed')]);
            }
            $order->refresh();
            if ((int) $order->status !== Order::STATUS_COMPLETED) {
                return $this->fail([500, __('Order fulfillment failed')]);
            }
            return $this->success(true);
        });
    }

    public function cancel(Request $request)
    {
        $request->validate([
            'trade_no' => 'required|string|max:64|exists:v2_order,trade_no',
        ], [
            'trade_no.required' => __('Trade number cannot be empty'),
        ]);

        return DB::transaction(function () use ($request) {
            $order = Order::where('trade_no', $request->input('trade_no'))
                ->lockForUpdate()
                ->first();
            if (!$order) {
                return $this->fail([400202, __('Order does not exist')]);
            }
            if (!in_array((int) $order->status, [Order::STATUS_PENDING, Order::STATUS_PROCESSING], true)) {
                return $this->fail([400, __('Only pending or processing orders can be cancelled')]);
            }
            if ((int) $order->status === Order::STATUS_PROCESSING && $order->paid_at) {
                return $this->fail([400, __('Paid orders cannot be cancelled; process a refund first')]);
            }

            $orderService = new OrderService($order);
            if (!$orderService->cancel()) {
                return $this->fail([400, __('Update failed')]);
            }
            return $this->success(true);
        });
    }

    public function update(OrderUpdate $request)
    {
        $params = $request->only([
            'commission_status'
        ]);

        try {
            return DB::transaction(function () use ($request, $params) {
                $order = Order::where('trade_no', $request->input('trade_no'))
                    ->lockForUpdate()
                    ->first();
                if (!$order) {
                    return $this->fail([400202, __('Order does not exist')]);
                }

                if (
                    isset($params['commission_status'])
                    && (int) $params['commission_status'] === 2
                    && (int) $order->commission_status !== 2
                ) {
                    return $this->fail([400, __('Commission status cannot be manually set to settled')]);
                }

                if (
                    (int) $order->commission_status === 2
                    && isset($params['commission_status'])
                    && (int) $params['commission_status'] !== 2
                ) {
                    return $this->fail([400, __('Settled commission cannot be reverted')]);
                }

                if (
                    isset($params['commission_status'])
                    && (int) $params['commission_status'] === 1
                    && CommissionLog::where('trade_no', $order->trade_no)->exists()
                ) {
                    return $this->fail([400, __('Order already has commission records and cannot be marked pending again')]);
                }

                if (
                    isset($params['commission_status'])
                    && (int) $params['commission_status'] === 3
                    && (int) $order->commission_status === 2
                ) {
                    return $this->fail([400, __('Settled commission cannot be marked invalid')]);
                }

                $order->update($params);
                return $this->success(true);
            });
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Update failed')]);
        }
    }

    public function assign(OrderAssign $request)
    {
        try {
            $tradeNo = DB::transaction(function () use ($request) {
                $user = User::byEmail($request->input('email'))->lockForUpdate()->first();
                $plan = Plan::where('id', $request->input('plan_id'))->lockForUpdate()->first();

                if (!$user) {
                    throw new \RuntimeException('user_not_found');
                }

                if ($user->banned) {
                    throw new \RuntimeException('user_banned');
                }

                if (!$plan) {
                    throw new \RuntimeException('plan_not_found');
                }

                $userService = new UserService();
                if ($userService->isNotCompleteOrderByUserId($user->id)) {
                    throw new \RuntimeException('user_has_pending_order');
                }

                $periodKey = PlanService::getPeriodKey((string) $request->input('period'));
                $price = $plan->prices[$periodKey] ?? null;
                if ($price === null) {
                    throw new \RuntimeException('invalid_plan_period');
                }

                $planService = new PlanService($plan);
                $planService->validatePurchase($user, (string) $request->input('period'));

                $order = new Order();
                $orderService = new OrderService($order);
                $order->user_id = $user->id;
                $order->plan_id = $plan->id;
                $order->period = $periodKey;
                $order->trade_no = Helper::generateOrderNo();
                $maxTotal = (int) round($price * 100);
                $adminTotal = (int) $request->input('total_amount');
                if ($adminTotal > $maxTotal) {
                    throw new \RuntimeException('amount_exceeds_price');
                }
                $order->total_amount = $adminTotal;
                $order->discount_amount = 0;

                $orderService->setOrderType($user);
                $order->surplus_amount = 0;
                $order->surplus_credit = 0;
                $order->surplus_order_ids = null;

                $orderService->setInvite($user);

                if (!$order->save()) {
                    throw new \RuntimeException('order_create_failed');
                }

                $orderService = new OrderService($order->fresh());
                if (!$orderService->paid('ADMIN_ASSIGN_' . $order->trade_no)) {
                    throw new \RuntimeException('order_fulfillment_failed');
                }
                $order->refresh();
                if ((int) $order->status !== Order::STATUS_COMPLETED) {
                    throw new \RuntimeException('order_fulfillment_failed');
                }

                return $order->trade_no;
            });

            return $this->success($tradeNo);
        } catch (\App\Exceptions\ApiException $e) {
            return $this->fail([400, $e->getMessage()]);
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'user_not_found' => $this->fail([400202, __('The user does not exist')]),
                'plan_not_found' => $this->fail([400202, __('Subscription plan does not exist')]),
                'user_banned' => $this->fail([400, __('User is banned and cannot receive a subscription')]),
                'user_has_pending_order' => $this->fail([400, __('User has an unpaid or pending order, please try again later or cancel it')]),
                'invalid_plan_period' => $this->fail([400, __('Invalid plan period')]),
                'amount_exceeds_price' => $this->fail([400, __('Payment amount cannot exceed the plan list price')]),
                'order_create_failed' => $this->fail([500, __('Failed to create order')]),
                'order_fulfillment_failed' => $this->fail([500, __('Order fulfillment failed')]),
                default => $this->fail([500, $e->getMessage()]),
            };
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Order fulfillment failed')]);
        }
    }
}
