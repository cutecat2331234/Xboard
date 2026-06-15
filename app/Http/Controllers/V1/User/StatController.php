<?php

namespace App\Http\Controllers\V1\User;

use App\Http\Controllers\Controller;
use App\Http\Resources\TrafficLogResource;
use App\Models\StatUser;
use App\Support\AppFeature;
use App\Services\StatisticalService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StatController extends Controller
{
    public function getTrafficLog(Request $request)
    {
        if (!AppFeature::trafficLogEnabled()) {
            return $this->fail([403, __('Feature is disabled')]);
        }

        $startDate = now()->startOfMonth()->timestamp;
        $records = StatUser::query()
            ->where('user_id', $request->user()->id)
            ->where('record_at', '>=', $startDate)
            ->orderBy('record_at', 'DESC')
            ->limit(31)
            ->get();

        $data = TrafficLogResource::collection(collect($records));
        return $this->success($data);
    }
}
