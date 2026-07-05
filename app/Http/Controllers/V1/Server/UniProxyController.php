<?php

namespace App\Http\Controllers\V1\Server;

use App\Http\Controllers\Controller;
use App\Services\DeviceStateService;
use App\Services\ServerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\JsonResponse;

class UniProxyController extends Controller
{
    public function __construct(
        private readonly DeviceStateService $deviceStateService
    ) {
    }

    private function getNodeInfo(Request $request)
    {
        return $request->attributes->get('node_info');
    }

    public function user(Request $request)
    {
        ini_set('memory_limit', -1);
        $node = $this->getNodeInfo($request);

        ServerService::touchNode($node);

        $response['users'] = ServerService::getAvailableUsers($node);

        $eTag = sha1(json_encode($response));
        if (str_contains($request->header('If-None-Match', ''), $eTag)) {
            return response(null, 304);
        }

        return response($response)->header('ETag', "\"{$eTag}\"");
    }

    public function push(Request $request)
    {
        $res = json_decode(request()->getContent(), true);
        if (!is_array($res)) {
            return $this->fail([422, __('Invalid data format')]);
        }

        $node = $this->getNodeInfo($request);

        ServerService::processTraffic($node, $res);

        return $this->success(true);
    }

    public function config(Request $request)
    {
        $node = $this->getNodeInfo($request);
        $response = ServerService::buildNodeConfig($node);

        $response['base_config'] = [
            'push_interval' => (int) admin_setting('server_push_interval', 60),
            'pull_interval' => (int) admin_setting('server_pull_interval', 60)
        ];

        $eTag = sha1(json_encode($response));
        if (str_contains($request->header('If-None-Match', ''), $eTag)) {
            return response(null, 304);
        }
        return response($response)->header('ETag', "\"{$eTag}\"");
    }

    public function alivelist(Request $request): JsonResponse
    {
        $node = $this->getNodeInfo($request);
        $deviceLimitUsers = ServerService::getAvailableUsers($node)
            ->where('device_limit', '>', 0);

        $alive = $this->deviceStateService->getAliveList(collect($deviceLimitUsers));

        return response()->json(['alive' => (object) $alive]);
    }

    public function alive(Request $request): JsonResponse
    {
        $node = $this->getNodeInfo($request);
        $data = json_decode(request()->getContent(), true);
        if (!is_array($data)) {
            return response()->json(['error' => __('Invalid online data')], 400);
        }

        ServerService::processAlive($node, $data);

        return response()->json(['data' => true]);
    }

    public function status(Request $request): JsonResponse
    {
        $node = $this->getNodeInfo($request);

        $data = $request->validate([
            'cpu' => 'required|numeric|min:0|max:100',
            'mem.total' => 'required|integer|min:0',
            'mem.used' => 'required|integer|min:0',
            'swap.total' => 'required|integer|min:0',
            'swap.used' => 'required|integer|min:0',
            'disk.total' => 'required|integer|min:0',
            'disk.used' => 'required|integer|min:0',
        ], [
            'cpu.required' => __('CPU usage is required'),
            'cpu.numeric' => __('CPU usage format is invalid'),
            'cpu.min' => __('CPU usage format is invalid'),
            'cpu.max' => __('CPU usage format is invalid'),
            'mem.total.required' => __('Memory total is required'),
            'mem.total.integer' => __('Memory total format is invalid'),
            'mem.total.min' => __('Memory total format is invalid'),
            'mem.used.required' => __('Memory used is required'),
            'mem.used.integer' => __('Memory used format is invalid'),
            'mem.used.min' => __('Memory used format is invalid'),
            'swap.total.required' => __('Swap total is required'),
            'swap.total.integer' => __('Swap total format is invalid'),
            'swap.total.min' => __('Swap total format is invalid'),
            'swap.used.required' => __('Swap used is required'),
            'swap.used.integer' => __('Swap used format is invalid'),
            'swap.used.min' => __('Swap used format is invalid'),
            'disk.total.required' => __('Disk total is required'),
            'disk.total.integer' => __('Disk total format is invalid'),
            'disk.total.min' => __('Disk total format is invalid'),
            'disk.used.required' => __('Disk used is required'),
            'disk.used.integer' => __('Disk used format is invalid'),
            'disk.used.min' => __('Disk used format is invalid'),
        ]);

        ServerService::processStatus($node, $data);

        return response()->json(['data' => true, 'code' => 0, 'message' => 'success']);
    }
}
