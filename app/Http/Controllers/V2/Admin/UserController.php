<?php

namespace App\Http\Controllers\V2\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserGenerate;
use App\Http\Requests\Admin\UserSendMail;
use App\Http\Requests\Admin\UserUpdate;
use App\Jobs\SendEmailJob;
use App\Models\CommissionLog;
use App\Models\GiftCardCode;
use App\Models\GiftCardUsage;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Ticket;
use App\Models\TicketMessage;
use App\Models\TrafficResetLog;
use App\Models\User;
use App\Services\AuthService;
use App\Jobs\NodeUserSyncJob;
use App\Services\Plugin\HookManager;
use App\Services\PlanService;
use App\Services\TicketService;
use App\Services\UserService;
use App\Support\CommissionChain;
use App\Support\InviteChain;
use App\Traits\QueryOperators;
use App\Traits\SafeQueryColumns;
use App\Utils\Helper;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    use QueryOperators;
    use SafeQueryColumns;

    private const FILTER_COLUMNS = [
        'email', 'id', 'plan_id', 'transfer_enable', 'total_used', 'online_count',
        'expired_at', 'uuid', 'token', 'banned', 'remarks', 'inviter_email',
        'invite_user_id', 'is_admin', 'is_staff', 'group_ids', 'group_id', 'u', 'd',
        'balance', 'commission_balance', 'created_at',
    ];

    private const FILTER_ALIASES = ['remark' => 'remarks'];

    private const SORT_COLUMNS = [
        'id', 'email', 'is_admin', 'is_staff', 'online_count', 'banned', 'plan_id',
        'group_id', 'total_used', 'transfer_enable', 'balance', 'expired_at',
        'commission_balance', 'created_at', 'next_reset_at', 'u', 'd',
    ];

    private const SORT_ALIASES = ['group' => 'group_id'];

    public function resetSecret(Request $request)
    {
        $request->validate([
            'id' => 'required|integer|exists:v2_user,id',
        ]);

        $user = User::find($request->input('id'));
        if (!$user)
            return $this->fail([400202, '用户不存在']);
        $user->token = Helper::guid();
        $user->uuid = Helper::guid(true);
        $result = $user->save();

        if ($result) {
            HookManager::call('admin.user.secret.reset', [
                'user' => $user,
                'request' => $request,
            ]);
        }

        return $this->success($result);
    }

    // Apply filters and sorts to the query builder.
    private function applyFiltersAndSorts(Request $request, Builder|QueryBuilder $builder): void
    {
        $this->applyFilters($request, $builder);
        $this->applySorting($request, $builder);
    }

    // Apply filters to the query builder.
    private function applyFilters(Request $request, Builder|QueryBuilder $builder): void
    {
        if (!$request->has('filter')) {
            return;
        }

        $filters = collect($request->input('filter'))->filter(function ($filter) {
            return (bool) $this->resolveFilterField(
                (string) ($filter['id'] ?? ''),
                self::FILTER_COLUMNS,
                array_merge(self::SORT_ALIASES, self::FILTER_ALIASES)
            );
        })->values();

        if ($filters->isEmpty()) {
            return;
        }

        $builder->where(function ($query) use ($filters) {
            $filters->each(function ($filter, $index) use ($query) {
                $field = $this->resolveFilterField(
                    (string) ($filter['id'] ?? ''),
                    self::FILTER_COLUMNS,
                    array_merge(self::SORT_ALIASES, self::FILTER_ALIASES)
                );
                $value = $filter['value'];
                $logic = strtolower($filter['logic'] ?? 'and');
                $apply = function ($q) use ($field, $value) {
                    $this->buildFilterQuery($q, $field, $value);
                };
                if ($index === 0 || $logic !== 'or') {
                    $query->where($apply);
                } else {
                    $query->orWhere($apply);
                }
            });
        });
    }

    // Build one filter query condition.
    private function buildFilterQuery(Builder|QueryBuilder $query, string $field, mixed $value): void
    {
        if ($field === 'inviter_email') {
            if (!method_exists($query, 'whereHas')) {
                return;
            }
            $email = is_string($value) && str_contains($value, ':')
                ? explode(':', $value, 2)[1]
                : (string) $value;
            $query->whereHas('invite_user', function ($q) use ($email) {
                $q->where('email', 'like', '%' . str_replace(['%', '_'], ['\\%', '\\_'], $email) . '%');
            });
            return;
        }

        // 处理关联查询
        if (str_contains($field, '.')) {
            if (!method_exists($query, 'whereHas')) {
                return;
            }
            [$relation, $relationField] = explode('.', $field);
            $query->whereHas($relation, function ($q) use ($relationField, $value) {
                if (is_array($value)) {
                    $q->whereIn($relationField, $value);
                } else if (is_string($value) && str_contains($value, ':')) {
                    [$operator, $filterValue] = explode(':', $value, 2);
                    $this->applyQueryCondition($q, $relationField, $operator, $filterValue);
                } else {
                    $q->where($relationField, 'like', "%{$value}%");
                }
            });
            return;
        }

        // 处理数组值的 'in' 操作
        if (is_array($value)) {
            $query->whereIn($field === 'group_ids' ? 'group_id' : $field, $value);
            return;
        }

        // 处理基于运算符的过滤
        if (!is_string($value) || !str_contains($value, ':')) {
            $query->where($field, 'like', "%{$value}%");
            return;
        }

        [$operator, $filterValue] = explode(':', $value, 2);

        // 转换数字字符串为适当的类型
        if (is_numeric($filterValue)) {
            $filterValue = strpos($filterValue, '.') !== false
                ? (float) $filterValue
                : (int) $filterValue;
        }

        // 处理计算字段
        $queryField = match ($field) {
            'total_used' => DB::raw('(u + d)'),
            default => $field
        };

        $this->applyQueryCondition($query, $queryField, $operator, $filterValue);
    }

    // Apply sorting rules to the query builder.
    private function applySorting(Request $request, Builder|QueryBuilder $builder): void
    {
        if (!$request->has('sort')) {
            return;
        }

        collect($request->input('sort'))->each(function ($sort) use ($builder) {
            $field = $this->resolveSortField((string) ($sort['id'] ?? ''), self::SORT_COLUMNS, self::SORT_ALIASES);
            if (!$field) {
                return;
            }
            $direction = $sort['desc'] ? 'DESC' : 'ASC';
            $builder->orderBy($field, $direction);
        });
    }

    // Resolve bulk operation scope and normalize user_ids.
    private function resolveScope(Request $request): array
    {
        $scope = $request->input('scope');
        $userIds = $request->input('user_ids');

        $hasSelection = is_array($userIds) && count(array_filter($userIds, static fn($v) => is_numeric($v))) > 0;
        $hasFilter = $request->has('filter') && !empty($request->input('filter'));

        if (!in_array($scope, ['selected', 'filtered', 'all'], true)) {
            if ($hasSelection) {
                $scope = 'selected';
            } elseif ($hasFilter) {
                $scope = 'filtered';
            } else {
                $scope = 'selected';
            }
        }

        if ($scope === 'all' && $request->input('scope') !== 'all') {
            $scope = 'selected';
        }

        $normalizedIds = [];
        if ($scope === 'selected') {
            $normalizedIds = is_array($userIds) ? $userIds : [];
            $normalizedIds = array_values(array_unique(array_map(static function ($v) {
                return is_numeric($v) ? (int) $v : null;
            }, $normalizedIds)));
            $normalizedIds = array_values(array_filter($normalizedIds, static fn($v) => is_int($v)));
        }

        return [
            'scope' => $scope,
            'user_ids' => $normalizedIds,
        ];
    }

    // Fetch paginated user list (filters + sorting).
    public function fetch(Request $request)
    {
        [$current, $pageSize] = Helper::paginateParams(
            $request->input('current', 1),
            $request->input('pageSize', 10)
        );

        $userModel = User::query()
            ->with(['plan:id,name', 'invite_user:id,email', 'group:id,name'])
            ->select((new User())->getTable() . '.*')
            ->selectRaw('(u + d) as total_used');

        $userModel = HookManager::filter('admin.user.fetch.query', $userModel, $request);

        $this->applyFiltersAndSorts($request, $userModel);

        $users = $userModel->orderBy('id', 'desc')
            ->paginate($pageSize, ['*'], 'page', $current);

        $users->getCollection()->transform(function ($user): array {
            return self::transformUserData($user);
        });

        return $this->paginate($users);
    }

    // Transform user fields for API response.
    public static function transformUserData(?User $user): ?array
    {
        if (!$user) {
            return null;
        }
        $model = $user;
        $user = $user->toArray();
        $user['balance'] = $user['balance'] / 100;
        $user['commission_balance'] = $user['commission_balance'] / 100;
        $user['subscribe_url'] = Helper::getSubscribeUrl($user['token']);
        return HookManager::filter('admin.user.transform', $user, $model);
    }

    public function getUserInfoById(Request $request)
    {
        $request->validate([
            'id' => 'required|numeric'
        ], [
            'id.required' => '用户ID不能为空'
        ]);
        $user = User::find($request->input('id'));
        if (!$user) {
            return $this->fail([400202, '用户不存在']);
        }
        $user->load('invite_user');
        $user = HookManager::filter('admin.user.detail', $user, $request);
        return $this->success(self::transformUserData($user));
    }

    public function update(UserUpdate $request)
    {
        $params = $request->validated();

        $user = User::find($request->input('id'));
        if (!$user) {
            return $this->fail([400202, '用户不存在']);
        }
        if (isset($params['email'])) {
            if (User::byEmail($params['email'])->first() && $user->email !== $params['email']) {
                return $this->fail([400201, '邮箱已被使用']);
            }
        }
        // 处理密码
        if (isset($params['password'])) {
            $params['password'] = password_hash($params['password'], PASSWORD_DEFAULT);
            $params['password_algo'] = NULL;
        } else {
            unset($params['password']);
        }
        // 处理订阅计划
        if (isset($params['plan_id'])) {
            $plan = Plan::find($params['plan_id']);
            if (!$plan) {
                return $this->fail([400202, '订阅计划不存在']);
            }
            if ((int) $params['plan_id'] !== (int) $user->plan_id
                && !(new PlanService($plan))->hasCapacity($plan)) {
                return $this->fail([400, __('Current product is sold out')]);
            }
            $params['group_id'] = $plan->group_id;
            if ((int) $params['plan_id'] !== (int) $user->plan_id) {
                if (!$request->has('transfer_enable')) {
                    $params['transfer_enable'] = $plan->transfer_enable * 1073741824;
                }
                if (!$request->has('speed_limit')) {
                    $params['speed_limit'] = $plan->speed_limit;
                }
                if (!$request->has('device_limit')) {
                    $params['device_limit'] = $plan->device_limit;
                }
            }
        }

        $actor = $request->user();
        if (array_key_exists('is_admin', $params) || array_key_exists('is_staff', $params)) {
            if (!$actor || (int) $actor->id !== 1) {
                unset($params['is_admin'], $params['is_staff']);
            } elseif (array_key_exists('is_admin', $params) && !(int) $params['is_admin']) {
                if ((int) $user->id === (int) $actor->id) {
                    $adminCount = User::where('is_admin', 1)->where('banned', 0)->count();
                    if ($adminCount <= 1) {
                        unset($params['is_admin']);
                    }
                }
            }
        }
        // 处理邀请用户（仅当请求显式携带 invite_user_email 时才更新）
        if ($request->exists('invite_user_email')) {
            $inviteEmail = trim((string) $request->input('invite_user_email'));
            if ($inviteEmail !== '' && ($inviteUser = User::byEmail($inviteEmail)->first())) {
                if ($inviteUser->banned) {
                    return $this->fail([400, '邀请人已被封禁，无法设置']);
                }
                try {
                    InviteChain::assertValid((int) $user->id, (int) $inviteUser->id);
                } catch (\InvalidArgumentException $e) {
                    return $this->fail([400, $e->getMessage()]);
                }
                $params['invite_user_id'] = $inviteUser->id;
            } else {
                $params['invite_user_id'] = null;
            }
        }

        if (isset($params['banned']) && (int) $params['banned'] === 1) {
            $authService = new AuthService($user);
            $authService->removeAllSessions();
        }
        if (isset($params['balance'])) {
            if ((float) $request->input('balance') < 0) {
                return $this->fail([422, '余额不能为负数']);
            }
            $params['balance'] = $params['balance'] * 100;
        }
        if (isset($params['commission_balance'])) {
            if ((float) $request->input('commission_balance') < 0) {
                return $this->fail([422, '佣金余额不能为负数']);
            }
            $params['commission_balance'] = $params['commission_balance'] * 100;
        }

        $params = HookManager::filter('admin.user.update.params', $params, $request, $user);

        HookManager::call('admin.user.update.before', [
            'user' => $user,
            'params' => $params,
            'request' => $request,
        ]);

        try {
            DB::transaction(function () use ($request, $params) {
                $user = User::where('id', $request->input('id'))->lockForUpdate()->first();
                if (!$user) {
                    throw new \RuntimeException('user_not_found');
                }
                $user->update($params);
            });
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'user_not_found') {
                return $this->fail([400202, '用户不存在']);
            }
            throw $e;
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, '保存失败']);
        }

        $user = User::find($request->input('id'));
        if (!$user) {
            return $this->fail([400202, '用户不存在']);
        }

        HookManager::call('admin.user.update.after', [
            'user' => $user->refresh(),
            'params' => $params,
            'request' => $request,
        ]);

        return $this->success(true);
    }

    // Export users to CSV.
    public function dumpCSV(Request $request)
    {
        ini_set('memory_limit', '-1');
        gc_enable(); // 启用垃圾回收

        $scopeInfo = $this->resolveScope($request);
        $scope = $scopeInfo['scope'];
        $userIds = $scopeInfo['user_ids'];

        if ($scope === 'selected') {
            if (empty($userIds)) {
                return $this->fail([422, 'user_ids不能为空']);
            }
        }

        // 优化查询：使用with预加载plan关系，避免N+1问题
        $query = User::query()
            ->with('plan:id,name')
            ->orderBy('id', 'asc')
            ->select([
                'email',
                'balance',
                'commission_balance',
                'transfer_enable',
                'u',
                'd',
                'expired_at',
                'token',
                'plan_id'
            ]);

        if ($scope === 'selected') {
            $query->whereIn('id', $userIds);
        } else        if ($scope === 'filtered') {
            $this->applyFiltersAndSorts($request, $query);
        } // all: ignore filter/sort

        $includeSubscribeUrl = $request->boolean('include_subscribe_url');

        $filename = 'users_' . date('Y-m-d_His') . '.csv';

        return response()->streamDownload(function () use ($query, $includeSubscribeUrl) {
            // 打开输出流
            $output = fopen('php://output', 'w');

            // 添加BOM标记，确保Excel正确显示中文
            fprintf($output, chr(0xEF) . chr(0xBB) . chr(0xBF));

            // 写入CSV头部
            $headers = [
                '邮箱',
                '余额',
                '推广佣金',
                '总流量',
                '剩余流量',
                '套餐到期时间',
                '订阅计划',
            ];
            if ($includeSubscribeUrl) {
                $headers[] = '订阅地址';
            }
            fputcsv($output, $headers);

            // 分批处理数据以减少内存使用
            $query->chunk(500, function ($users) use ($output, $includeSubscribeUrl) {
                foreach ($users as $user) {
                    try {
                        $row = [
                            $user->email,
                            number_format($user->balance / 100, 2),
                            number_format($user->commission_balance / 100, 2),
                            Helper::trafficConvert($user->transfer_enable),
                            Helper::trafficConvert($user->transfer_enable - ($user->u + $user->d)),
                            $user->expired_at ? date('Y-m-d H:i:s', $user->expired_at) : '长期有效',
                            $user->plan ? $user->plan->name : '无订阅',
                        ];
                        if ($includeSubscribeUrl) {
                            $row[] = Helper::getSubscribeUrl($user->token);
                        }
                        fputcsv($output, $row);
                    } catch (\Exception $e) {
                        Log::error('CSV导出错误: ' . $e->getMessage(), [
                            'user_id' => $user->id,
                            'email' => $user->email
                        ]);
                        continue; // 继续处理下一条记录
                    }
                }

                // 清理内存
                gc_collect_cycles();
            });

            fclose($output);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"'
        ]);
    }

    public function generate(UserGenerate $request)
    {
        if ($request->input('email_prefix')) {
            // If generate_count is specified with email_prefix, generate multiple users with incremented emails
            if ($request->input('generate_count')) {
                return $this->multiGenerateWithPrefix($request);
            }
            
            // Single user generation with email_prefix
            $email = $request->input('email_prefix') . '@' . $request->input('email_suffix');

            if (User::byEmail($email)->exists()) {
                return $this->fail([400201, '邮箱已存在于系统中']);
            }

            $userService = app(UserService::class);
            $user = $userService->createUser([
                'email' => $email,
                'password' => $request->input('password') ?? $email,
                'plan_id' => $request->input('plan_id'),
                'expired_at' => $request->input('expired_at'),
            ]);

            if (!$user->save()) {
                return $this->fail([500, '生成失败']);
            }
            return $this->success(true);
        }

        if ($request->input('generate_count')) {
            return $this->multiGenerate($request);
        }

        return $this->fail([422, '请提供 email_prefix 或 generate_count']);
    }

    private function multiGenerate(Request $request)
    {
        $userService = app(UserService::class);
        $usersData = [];

        for ($i = 0; $i < $request->input('generate_count'); $i++) {
            $email = Helper::randomChar(6) . '@' . $request->input('email_suffix');
            $usersData[] = [
                'email' => $email,
                'password' => $request->input('password') ?? $email,
                'plan_id' => $request->input('plan_id'),
                'expired_at' => $request->input('expired_at'),
            ];
        }



        try {
            DB::beginTransaction();
            $users = [];
            foreach ($usersData as $userData) {
                $user = $userService->createUser($userData);
                $user->save();
                $users[] = $user;
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->fail([500, '生成失败']);
        }

        // 判断是否导出 CSV
        if ($request->input('download_csv')) {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="users.csv"',
            ];
            $callback = function () use ($users, $request) {
                $handle = fopen('php://output', 'w');
                fputcsv($handle, ['账号', '密码', '过期时间', 'UUID', '创建时间', '订阅地址']);
                foreach ($users as $user) {
                    $user = $user->refresh();
                    $expireDate = $user['expired_at'] === NULL ? '长期有效' : date('Y-m-d H:i:s', $user['expired_at']);
                    $createDate = date('Y-m-d H:i:s', $user['created_at']);
                    $password = $request->input('password') ?? $user['email'];
                    $subscribeUrl = Helper::getSubscribeUrl($user['token']);
                    fputcsv($handle, [$user['email'], $password, $expireDate, $user['uuid'], $createDate, $subscribeUrl]);
                }
                fclose($handle);
            };
            return response()->streamDownload($callback, 'users.csv', $headers);
        }

        return $this->generatedUsersJsonResponse($users, $request);
    }

    private function multiGenerateWithPrefix(Request $request)
    {
        $userService = app(UserService::class);
        $usersData = [];
        $emailPrefix = $request->input('email_prefix');
        $emailSuffix = $request->input('email_suffix');
        $generateCount = $request->input('generate_count');

        // Check if any of the emails with prefix already exist
        for ($i = 1; $i <= $generateCount; $i++) {
            $email = $emailPrefix . '_' . $i . '@' . $emailSuffix;
            if (User::where('email', $email)->exists()) {
                return $this->fail([400201, '邮箱 ' . $email . ' 已存在于系统中']);
            }
        }

        // Generate user data for batch creation
        for ($i = 1; $i <= $generateCount; $i++) {
            $email = $emailPrefix . '_' . $i . '@' . $emailSuffix;
            $usersData[] = [
                'email' => $email,
                'password' => $request->input('password') ?? $email,
                'plan_id' => $request->input('plan_id'),
                'expired_at' => $request->input('expired_at'),
            ];
        }

        try {
            DB::beginTransaction();
            $users = [];
            foreach ($usersData as $userData) {
                $user = $userService->createUser($userData);
                $user->save();
                $users[] = $user;
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->fail([500, '生成失败']);
        }

        // 判断是否导出 CSV
        if ($request->input('download_csv')) {
            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="users.csv"',
            ];
            $callback = function () use ($users, $request) {
                $handle = fopen('php://output', 'w');
                fputcsv($handle, ['账号', '密码', '过期时间', 'UUID', '创建时间', '订阅地址']);
                foreach ($users as $user) {
                    $user = $user->refresh();
                    $expireDate = $user['expired_at'] === NULL ? '长期有效' : date('Y-m-d H:i:s', $user['expired_at']);
                    $createDate = date('Y-m-d H:i:s', $user['created_at']);
                    $password = $request->input('password') ?? $user['email'];
                    $subscribeUrl = Helper::getSubscribeUrl($user['token']);
                    fputcsv($handle, [$user['email'], $password, $expireDate, $user['uuid'], $createDate, $subscribeUrl]);
                }
                fclose($handle);
            };
            return response()->streamDownload($callback, 'users.csv', $headers);
        }

        return $this->generatedUsersJsonResponse($users, $request);
    }

    public function sendMail(UserSendMail $request)
    {
        ini_set('memory_limit', '-1');
        $scopeInfo = $this->resolveScope($request);
        $scope = $scopeInfo['scope'];
        $userIds = $scopeInfo['user_ids'];

        if ($scope === 'selected') {
            if (empty($userIds)) {
                return $this->fail([422, 'user_ids不能为空']);
            }
        }

        $sortType = in_array($request->input('sort_type'), ['ASC', 'DESC']) ? $request->input('sort_type') : 'DESC';
        $sort = $this->resolveSortField((string) $request->input('sort', 'created_at'), self::SORT_COLUMNS, self::SORT_ALIASES) ?? 'created_at';

        $builder = User::query()
            ->with('plan:id,name')
            ->orderBy('id', 'desc');

        if ($scope === 'filtered') {
            // filtered: apply filters/sort
            $builder->orderBy($sort, $sortType);
            $this->applyFiltersAndSorts($request, $builder);
        } elseif ($scope === 'selected') {
            $builder->whereIn('id', $userIds);
        } // all: ignore filter/sort

        $subject = $request->input('subject');
        $content = $request->input('content');
        $appName = admin_setting('app_name', 'XBoard');
        $appUrl = admin_setting('app_url');

        $chunkSize = 1000;

        $builder->chunk($chunkSize, function ($users) use ($subject, $content, $appName, $appUrl) {
            foreach ($users as $user) {
                $vars = [
                    'app.name' => $appName,
                    'app.url' => $appUrl,
                    'now' => now()->format('Y-m-d H:i:s'),
                    'user.id' => $user->id,
                    'user.email' => $user->email,
                    'user.uuid' => $user->uuid,
                    'user.plan_name' => $user->plan?->name ?? '',
                    'user.expired_at' => $user->expired_at ? date('Y-m-d H:i:s', $user->expired_at) : '',
                    'user.transfer_enable' => (int) ($user->transfer_enable ?? 0),
                    'user.transfer_used' => (int) (($user->u ?? 0) + ($user->d ?? 0)),
                    'user.transfer_left' => (int) (($user->transfer_enable ?? 0) - (($user->u ?? 0) + ($user->d ?? 0))),
                ];

                $templateValue = [
                    'name' => $appName,
                    'url' => $appUrl,
                    'content' => $content,
                    'vars' => $vars,
                    'content_mode' => 'text',
                ];

                dispatch(new SendEmailJob([
                    'email' => $user->email,
                    'subject' => $subject,
                    'template_name' => 'notify',
                    'template_value' => $templateValue
                ], 'send_email_mass'));
            }
        });

        return $this->success(true);
    }

    public function ban(Request $request)
    {
        $scopeInfo = $this->resolveScope($request);
        $scope = $scopeInfo['scope'];
        $userIds = $scopeInfo['user_ids'];

        if ($scope === 'selected') {
            if (empty($userIds)) {
                return $this->fail([422, 'user_ids不能为空']);
            }
        }

        $sortType = in_array($request->input('sort_type'), ['ASC', 'DESC']) ? $request->input('sort_type') : 'DESC';
        $sort = $this->resolveSortField((string) $request->input('sort', 'created_at'), self::SORT_COLUMNS, self::SORT_ALIASES) ?? 'created_at';

        $builder = User::query()->orderBy('id', 'desc');

        if ($scope === 'filtered') {
            // filtered: keep current semantics
            $builder->orderBy($sort, $sortType);
            $this->applyFiltersAndSorts($request, $builder);
        } elseif ($scope === 'selected') {
            $builder->whereIn('id', $userIds);
        } // all: ignore filter/sort

        try {
            $userIds = (clone $builder)->pluck('id');
            $builder->update([
                'banned' => 1
            ]);
            foreach ($userIds as $userId) {
                $bannedUser = User::find($userId);
                if ($bannedUser) {
                    (new AuthService($bannedUser))->removeAllSessions();
                }
                NodeUserSyncJob::dispatch($userId, 'updated');
            }
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, '处理失败']);
        }
        return $this->success(true);
    }

    public function setInviteUser(Request $request)
    {
        $request->validate([
            'id' => 'required|integer|exists:App\Models\User,id',
            'invite_user_id' => 'nullable|integer|exists:App\Models\User,id',
        ], [
            'id.required' => '用户ID不能为空',
            'id.exists' => '用户不存在',
            'invite_user_id.exists' => '邀请人不存在',
        ]);

        $user = User::find($request->input('id'));
        $inviteUserId = $request->input('invite_user_id');

        if ($inviteUserId && (int) $inviteUserId === (int) $user->id) {
            return $this->fail([400, '不能将自己设为邀请人']);
        }

        if ($inviteUserId) {
            $inviter = User::find($inviteUserId);
            if (!$inviter || $inviter->banned) {
                return $this->fail([400, '邀请人已被封禁，无法设置']);
            }
        }

        try {
            InviteChain::assertValid((int) $user->id, $inviteUserId ? (int) $inviteUserId : null);
        } catch (\InvalidArgumentException $e) {
            return $this->fail([400, $e->getMessage()]);
        }

        $user->invite_user_id = $inviteUserId ?: null;
        if (!$user->save()) {
            return $this->fail([500, '保存失败']);
        }

        return $this->success(true);
    }

    // Delete user and related data.
    public function destroy(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:App\Models\User,id'
        ], [
            'id.required' => '用户ID不能为空',
            'id.exists' => '用户不存在'
        ]);
        $user = User::find($request->input('id'));
        HookManager::call('admin.user.destroy.before', [
            'user' => $user,
            'request' => $request,
        ]);

        try {
            DB::beginTransaction();
            $userId = (int) $user->id;
            $pendingWithdraw = Ticket::where('user_id', $userId)
                ->where('status', Ticket::STATUS_OPENING)
                ->where('level', 2)
                ->get()
                ->contains(fn (Ticket $ticket) => TicketService::isWithdrawTicket($ticket));
            if ($pendingWithdraw) {
                DB::rollBack();
                return $this->fail([400, '用户存在待处理的提现工单，请先处理后再删除']);
            }
            $processingPaidOrder = Order::where('user_id', $userId)
                ->where('status', Order::STATUS_PROCESSING)
                ->whereNotNull('paid_at')
                ->exists();
            if ($processingPaidOrder) {
                DB::rollBack();
                return $this->fail([400, '用户存在支付处理中的订单，请等待开通完成或退款后再删除']);
            }
            if ((int) $user->balance > 0 || (int) $user->commission_balance > 0) {
                DB::rollBack();
                return $this->fail([400, '用户仍有站内余额或佣金余额，请先清零后再删除']);
            }
            $openOrders = Order::where('user_id', $userId)
                ->whereIn('status', [Order::STATUS_PENDING, Order::STATUS_PROCESSING])
                ->lockForUpdate()
                ->get();
            foreach ($openOrders as $openOrder) {
                if ($openOrder->paid_at) {
                    continue;
                }
                $orderService = new OrderService($openOrder);
                if (!$orderService->cancel()) {
                    DB::rollBack();
                    return $this->fail([400, '无法取消用户未完成订单，请先处理订单后再删除']);
                }
            }
            $ticketIds = $user->tickets()->pluck('id');
            if ($ticketIds->isNotEmpty()) {
                TicketMessage::whereIn('ticket_id', $ticketIds)->delete();
            }
            CommissionLog::where('user_id', $userId)
                ->orWhere('invite_user_id', $userId)
                ->delete();
            GiftCardUsage::where('user_id', $userId)->delete();
            GiftCardUsage::where('invite_user_id', $userId)->update(['invite_user_id' => null]);
            TrafficResetLog::where('user_id', $userId)->delete();
            GiftCardCode::where('user_id', $userId)->update(['user_id' => null]);
            User::where('invite_user_id', $userId)->update(['invite_user_id' => null]);
            Order::where('invite_user_id', $userId)
                ->whereIn('commission_status', [0, 1])
                ->update(['invite_user_id' => null, 'commission_status' => Order::COMMISSION_STATUS_INVALID]);
            $user->tokens()->delete();
            $user->orders()->delete();
            $user->codes()->delete();
            $user->stat()->delete();
            $user->tickets()->delete();
            $user->delete();
            DB::commit();

            HookManager::call('admin.user.destroy.after', [
                'user' => $user,
                'request' => $request,
            ]);

            return $this->success(true);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error($e);
            return $this->fail([500, '删除失败']);
        }
    }

    /**
     * @param  array<int, User>  $users
     */
    private function generatedUsersJsonResponse(array $users, Request $request): JsonResponse
    {
        $includeCredentials = $request->boolean('return_credentials');

        $data = collect($users)->map(function ($user) use ($request, $includeCredentials) {
            $row = [
                'email' => $user['email'],
                'expired_at' => $user['expired_at'] === null ? '长期有效' : date('Y-m-d H:i:s', $user['expired_at']),
                'uuid' => $user['uuid'],
                'created_at' => date('Y-m-d H:i:s', $user['created_at']),
            ];

            if ($includeCredentials) {
                $row['password'] = $request->input('password') ?? $user['email'];
                $row['subscribe_url'] = Helper::getSubscribeUrl($user['token']);
            }

            return $row;
        });

        return response()->json([
            'code' => 0,
            'message' => '批量生成成功',
            'data' => $data,
        ]);
    }
}
