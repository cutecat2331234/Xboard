<?php

namespace App\Http\Controllers\V2\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Services\ThemeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class ThemeController extends Controller
{
    private $themeService;

    public function __construct(ThemeService $themeService)
    {
        $this->themeService = $themeService;
    }

    /**
     * 上传新主题
     *
     * @throws ApiException
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:zip',
                'max:10240',
            ]
        ], [
            'file.required' => __('Theme package file is required'),
            'file.file' => __('Invalid file type'),
            'file.mimes' => __('Theme package must be a zip file'),
            'file.max' => __('Theme package must not exceed 10MB'),
        ]);

        try {
            $uploadPath = storage_path('tmp');
            if (!File::exists($uploadPath)) {
                File::makeDirectory($uploadPath, 0755, true);
            }

            if (!is_writable($uploadPath)) {
                throw new ApiException(__('Upload directory is not writable'));
            }

            $themePath = base_path('theme');
            if (!is_writable($themePath)) {
                throw new ApiException(__('Theme directory is not writable'));
            }

            $file = $request->file('file');

            $mimeType = $file->getMimeType();
            if (!in_array($mimeType, ['application/zip', 'application/x-zip-compressed'])) {
                throw new ApiException(__('Invalid file type, only ZIP is supported'));
            }

            $originalName = $file->getClientOriginalName();
            if (!preg_match('/^[a-zA-Z0-9\-\_\.]+\.zip$/', $originalName)) {
                throw new ApiException(__('Theme package filename may only contain letters, numbers, underscores, hyphens, and dots'));
            }

            $this->themeService->upload($file);
            return $this->success(true);

        } catch (ApiException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Theme upload failed', [
                'error' => $e->getMessage(),
                'file' => $request->file('file')?->getClientOriginalName()
            ]);
            throw new ApiException(__('Theme upload failed: :error', ['error' => $e->getMessage()]));
        }
    }

    public function delete(Request $request)
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'regex:/^[a-zA-Z0-9_\-]+$/'],
        ]);
        $this->themeService->delete($payload['name']);
        return $this->success(true);
    }

    public function getThemes()
    {
        $data = [
            'themes' => $this->themeService->getList(),
            'active' => admin_setting('frontend_theme', 'Xboard')
        ];
        return $this->success($data);
    }

    public function switchTheme(Request $request)
    {
        $payload = $request->validate([
            'name' => 'required'
        ]);
        $this->themeService->switch($payload['name']);
        return $this->success(true);
    }

    public function getThemeConfig(Request $request)
    {
        $payload = $request->validate([
            'name' => 'required'
        ]);
        $data = $this->themeService->getConfig($payload['name']);
        return $this->success($data);
    }

    public function saveThemeConfig(Request $request)
    {
        $payload = $request->validate([
            'name' => 'required',
            'config' => 'required'
        ]);
        $this->themeService->updateConfig($payload['name'], $payload['config']);
        $config = $this->themeService->getConfig($payload['name']);
        return $this->success($config);
    }
}
