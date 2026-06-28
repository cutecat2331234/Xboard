<?php

namespace App\Http\Controllers\V2\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CouponGenerate;
use App\Http\Requests\Admin\CouponSave;
use App\Models\Coupon;
use App\Utils\Helper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Traits\SafeQueryColumns;

class CouponController extends Controller
{
    use SafeQueryColumns;

    private const QUERY_COLUMNS = [
        'id', 'code', 'name', 'type', 'value', 'show', 'started_at', 'ended_at',
        'created_at', 'updated_at', 'limit_use', 'limit_plan_ids', 'limit_period',
    ];

    private function applyFiltersAndSorts(Request $request, $builder)
    {
        if ($request->has('filter')) {
            collect($request->input('filter'))->each(function ($filter) use ($builder) {
                $key = $this->resolveFilterField((string) ($filter['id'] ?? ''), self::QUERY_COLUMNS);
                if (!$key) {
                    return;
                }
                $value = $filter['value'];
                $builder->where(function ($query) use ($key, $value) {
                    if (is_array($value)) {
                        $query->whereIn($key, $value);
                    } else {
                        $query->where($key, 'like', "%{$value}%");
                    }
                });
            });
        }

        if ($request->has('sort')) {
            collect($request->input('sort'))->each(function ($sort) use ($builder) {
                $key = $this->resolveSortField((string) ($sort['id'] ?? ''), self::QUERY_COLUMNS);
                if (!$key) {
                    return;
                }
                $value = $sort['desc'] ? 'DESC' : 'ASC';
                $builder->orderBy($key, $value);
            });
        }
    }
    public function fetch(Request $request)
    {
        [$current, $pageSize] = Helper::paginateParams(
            $request->input('current', 1),
            $request->input('pageSize', 10)
        );
        $builder = Coupon::query();
        $this->applyFiltersAndSorts($request, $builder);
        $coupons = $builder
            ->orderBy('created_at', 'desc')
            ->paginate($pageSize, ["*"], 'page', $current);
        return $this->paginate($coupons);
    }

    public function update(Request $request)
    {
        $params = $request->validate([
            'id' => 'required|numeric',
            'show' => 'nullable|boolean'
        ], [
            'id.required' => __('Coupon ID cannot be empty'),
            'id.numeric' => __('Coupon ID must be numeric'),
        ]);
        try {
            DB::beginTransaction();
            $coupon = Coupon::where('id', $request->input('id'))->lockForUpdate()->first();
            if (!$coupon) {
                throw new ApiException(__('Coupon does not exist'), 400201);
            }
            $coupon->update($params);
            DB::commit();
            return $this->success(true);
        } catch (ApiException $e) {
            DB::rollBack();
            return $this->fail([$e->getCode(), $e->getMessage()]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error($e);
            return $this->fail([500, __('Save failed')]);
        }
    }

    public function show(Request $request)
    {
        $request->validate([
            'id' => 'required|numeric'
        ], [
            'id.required' => __('Coupon ID cannot be empty'),
            'id.numeric' => __('Coupon ID must be numeric'),
        ]);
        try {
            return DB::transaction(function () use ($request) {
                $coupon = Coupon::where('id', $request->input('id'))->lockForUpdate()->first();
                if (!$coupon) {
                    return $this->fail([400202, __('Coupon does not exist')]);
                }
                $coupon->show = !$coupon->show;
                if (!$coupon->save()) {
                    return $this->fail([500, __('Save failed')]);
                }
                return $this->success(true);
            });
        } catch (\Exception $e) {
            \Log::error($e);
            return $this->fail([500, __('Save failed')]);
        }
    }

    public function generate(CouponGenerate $request)
    {
        if ($request->input('generate_count')) {
            return $this->multiGenerate($request);
        }

        $params = $request->validated();
        if (!$request->input('id')) {
            if (!isset($params['code'])) {
                $params['code'] = Helper::randomChar(8);
            }
            if (!Coupon::create($params)) {
                return $this->fail([500, __('Create failed')]);
            }
        } else {
            try {
                return DB::transaction(function () use ($request, $params) {
                    $coupon = Coupon::where('id', $request->input('id'))->lockForUpdate()->first();
                    if (!$coupon) {
                        return $this->fail([400202, __('Coupon does not exist')]);
                    }
                    $coupon->update($params);
                    return $this->success(true);
                });
            } catch (\Exception $e) {
                \Log::error($e);
                return $this->fail([500, __('Save failed')]);
            }
        }

        return $this->success(true);
    }

    private function multiGenerate(CouponGenerate $request)
    {
        $coupons = [];
        $coupon = $request->validated();
        $coupon['created_at'] = $coupon['updated_at'] = time();
        $coupon['show'] = 1;
        unset($coupon['generate_count']);
        for ($i = 0; $i < $request->input('generate_count'); $i++) {
            $coupon['code'] = Helper::randomChar(8);
            array_push($coupons, $coupon);
        }
        try {
            DB::beginTransaction();
            if (
                !Coupon::insert(array_map(function ($item) use ($coupon) {
                    // format data
                    if (isset($item['limit_plan_ids']) && is_array($item['limit_plan_ids'])) {
                        $item['limit_plan_ids'] = json_encode($item['limit_plan_ids']);
                    }
                    if (isset($item['limit_period']) && is_array($item['limit_period'])) {
                        $item['limit_period'] = json_encode($item['limit_period']);
                    }
                    return $item;
                }, $coupons))
            ) {
                throw new \Exception();
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->fail([500, __('Generation failed')]);
        }

        return response()->streamDownload(function () use ($coupons) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));
            fputcsv($handle, [
                __('csv.coupon.name'),
                __('csv.coupon.type'),
                __('csv.coupon.value'),
                __('csv.coupon.started_at'),
                __('csv.coupon.ended_at'),
                __('csv.coupon.limit_use'),
                __('csv.coupon.limit_plans'),
                __('csv.coupon.code'),
                __('csv.coupon.created_at'),
            ]);
            $typeLabels = ['', __('coupon.type.amount'), __('coupon.type.percent')];
            foreach ($coupons as $coupon) {
                $type = $typeLabels[$coupon['type']] ?? '';
                $value = ['', ($coupon['value'] / 100), $coupon['value']][$coupon['type']];
                $startTime = date('Y-m-d H:i:s', $coupon['started_at']);
                $endTime = date('Y-m-d H:i:s', $coupon['ended_at']);
                $limitUse = ($coupon['limit_use'] ?? null) === null ? __('Unlimited') : $coupon['limit_use'];
                $createTime = date('Y-m-d H:i:s', $coupon['created_at']);
                $limitPlanIds = isset($coupon['limit_plan_ids']) && is_array($coupon['limit_plan_ids'])
                    ? implode('/', $coupon['limit_plan_ids'])
                    : __('Unlimited');
                fputcsv($handle, [
                    Helper::csvSafe($coupon['name']),
                    Helper::csvSafe($type),
                    Helper::csvSafe($value),
                    Helper::csvSafe($startTime),
                    Helper::csvSafe($endTime),
                    Helper::csvSafe($limitUse),
                    Helper::csvSafe($limitPlanIds),
                    Helper::csvSafe($coupon['code']),
                    Helper::csvSafe($createTime),
                ]);
            }
            fclose($handle);
        }, 'coupons.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function drop(Request $request)
    {
        $request->validate([
            'id' => 'required|numeric'
        ], [
            'id.required' => __('Coupon ID cannot be empty'),
            'id.numeric' => __('Coupon ID must be numeric'),
        ]);
        try {
            return DB::transaction(function () use ($request) {
                $coupon = Coupon::where('id', $request->input('id'))->lockForUpdate()->first();
                if (!$coupon) {
                    return $this->fail([400202, __('Coupon does not exist')]);
                }
                if (!$coupon->delete()) {
                    return $this->fail([500, __('Delete failed')]);
                }

                return $this->success(true);
            });
        } catch (\Exception $e) {
            \Log::error($e);
            return $this->fail([500, __('Delete failed')]);
        }
    }
}
