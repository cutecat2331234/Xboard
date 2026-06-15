<?php

namespace App\Http\Controllers\V2\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\KnowledgeSave;
use App\Http\Requests\Admin\KnowledgeSort;
use App\Models\Knowledge;
use App\Utils\Helper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KnowledgeController extends Controller
{
    public function fetch(Request $request)
    {
        if ($request->input('id')) {
            $knowledge = Knowledge::find($request->input('id'));
            if (!$knowledge) {
                return $this->fail([400202, __('Article does not exist')]);
            }
            return $this->success($knowledge->toArray());
        }
        $query = Knowledge::select(['title', 'id', 'updated_at', 'category', 'show'])
            ->orderBy('sort', 'ASC');

        if ($request->filled('title')) {
            $title = (string) $request->input('title');
            $query->where('title', 'like', '%' . $title . '%');
        }

        if ($request->filled('category')) {
            $query->where('category', (string) $request->input('category'));
        }

        if ($request->filled('current') || $request->filled('pageSize')) {
            [$current, $pageSize] = Helper::paginateParams(
                $request->input('current'),
                $request->input('pageSize', 20)
            );

            return $this->paginate($query->paginate($pageSize, ['*'], 'page', $current));
        }

        return $this->success($query->limit(500)->get());
    }

    public function getCategory(Request $request)
    {
        return $this->success(
            Knowledge::query()->distinct()->orderBy('category')->pluck('category')->filter()->values()
        );
    }

    public function save(KnowledgeSave $request)
    {
        $params = $request->validated();

        if (!$request->input('id')) {
            if (!Knowledge::create($params)) {
                return $this->fail([500, __('Create failed')]);
            }
        } else {
            $knowledge = Knowledge::find($request->input('id'));
            if (!$knowledge) {
                return $this->fail([400202, __('Article does not exist')]);
            }
            try {
                $knowledge->update($params);
            } catch (\Exception $e) {
                \Log::error($e);
                return $this->fail([500, __('Create failed')]);
            }
        }

        return $this->success(true);
    }

    public function show(Request $request)
    {
        $request->validate([
            'id' => 'required|numeric'
        ], [
            'id.required' => '知识库ID不能为空'
        ]);
        $knowledge = Knowledge::find($request->input('id'));
        if (!$knowledge) {
            throw new ApiException(__('Article does not exist'));
        }
        $knowledge->show = !$knowledge->show;
        if (!$knowledge->save()) {
            throw new ApiException(__('Save failed'));
        }

        return $this->success(true);
    }

    public function sort(Request $request)
    {
        $request->validate([
            'ids' => 'required|array'
        ], [
            'ids.required' => '参数有误',
            'ids.array' => '参数有误'
        ]);
        try {
            DB::beginTransaction();
            foreach ($request->input('ids') as $k => $v) {
                $knowledge = Knowledge::findOrFail($v);
                $knowledge->timestamps = false;
                $knowledge->update(['sort' => $k + 1]);
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            throw new ApiException(__('Save failed'));
        }
        return $this->success(true);
    }

    public function drop(Request $request)
    {
        $request->validate([
            'id' => 'required|numeric'
        ], [
            'id.required' => '知识库ID不能为空'
        ]);
        $knowledge = Knowledge::find($request->input('id'));
        if (!$knowledge) {
            return $this->fail([400202, __('Article does not exist')]);
        }
        if (!$knowledge->delete()) {
            return $this->fail([500, __('Delete failed')]);
        }

        return $this->success(true);
    }
}
