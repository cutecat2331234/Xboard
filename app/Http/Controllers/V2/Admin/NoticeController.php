<?php

namespace App\Http\Controllers\V2\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\NoticeSave;
use App\Models\Notice;
use App\Utils\Helper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NoticeController extends Controller
{
    public function fetch(Request $request)
    {
        $query = Notice::orderBy('sort', 'ASC')->orderBy('id', 'DESC');

        if ($request->filled('title')) {
            $title = (string) $request->input('title');
            $query->where('title', 'like', '%' . $title . '%');
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

    public function save(NoticeSave $request)
    {
        $data = $request->only([
            'title',
            'content',
            'img_url',
            'tags',
            'show',
            'popup'
        ]);
        if (!$request->input('id')) {
            if (!Notice::create($data)) {
                return $this->fail([500, __('Save failed')]);
            }
        } else {
            $notice = Notice::find($request->input('id'));
            if (!$notice) {
                return $this->fail([404, __('Notice does not exist')]);
            }
            try {
                $notice->update($data);
            } catch (\Exception $e) {
                return $this->fail([500, __('Save failed')]);
            }
        }
        return $this->success(true);
    }

    public function update(NoticeSave $request)
    {
        return $this->save($request);
    }

    public function show(Request $request)
    {
        if (empty($request->input('id'))) {
            return $this->fail([500, __('Notice ID cannot be empty')]);
        }
        $notice = Notice::find($request->input('id'));
        if (!$notice) {
            return $this->fail([400202, __('Notice does not exist')]);
        }
        $notice->show = $notice->show ? 0 : 1;
        if (!$notice->save()) {
            return $this->fail([500, __('Save failed')]);
        }

        return $this->success(true);
    }

    public function drop(Request $request)
    {
        if (empty($request->input('id'))) {
            return $this->fail([422, __('Notice ID cannot be empty')]);
        }
        $notice = Notice::find($request->input('id'));
        if (!$notice) {
            return $this->fail([400202, __('Notice does not exist')]);
        }
        if (!$notice->delete()) {
            return $this->fail([500, __('Delete failed')]);
        }
        return $this->success(true);
    }

    public function sort(Request $request)
    {
        $params = $request->validate([
            'ids' => 'required|array'
        ], [
            'ids.required' => __('Invalid parameters'),
            'ids.array' => __('Invalid parameters'),
        ]);

        try {
            DB::beginTransaction();
            foreach ($params['ids'] as $k => $v) {
                $notice = Notice::findOrFail($v);
                $notice->update(['sort' => $k + 1]);
            }
            DB::commit();
            return $this->success(true);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error($e);
            return $this->fail([500, __('Sort save failed')]);
        }
    }
}
