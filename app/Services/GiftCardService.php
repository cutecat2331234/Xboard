<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Http\Resources\PlanResource;
use App\Models\CommissionLog;
use App\Models\GiftCardCode;
use App\Models\GiftCardTemplate;
use App\Models\GiftCardUsage;
use App\Models\Order;
use App\Models\Plan;
use App\Models\TrafficResetLog;
use App\Models\User;
use App\Support\AppFeature;
use App\Support\CommissionChain;
use App\Support\OnetimeCommission;
use App\Services\PlanService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GiftCardService
{
    protected readonly GiftCardCode $code;
    protected readonly GiftCardTemplate $template;
    protected ?User $user = null;

    public function __construct(string $code)
    {
        $this->code = GiftCardCode::where('code', $code)->first()
            ?? throw new ApiException(__('Redemption code does not exist'));

        $template = $this->code->template;
        if (!$template) {
            throw new ApiException(__('Gift card template does not exist'));
        }
        $this->template = $template;
    }

    /**
     * 设置使用用户
     */
    public function setUser(User $user): self
    {
        $this->user = $user;
        return $this;
    }

    /**
     * 验证兑换码
     */
    public function validate(): self
    {
        $this->validateIsActive();

        $eligibility = $this->checkUserEligibility();
        if (!$eligibility['can_redeem']) {
            throw new ApiException($eligibility['reason']);
        }

        return $this;
    }

    /**
     * 验证礼品卡本身是否可用 (不检查用户条件)
     * @throws ApiException
     */
    public function validateIsActive(): self
    {
        if (!$this->template->isAvailable()) {
            throw new ApiException(__('This gift card type is disabled'));
        }

        if (!$this->code->isAvailable()) {
            throw new ApiException(__('Redemption code is not available: :status', [
                'status' => $this->code->status_name,
            ]));
        }
        return $this;
    }

    /**
     * 检查用户是否满足兑换条件 (不抛出异常)
     */
    public function checkUserEligibility(): array
    {
        if (!$this->user) {
            return [
                'can_redeem' => false,
                'reason' => __('User information not provided'),
            ];
        }

        if (!$this->template->checkUserConditions($this->user)) {
            return [
                'can_redeem' => false,
                'reason' => __('You do not meet the requirements for this gift card'),
            ];
        }

        if (!$this->template->checkUsageLimit($this->user)) {
            return [
                'can_redeem' => false,
                'reason' => __('You have reached the usage limit for this gift card'),
            ];
        }

        return ['can_redeem' => true, 'reason' => null];
    }

    /**
     * 使用礼品卡
     */
    public function redeem(array $options = []): array
    {
        if (!$this->user) {
            throw new ApiException(__('Redemption user is not set'));
        }

        return DB::transaction(function () use ($options) {
            $code = GiftCardCode::where('id', $this->code->id)->lockForUpdate()->first();
            if (!$code || !$code->isAvailable()) {
                throw new ApiException(__('Redemption code is not available: :status', [
                    'status' => $code?->status_name ?? __('Not found'),
                ]));
            }

            $lockedUser = User::where('id', $this->user->id)->lockForUpdate()->first();
            if (!$lockedUser) {
                throw new ApiException(__('The user does not exist'));
            }
            $this->user = $lockedUser;

            $lockedTemplate = GiftCardTemplate::where('id', $this->template->id)->lockForUpdate()->first();
            if (!$lockedTemplate) {
                throw new ApiException(__('Gift card template does not exist'));
            }
            $this->template = $lockedTemplate;

            if (!$this->template->checkUsageLimit($this->user, true)) {
                throw new ApiException(__('You have reached the usage limit for this gift card'));
            }

            if (!$this->template->checkUserConditions($this->user)) {
                throw new ApiException(__('You do not meet the requirements for this gift card'));
            }

            $actualRewards = $this->template->calculateActualRewards($this->user);

            if ($this->template->type === GiftCardTemplate::TYPE_MYSTERY) {
                $this->code->setActualRewards($actualRewards);
            }

            $this->giveRewards($actualRewards);

            $inviteRewards = null;
            if (
                isset($actualRewards['invite_reward_rate'])
                && AppFeature::inviteEnabled()
                && AppFeature::commissionEnabled()
                && $this->shouldPayGiftCardInviteCommission()
            ) {
                $inviteRewards = $this->giveInviteRewards($actualRewards);
            }

            if (!$code->markAsUsed($this->user)) {
                throw new ApiException(__('Redemption code status update failed'));
            }

            GiftCardUsage::createRecord(
                $code,
                $this->user,
                $actualRewards,
                array_merge($options, [
                    'invite_rewards' => $inviteRewards,
                    'multiplier' => $this->calculateMultiplier(),
                ])
            );

            return [
                'rewards' => $actualRewards,
                'invite_rewards' => $inviteRewards,
                'code' => $code->code,
                'template_name' => $this->template->name,
            ];
        });
    }

    /**
     * 发放奖励
     */
    protected function giveRewards(array $rewards): void
    {
        $userService = app(UserService::class);
        $bonusTransfer = (int) ($rewards['transfer_enable'] ?? 0);
        $bonusDevice = (int) ($rewards['device_limit'] ?? 0);
        $hasPlanReward = isset($rewards['plan_id']);

        if (isset($rewards['balance']) && $rewards['balance'] > 0) {
            if (!$userService->addBalance($this->user->id, $rewards['balance'])) {
                throw new ApiException(__('Failed to credit balance'));
            }
        }

        if (!$hasPlanReward) {
            if ($bonusTransfer > 0) {
                $this->user->transfer_enable = ($this->user->transfer_enable ?? 0) + $bonusTransfer;
            }

            if ($bonusDevice > 0) {
                $this->user->device_limit = ($this->user->device_limit ?? 0) + $bonusDevice;
            }
        }

        if (isset($rewards['reset_package']) && $rewards['reset_package']) {
            if ($this->user->plan_id) {
                app(TrafficResetService::class)->performReset($this->user, TrafficResetLog::SOURCE_GIFT_CARD);
                $this->user->refresh();
            }
        }

        if ($hasPlanReward) {
            $plan = Plan::where('id', $rewards['plan_id'])->lockForUpdate()->first();
            if (!$plan) {
                throw new ApiException(__('Associated plan does not exist'));
            }
            $planService = new PlanService($plan);
            $alreadyOnPlan = (int) $this->user->plan_id === (int) $plan->id
                && ($this->user->expired_at === null || (int) $this->user->expired_at > time());
            if (!$alreadyOnPlan && !$planService->hasCapacity($plan)) {
                throw new ApiException(__('Current product is sold out'));
            }
            app(TrafficResetService::class)->performReset($this->user, TrafficResetLog::SOURCE_GIFT_CARD);
            $this->user->refresh();
            $validityDays = (int) ($rewards['plan_validity_days'] ?? 0);
            if ($validityDays <= 0) {
                $validityDays = 30;
            }
            $userService->assignPlan(
                $this->user,
                $plan,
                $validityDays
            );
            if ($bonusTransfer > 0) {
                $this->user->transfer_enable = ($this->user->transfer_enable ?? 0) + $bonusTransfer;
            }
            if ($bonusDevice > 0) {
                $this->user->device_limit = ($this->user->device_limit ?? 0) + $bonusDevice;
            }
        } else {
            // 只有在不是套餐卡的情况下，才处理独立的有效期奖励
            if (isset($rewards['expire_days']) && $rewards['expire_days'] > 0) {
                $userService->extendSubscription($this->user, $rewards['expire_days']);
            }
        }

        // 保存用户更改
        if (!$this->user->save()) {
            throw new ApiException(__('Failed to update user information'));
        }
    }

    /**
     * 发放邀请人奖励
     */
    protected function giveInviteRewards(array $rewards): ?array
    {
        if (!$this->user->invite_user_id || !CommissionChain::isValid((int) $this->user->invite_user_id)) {
            return null;
        }

        $rate = $rewards['invite_reward_rate'] ?? 0.2;
        $inviteRewards = [];
        $tradeNo = 'giftcard:' . $this->code->id . ':' . $this->user->id;

        if (isset($rewards['balance']) && $rewards['balance'] > 0) {
            $totalPool = (int) round($rewards['balance'] * $rate);
            if ($totalPool > 0) {
                $paid = $this->distributeInviteRewardPool(
                    (int) $this->user->invite_user_id,
                    $totalPool,
                    (int) $rewards['balance'],
                    $tradeNo
                );
                if ($paid > 0) {
                    $inviteRewards['balance'] = $paid;
                }
            }
        }

        $inviteUser = User::where('id', $this->user->invite_user_id)->lockForUpdate()->first();
        if ($inviteUser && !$inviteUser->banned
            && isset($rewards['transfer_enable']) && $rewards['transfer_enable'] > 0) {
            $totalTrafficPool = (int) round($rewards['transfer_enable'] * $rate);
            if ($totalTrafficPool > 0) {
                $paidTraffic = $this->distributeInviteTrafficPool(
                    (int) $this->user->invite_user_id,
                    $totalTrafficPool,
                    $tradeNo
                );
                if ($paidTraffic > 0) {
                    $inviteRewards['transfer_enable'] = $paidTraffic;
                }
            }
        }

        return $inviteRewards ?: null;
    }

    protected function shouldPayGiftCardInviteCommission(): bool
    {
        if (!$this->user->invite_user_id) {
            return false;
        }
        $inviter = User::find($this->user->invite_user_id);
        if (!$inviter || $inviter->banned) {
            return false;
        }

        $commissionType = (int) $inviter->commission_type;
        if ($commissionType === User::COMMISSION_TYPE_SYSTEM) {
            $commissionType = (bool) admin_setting('commission_first_time_enable', true)
                ? User::COMMISSION_TYPE_ONETIME
                : User::COMMISSION_TYPE_PERIOD;
        }
        if ($commissionType === User::COMMISSION_TYPE_PERIOD) {
            return true;
        }

        return !OnetimeCommission::consumedByUser((int) $this->user->id);
    }

    protected function shouldHoldGiftCardCommission(): bool
    {
        return (bool) admin_setting('commission_auto_check_enable', 1);
    }

    protected function recordGiftCardCommission(int $inviteUserId, int $orderAmount, string $tradeNo, int $payAmount, User $inviter): void
    {
        if (
            CommissionLog::where('trade_no', $tradeNo)
                ->where('invite_user_id', $inviteUserId)
                ->where('get_amount', $payAmount)
                ->exists()
        ) {
            return;
        }
        $now = time();
        $hold = $this->shouldHoldGiftCardCommission();
        $userService = app(UserService::class);
        $creditedAt = $hold ? null : $now;
        if (!$hold) {
            $this->creditInviteReward($userService, $inviter, $payAmount);
        }
        CommissionLog::create([
            'invite_user_id' => $inviteUserId,
            'user_id' => $this->user->id,
            'trade_no' => $tradeNo,
            'order_amount' => $orderAmount,
            'get_amount' => $payAmount,
            'credited_at' => $creditedAt,
        ]);
    }

    protected function distributeInviteRewardPool(
        int $inviteUserId,
        int $totalPool,
        int $orderAmount,
        string $tradeNo
    ): int {
        $shareLevels = CommissionChain::shareLevels();
        $remaining = $totalPool;
        $paidTotal = 0;
        $currentInviteId = $inviteUserId;

        for ($level = 0; $level < 3; $level++) {
            if ($remaining <= 0) {
                break;
            }
            $inviter = User::where('id', $currentInviteId)->lockForUpdate()->first();
            if (!$inviter || $inviter->banned) {
                break;
            }
            if (!isset($shareLevels[$level])) {
                $currentInviteId = (int) ($inviter->invite_user_id ?? 0);
                continue;
            }
            $share = (int) round($totalPool * ($shareLevels[$level] / 100));
            $payAmount = min(max(0, $share), $remaining);
            if ($payAmount <= 0) {
                $currentInviteId = (int) ($inviter->invite_user_id ?? 0);
                continue;
            }

            $this->recordGiftCardCommission($currentInviteId, $orderAmount, $tradeNo, $payAmount, $inviter);
            $paidTotal += $payAmount;
            $remaining -= $payAmount;
            $currentInviteId = (int) ($inviter->invite_user_id ?? 0);
        }

        if ($remaining > 0) {
            $directInviter = User::where('id', $this->user->invite_user_id)->lockForUpdate()->first();
            if ($directInviter && !$directInviter->banned) {
                $this->recordGiftCardCommission($directInviter->id, $orderAmount, $tradeNo, $remaining, $directInviter);
                $paidTotal += $remaining;
            }
        }

        return $paidTotal;
    }

    protected function recordGiftCardTraffic(int $inviteUserId, string $tradeNo, int $trafficBytes, User $inviter): void
    {
        if ($trafficBytes <= 0) {
            return;
        }
        if (
            CommissionLog::where('trade_no', $tradeNo)
                ->where('invite_user_id', $inviteUserId)
                ->where('get_amount', 0)
                ->where('order_amount', $trafficBytes)
                ->exists()
        ) {
            return;
        }
        $hold = $this->shouldHoldGiftCardCommission();
        $now = time();
        CommissionLog::create([
            'invite_user_id' => $inviteUserId,
            'user_id' => $this->user->id,
            'trade_no' => $tradeNo,
            'order_amount' => $trafficBytes,
            'get_amount' => 0,
            'credited_at' => $hold ? null : $now,
        ]);
        if (!$hold) {
            self::creditTrafficToInviter($inviter, $trafficBytes);
        }
    }

    public static function creditTrafficToInviter(User $inviter, int $bytes): void
    {
        if ($bytes <= 0) {
            return;
        }
        $inviter->transfer_enable = ($inviter->transfer_enable ?? 0) + $bytes;
        if (!$inviter->save()) {
            throw new \RuntimeException('Failed to add invite reward traffic');
        }
    }

    protected function distributeInviteTrafficPool(int $inviteUserId, int $totalPool, string $tradeNo): int
    {
        $shareLevels = CommissionChain::shareLevels();
        $remaining = $totalPool;
        $paidTotal = 0;
        $currentInviteId = $inviteUserId;

        for ($level = 0; $level < 3; $level++) {
            if ($remaining <= 0) {
                break;
            }
            $inviter = User::where('id', $currentInviteId)->lockForUpdate()->first();
            if (!$inviter || $inviter->banned) {
                break;
            }
            if (!isset($shareLevels[$level])) {
                $currentInviteId = (int) ($inviter->invite_user_id ?? 0);
                continue;
            }
            $share = (int) round($totalPool * ($shareLevels[$level] / 100));
            $payAmount = min(max(0, $share), $remaining);
            if ($payAmount <= 0) {
                $currentInviteId = (int) ($inviter->invite_user_id ?? 0);
                continue;
            }

            $this->recordGiftCardTraffic($currentInviteId, $tradeNo, $payAmount, $inviter);
            $paidTotal += $payAmount;
            $remaining -= $payAmount;
            $currentInviteId = (int) ($inviter->invite_user_id ?? 0);
        }

        if ($remaining > 0) {
            $directInviter = User::where('id', $this->user->invite_user_id)->lockForUpdate()->first();
            if ($directInviter && !$directInviter->banned) {
                $this->recordGiftCardTraffic($directInviter->id, $tradeNo, $remaining, $directInviter);
                $paidTotal += $remaining;
            }
        }

        return $paidTotal;
    }

    public static function creditCommissionToInviter(User $inviter, int $amount): void
    {
        if ($amount <= 0) {
            return;
        }
        $userService = app(UserService::class);
        if ((int) admin_setting('withdraw_close_enable', 0)) {
            if (!$userService->addBalance($inviter->id, $amount)) {
                throw new \RuntimeException('Failed to add invite reward balance');
            }
            return;
        }
        $inviter->increment('commission_balance', $amount);
        if (!$inviter->save()) {
            throw new \RuntimeException('Failed to add invite reward commission');
        }
    }

    protected function creditInviteReward(UserService $userService, User $inviter, int $amount): void
    {
        if ($amount <= 0) {
            return;
        }
        self::creditCommissionToInviter($inviter, $amount);
    }

    /**
     * 计算倍率
     */
    protected function calculateMultiplier(): float
    {
        return $this->getFestivalBonus();
    }

    /**
     * 获取节日加成倍率
     */
    private function getFestivalBonus(): float
    {
        $festivalConfig = $this->template->special_config ?? [];
        $now = time();

        if (
            isset($festivalConfig['start_time'], $festivalConfig['end_time']) &&
            $now >= $festivalConfig['start_time'] &&
            $now <= $festivalConfig['end_time']
        ) {
            return $festivalConfig['festival_bonus'] ?? 1.0;
        }

        return 1.0;
    }

    /**
     * 获取兑换码信息（不包含敏感信息）
     */
    public function getCodeInfo(): array
    {
        $info = [
            'code' => $this->code->code,
            'template' => [
                'name' => $this->template->name,
                'description' => $this->template->description,
                'type' => $this->template->type,
                'type_name' => $this->template->type_name,
                'icon' => $this->template->icon,
                'background_image' => $this->template->background_image,
                'theme_color' => $this->template->theme_color,
            ],
            'status' => $this->code->status,
            'status_name' => $this->code->status_name,
            'expires_at' => $this->code->expires_at,
            'usage_count' => $this->code->usage_count,
            'max_usage' => $this->code->max_usage,
        ];
        if ($this->template->type === GiftCardTemplate::TYPE_PLAN) {
            $plan = Plan::find($this->code->template->rewards['plan_id']);
            if ($plan) {
                $info['plan_info'] = PlanResource::make($plan)->toArray(request());
            }
        }
        return $info;
    }

    /**
     * 预览奖励（不实际发放）
     */
    public function previewRewards(): array
    {
        if (!$this->user) {
            throw new ApiException(__('Redemption user is not set'));
        }

        if ($this->template->type === GiftCardTemplate::TYPE_MYSTERY) {
            $pool = $this->template->rewards['random_rewards'] ?? [];

            return [
                'type' => 'mystery',
                'pool_size' => count($pool),
            ];
        }

        return $this->template->calculateActualRewards($this->user);
    }

    /**
     * 获取兑换码
     */
    public function getCode(): GiftCardCode
    {
        return $this->code;
    }

    /**
     * 获取模板
     */
    public function getTemplate(): GiftCardTemplate
    {
        return $this->template;
    }

    /**
     * 记录日志
     */
    protected function logUsage(string $action, array $data = []): void
    {
        Log::info('礼品卡使用记录', [
            'action' => $action,
            'code' => $this->code->code,
            'template_id' => $this->template->id,
            'user_id' => $this->user?->id,
            'data' => $data,
            'ip' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
