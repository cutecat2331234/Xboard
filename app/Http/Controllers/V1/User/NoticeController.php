<?php

namespace App\Http\Controllers\V1\User;

use App\Http\Controllers\Controller;
use App\Models\Notice;
use App\Support\AppFeature;
use App\Utils\Helper;
use Illuminate\Http\Request;

class NoticeController extends Controller
{
    public function fetch(Request $request)
    {
        if (!AppFeature::announcementsEnabled()) {
            return response(['data' => [], 'total' => 0]);
        }

        [$current, $pageSize] = Helper::paginateParams(
            $request->input('current'),
            $request->input('pageSize', $request->input('page_size', 20))
        );
        $model = Notice::orderBy('sort', 'ASC')
            ->orderBy('id', 'DESC')
            ->where('show', true);
        $total = $model->count();
        $res = $model->forPage($current, $pageSize)
            ->get();
        return response([
            'data' => $res,
            'total' => $total
        ]);
    }
}
