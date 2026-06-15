<?php

namespace App\Http\Controllers\V2\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plugin;
use App\Services\Plugin\PluginManager;
use App\Services\Plugin\PluginConfigService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class PluginController extends Controller
{
    protected PluginManager $pluginManager;
    protected PluginConfigService $configService;

    public function __construct(
        PluginManager $pluginManager,
        PluginConfigService $configService
    ) {
        $this->pluginManager = $pluginManager;
        $this->configService = $configService;
    }

    /**
     * 获取所有插件类型
     */
    public function types()
    {
        return response()->json([
            'data' => [
                [
                    'value' => Plugin::TYPE_FEATURE,
                    'label' => '功能',
                    'description' => '提供功能扩展的插件，如Telegram登录、邮件通知等',
                    'icon' => '🔧'
                ],
                [
                    'value' => Plugin::TYPE_PAYMENT,
                    'label' => '支付方式',
                    'description' => '提供支付接口的插件，如支付宝、微信支付等',
                    'icon' => '💳'
                ]
            ]
        ]);
    }

    /**
     * 获取插件列表
     */
    public function index(Request $request)
    {
        $type = $request->query('type');

        $installedPlugins = Plugin::when($type, function ($query) use ($type) {
            return $query->byType($type);
        })
            ->get()
            ->keyBy('code')
            ->toArray();

        $plugins = [];
        $seenCodes = [];

        foreach ($this->pluginManager->getPluginPaths() as $pluginPath) {
            if (!File::exists($pluginPath)) {
                continue;
            }
            $directories = File::directories($pluginPath);
            foreach ($directories as $directory) {
                $configFile = $directory . '/config.json';
                if (!File::exists($configFile)) {
                    continue;
                }
                $config = json_decode(File::get($configFile), true);
                if (!$config || !isset($config['code'])) {
                    continue;
                }
                $code = $config['code'];

                if (isset($seenCodes[$code])) {
                    continue;
                }
                $seenCodes[$code] = true;

                $pluginType = $config['type'] ?? Plugin::TYPE_FEATURE;
                if ($type && $pluginType !== $type) {
                    continue;
                }

                $installed = isset($installedPlugins[$code]);
                $pluginConfig = $installed ? $this->configService->getConfig($code) : ($config['config'] ?? []);
                $readmeFile = collect(['README.md', 'readme.md'])
                    ->map(fn($f) => $directory . '/' . $f)
                    ->first(fn($path) => File::exists($path));
                $readmeContent = $readmeFile ? File::get($readmeFile) : '';
                $needUpgrade = false;
                if ($installed) {
                    $installedVersion = $installedPlugins[$code]['version'] ?? null;
                    $localVersion = $config['version'] ?? null;
                    if ($installedVersion && $localVersion && version_compare($localVersion, $installedVersion, '>')) {
                        $needUpgrade = true;
                    }
                }
                $isCore = $this->pluginManager->isCorePlugin($code);
                $plugins[] = [
                    'code' => $config['code'],
                    'name' => $config['name'],
                    'version' => $config['version'],
                    'description' => $config['description'],
                    'author' => $config['author'],
                    'type' => $pluginType,
                    'is_installed' => $installed,
                    'is_enabled' => $installed ? $installedPlugins[$code]['is_enabled'] : false,
                    'is_protected' => $isCore,
                    'can_be_deleted' => !$isCore,
                    'config' => $pluginConfig,
                    'readme' => $readmeContent,
                    'need_upgrade' => $needUpgrade,
                    'admin_menus' => $config['admin_menus'] ?? null,
                    'admin_crud' => $config['admin_crud'] ?? null,
                ];
            }
        }

        return response()->json([
            'data' => $plugins
        ]);
    }

    /**
     * 安装插件
     */
    public function install(Request $request)
    {
        $request->validate([
            'code' => 'required|string'
        ]);

        try {
            $this->pluginManager->install($request->input('code'));
            return response()->json([
                'message' => __('Plugin installed successfully'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => __('Plugin install failed: :error', ['error' => $e->getMessage()]),
            ], 400);
        }
    }

    /**
     * 卸载插件
     */
    public function uninstall(Request $request)
    {
        $request->validate([
            'code' => 'required|string'
        ]);

        $code = $request->input('code');
        $plugin = Plugin::where('code', $code)->first();
        if ($plugin && $plugin->is_enabled) {
            return response()->json([
                'message' => __('Disable the plugin before uninstalling'),
            ], 400);
        }

        try {
            $this->pluginManager->uninstall($code);
            return response()->json([
                'message' => __('Plugin uninstalled successfully'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => __('Plugin uninstall failed: :error', ['error' => $e->getMessage()]),
            ], 400);
        }
    }

    /**
     * 升级插件
     */
    public function upgrade(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
        ]);
        try {
            $this->pluginManager->update($request->input('code'));
            return response()->json([
                'message' => __('Plugin upgraded successfully'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => __('Plugin upgrade failed: :error', ['error' => $e->getMessage()]),
            ], 400);
        }
    }

    /**
     * 启用插件
     */
    public function enable(Request $request)
    {
        $request->validate([
            'code' => 'required|string'
        ]);

        try {
            $this->pluginManager->enable($request->input('code'));
            return response()->json([
                'message' => __('Plugin enabled successfully'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => __('Plugin enable failed: :error', ['error' => $e->getMessage()]),
            ], 400);
        }
    }

    /**
     * 禁用插件
     */
    public function disable(Request $request)
    {
        $request->validate([
            'code' => 'required|string'
        ]);

        try {
            $this->pluginManager->disable($request->input('code'));
            return response()->json([
                'message' => __('Plugin disabled successfully'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => __('Plugin disable failed: :error', ['error' => $e->getMessage()]),
            ], 400);
        }
    }

    /**
     * 获取插件配置
     */
    public function getConfig(Request $request)
    {
        $request->validate([
            'code' => 'required|string'
        ]);

        try {
            $config = $this->configService->getConfig($request->input('code'));
            return response()->json([
                'data' => $config
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => __('Failed to load plugin config: :error', ['error' => $e->getMessage()]),
            ], 400);
        }
    }

    /**
     * 更新插件配置
     */
    public function updateConfig(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'config' => 'required|array'
        ]);

        try {
            $this->configService->updateConfig(
                $request->input('code'),
                $request->input('config')
            );

            return response()->json([
                'message' => __('Plugin config updated successfully'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => __('Plugin config update failed: :error', ['error' => $e->getMessage()]),
            ], 400);
        }
    }

    /**
     * 上传插件
     */
    public function upload(Request $request)
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'mimes:zip',
                'max:10240', // 最大10MB
            ]
        ], [
            'file.required' => __('Plugin package file is required'),
            'file.file' => __('Invalid file type'),
            'file.mimes' => __('Plugin package must be a zip file'),
            'file.max' => __('Plugin package must not exceed 10MB'),
        ]);

        try {
            $this->pluginManager->upload($request->file('file'));
            return response()->json([
                'message' => __('Plugin uploaded successfully'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => __('Plugin upload failed: :error', ['error' => $e->getMessage()]),
            ], 400);
        }
    }

    /**
     * 获取插件后台菜单页面 HTML（供 iframe / srcDoc 嵌入）
     */
    public function page(Request $request, string $code)
    {
        $path = trim((string) $request->query('path', ''));
        if ($path === '') {
            return $this->fail([400, __('path parameter cannot be empty')]);
        }

        $html = $this->pluginManager->renderAdminMenuPage($code, $path, $request);
        if ($html === null) {
            return $this->fail([404, __('Plugin menu page does not exist')]);
        }

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * 删除插件
     */
    public function delete(Request $request)
    {
        $request->validate([
            'code' => 'required|string'
        ]);

        $code = $request->input('code');

        // 检查是否为核心插件
        if ($this->pluginManager->isCorePlugin($code)) {
            return response()->json([
                'message' => __('Core plugins cannot be deleted'),
            ], 403);
        }

        try {
            $this->pluginManager->delete($code);
            return response()->json([
                'message' => __('Plugin deleted successfully'),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => __('Plugin delete failed: :error', ['error' => $e->getMessage()]),
            ], 400);
        }
    }
}