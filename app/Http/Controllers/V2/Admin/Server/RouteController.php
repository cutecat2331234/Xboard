<?php

namespace App\Http\Controllers\V2\Admin\Server;

use App\Http\Controllers\Controller;
use App\Models\ServerRoute;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RouteController extends Controller
{
    public function fetch(Request $request)
    {
        $routes = ServerRoute::get();
        return $this->success($routes);
    }

    public function save(Request $request)
    {
        $params = $request->validate([
            'remarks' => 'required',
            'match' => 'required|array',
            'action' => 'required|in:block,direct,dns,proxy',
            'action_value' => 'nullable'
        ], [
            'remarks.required' => __('Remarks cannot be empty'),
            'match.required' => __('Match value cannot be empty'),
            'action.required' => __('Action type cannot be empty'),
            'action.in' => __('Invalid action type'),
        ]);
        $params['match'] = array_filter($params['match']);
        if ($request->input('id')) {
            try {
                return DB::transaction(function () use ($request, $params) {
                    $route = ServerRoute::where('id', $request->input('id'))->lockForUpdate()->first();
                    if (!$route) {
                        return $this->fail([404, __('Route does not exist')]);
                    }
                    $route->update($params);
                    return $this->success(true);
                });
            } catch (\Exception $e) {
                Log::error($e);
                return $this->fail([500, __('Save failed')]);
            }
        }
        try {
            ServerRoute::create($params);
            return $this->success(true);
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Create failed')]);
        }
    }

    public function drop(Request $request)
    {
        try {
            return DB::transaction(function () use ($request) {
                $route = ServerRoute::where('id', $request->input('id'))->lockForUpdate()->first();
                if (!$route) {
                    return $this->fail([404, __('Route does not exist')]);
                }
                if (!$route->delete()) {
                    return $this->fail([500, __('Delete failed')]);
                }
                return $this->success(true);
            });
        } catch (\Exception $e) {
            Log::error($e);
            return $this->fail([500, __('Delete failed')]);
        }
    }
}
