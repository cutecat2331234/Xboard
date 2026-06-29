# PLAN — SSH 一键自动加节点（SSH Auto Node Provisioning）

> 状态：**设计阶段 / Design only — 尚未实现**
> 作者：架构规划代理
> 适用基准：GitHub `cutecat2331234/Xboard` master（Laravel 13 + Octane + Horizon + Go 节点 `xboard-node/` + Vue 用户端 / React 管理端）
> 关联文档：本仓库已有的机器（machine）模式与一键安装命令（`app/Http/Controllers/V2/Admin/Server/MachineController.php`），本计划是其自然延伸。

---

## 1. 目标与范围

### 一句话目标
管理员在管理端填入目标服务器的 SSH 连接信息（host / port / user + 密钥或密码）与节点参数，点击「开始置备」，**系统自动 SSH 登录目标机 → 安装并配置节点代理 → 在面板建好对应记录 → 等待节点上线 → 完成**，全程无需登录目标服务器手敲命令。

### 做什么（In scope）
- 管理端新增「SSH 一键加节点」表单 + 实时进度/日志反馈。
- 后端用一个队列任务（Horizon）通过 SSH 连接目标机、执行既有的 `xboard-node/install.sh`、轮询健康状态。
- **复用现有 machine 模式**：每台被置备的服务器对应一条 `v2_server_machine` 记录（已有 token 机制），节点（`v2_server`）通过 machine 动态发现自动上线。这样「加机器」与「加节点」解耦，且 agent 不必为每个新节点重配。
- 新增 `v2_server_provisioning` 表记录任务状态/分步进度/脱敏日志。
- SSH 凭据**默认只在内存中瞬时使用、用后即焚、绝不落库**。

### 不做什么（Out of scope，列为后续 Phase）
- 不自建并维护一套全新的「节点远程管理 agent 协议」——直接复用 `install.sh` + machine 模式。
- MVP 不做 Windows 目标机（`install.sh` 仅支持 systemd Linux：见 `xboard-node/install.sh:349` `ensure_systemd`）。
- MVP 不做「凭据长期托管 / 后续远程升级/卸载」(`install.sh upgrade|uninstall` 已存在，可在 Phase 3 接入)。
- 不做云厂商 API 开机（AWS/阿里云 OpenAPI 创建实例）——只接管「已有可 SSH 的服务器」。
- 不做证书签发编排（节点侧 `cert_mode` 已能自助 ACME，见 `xboard-node/internal/config/config.go:147` `CertConfig`）。

---

## 2. 现状调研结论（计划依据，带 file 引用）

### 2.1 节点数据模型 — 一个节点「配齐」需要哪些信息

`app/Models/Server.php`（表 `v2_server`，`Server.php:113`）。关键字段：

| 字段 | 含义 | 来源 |
|---|---|---|
| `type` | 协议类型（`shadowsocks/vmess/trojan/vless/hysteria/tuic/anytls/socks/naive/http/mieru`），见 `Server.php:99` `VALID_TYPES` | 管理员选 |
| `name` | 节点名称 | 管理员填 |
| `host` | 客户端连接域名/IP | 管理员填（通常=目标机公网 IP/域名）|
| `port` | 客户端端口（可为 `1000-2000` 动态范围，见 `ServerService.php:69`）| 管理员填 |
| `server_port` | 节点真实监听端口 | 管理员填 |
| `group_ids` | 权限组（决定哪些用户可见/可用，见 `ServerService.php:57`）| 管理员选 |
| `route_ids` / `tags` / `rate` / `transfer_enable` | 路由/标签/倍率/流量上限 | 可选 |
| `protocol_settings` (json) | 协议细节，按 `type` 强类型 cast（`Server.php:216` `PROTOCOL_CONFIGURATIONS`）| 管理员填 |
| `machine_id` | 归属机器（machine 模式核心，见 `Server.php:425`）| **本功能自动写入** |
| `enabled` / `show` | 是否启用 / 是否对用户展示 | 默认 |
| `cert_config` (json) | 证书策略（含 `cert_mode`，`ServerService.php:425`）| 可选 |

- 写入校验：`app/Http/Requests/Admin/ServerSave.php`（`getBaseRules()` + 按 `type` 的 `PROTOCOL_RULES`）。
- 手动加节点现状：`ManageController::save()`（`app/Http/Controllers/V2/Admin/Server/ManageController.php:51`）→ `Server::create($params)`。前端表单：`frontend/admin/src/pages/modules/ServerManagePage.tsx`（`defaultCreatePayload()` 构造 payload，POST `/server/manage/save`）。协议字段组件：`frontend/admin/src/components/server/ServerProtocolFields.tsx`。
- **关键结论**：「节点记录」本身只是面板里的一行数据；节点要真正工作，还需要在目标机上跑一个 agent，agent 用 panel URL + token + node_id（或 machine_id）连回面板拉这条配置。本功能 = 自动化「目标机装 agent」+「面板建记录」两步。

### 2.2 节点 ↔ 面板连接机制 — token 是什么、怎么注册/拉用户/报流量

- **认证 token 有两种**：
  1. **全局 `server_token`**（单节点旧模式）：`admin_setting('server_token')`，所有节点共用一个，见中间件 `app/Http/Middleware/ServerV2.php:35`（`hash_equals(admin_setting('server_token'), token)`）。agent 用 `token + node_id`(+`node_type`) 认证。
  2. **每机器 `token`**（machine 模式，现代）：`v2_server_machine.token`（每台机器独立，`ServerMachine::generateToken()` = `Str::random(32)`，`app/Models/ServerMachine.php:53`）。agent 用 `machine_id + token` 认证，节点列表**动态发现**。
- **REST 通道（UniProxy / v2）**：
  - 单节点：`/api/v1/server/UniProxy/config|user|push|alive|status`（`app/Http/Controllers/V1/Server/UniProxyController.php`）。
  - machine：`/api/v2/server/machine/nodes`（发现节点，`app/Http/Controllers/V2/Server/MachineController.php:21`）、`/api/v2/server/config|user|report`（`app/Http/Controllers/V2/Server/ServerController.php`）。
  - 配置由 `ServerService::buildNodeConfig()`（`app/Services/ServerService.php:292`）按协议拼出 agent 需要的 kernel 配置；可用用户由 `getAvailableUsers()`（按 group 过滤）。
- **WebSocket 通道（推送，可选加速）**：`app/WebSocket/NodeWorker.php`。agent 连 `/ws` 用 `token+node_id` 或 `machine_id+token` 认证（`NodeWorker.php:162` / `:207`）。面板侧通过 Redis `node:push` 频道推 `sync.users/sync.nodes` 等（`app/Services/NodeSyncService.php:150`）。machine 模式下「节点集合变化」会 `notifyMachineNodesChanged()` 推 `sync.nodes`（`NodeSyncService.php:129`）让 agent 热更新——**这正是「加节点免重配 agent」的关键能力**。
- **在线判定**：`Server::available_status`（`Server.php:403`）依据缓存里的 `last_check_at` / `last_push_at`（agent 每次拉 user / report 时 `ServerService::touchNode()` 刷新，`ServerService.php:247`）。`is_online`（`Server.php:485`）= `time()-300 > last_check_at ? 0 : 1`。**健康检查/等待上线就读这个**。

> **设计要点**：machine 模式让「目标机只装一次 agent（绑定 machine_id）」，之后在面板上给该 machine 加任意多个 `v2_server` 节点，agent 通过 `sync.nodes` / 轮询 `machine/nodes` 自动接管，无需再 SSH。这对「一键加节点」非常理想。

### 2.3 节点代理（Go `xboard-node/`）— 怎么配置、部署、连回面板

- **配置模型**：`xboard-node/internal/config/config.go`。核心需要：`panel.url`、认证（`panel.token`+`panel.node_id`+`panel.node_type` 或 `machine.machine_id`+`machine.token`）、`kernel.type`（`singbox`|`xray`，默认 singbox）。支持 env 覆盖：`apiHost/apiKey/nodeID/MACHINE_ID/MACHINE_TOKEN`（`config.go:392`）。token 可走 `token_env` 引用环境变量而非明文写 yaml（`config.go:439` `resolveEnvRefs`）——**安全友好**。
- **三种运行模式**：node（单/多节点）、machine（动态发现，`config.go:606` `IsMachineMode`）、standalone（不连面板，`config.go` + `standalone.go`）。
- **部署 = `xboard-node/install.sh`（systemd）**，这是本功能的施工蓝本。它做的事（`install.sh`）：
  1. `check_root` / `detect_arch`（amd64|arm64，`:327`）/ `detect_os`（ubuntu/debian/centos/rhel/rocky/alma/fedora，`:340`）/ `ensure_systemd`（`:349`）。
  2. `install_dependencies`（apt/dnf/yum 装 curl wget ca-certificates，`:378`）。
  3. `stage_binary` / `stage_xbctl`：下载 `xboard-node-linux-${ARCH}` + `xbctl-linux-${ARCH}`（默认从 GitHub releases，可 `--binary`/`--xbctl-binary` 用本地文件，`:463`/`:514`）。
  4. `render_config`：调 `xbctl config init --mode --panel-url --token --node-id|--machine-id --kernel ...` 生成 `/etc/xboard-node/config.yml` + `credentials.env`（token 走 env file，权限 600，`:546`）。
  5. `render_service` + `install_staged_files`：写 `/etc/systemd/system/xboard-node.service`（`EnvironmentFile=credentials.env`，`:592`），`systemctl enable`。
  6. `start_service` + `wait_for_health`：起服务并轮询本机 `http://127.0.0.1:65530/healthz`（`:664`）。
  7. **失败自动回滚**：`trap on_error` → `rollback_install`（`:95`/`:145`）。
- **命令行入参**（`install.sh:160` usage）：
  - node 模式：`--panel <url> --token <server_token> --node-id <id> [--node-type <type>] [--kernel singbox|xray]`
  - machine 模式：`--panel <url> --token <machine_token> --machine-id <id>`
- **已有一键命令生成器**：`MachineController::buildInstallCommand()`（`MachineController.php:239`）已经会产出：
  ```
  curl -fsSL <installerUrl> | sudo bash -s -- --mode machine --panel <panelUrl> --token <machineToken> --machine-id <id>
  ```
  `installerUrl` 解析逻辑（`MachineController.php:253` `nodeInstallerUrl`）：本仓库存在 `xboard-node/install.sh` 时用 `config('xboard.node_installer_repository')`（默认 `https://raw.githubusercontent.com/cutecat2331234/Xboard/master`）拼 `…/xboard-node/install.sh`。
  > **本功能 = 把这条「让管理员手动粘贴执行」的命令，改由后端 SSH 进目标机自动执行。** 复用度极高。

### 2.4 现有部署/安装脚本 — 真实施工步骤蓝本

- `xboard-node/install.sh`：**节点侧**安装（见 2.3），是本功能直接复用对象。
- `scripts/server-deploy-native.sh`：**面板侧**整机部署（装 PHP8.5/MySQL/Redis/Nginx/Supervisor + clone 代码 + `artisan xboard:install`），揭示了「在一台 Ubuntu 上从零拉起服务」的真实步骤模式（apt 非交互、`run_with_retry` 重试、systemd/supervisor 起服务、最后 curl 自检）。**这些模式（重试、健康自检、非交互）应被置备任务复用。**
- `scripts/ssh-run.py`、`scripts/server-check.py`：现有运维脚本，证明团队已有「SSH 进机器跑命令」的工作流（Python 侧，读 `SSH_PASS` 环境变量），但**这些是开发者本地脚本，不是产品功能**；本功能要把它产品化进面板。

### 2.5 可用的 SSH 手段（PHP 侧）

- `composer.json` **当前没有** `phpseclib`（纯 PHP SSH）或 `spatie/ssh`。需新增依赖。
- **已有 `Symfony\Component\Process`**（Laravel `Process` facade）且已被用于 shell-out：`app/Services/UpdateService.php` 大量用 `Process::run('git …')`、`Process::run('php artisan octane:reload')` 等（`UpdateService.php:40`/`:305`/`:379`）。说明 shell-out 在本项目可行。
- **队列/长任务**：`laravel/horizon`（`composer.json:21`）已启用，`app/Jobs/*`（如 `NodeUserSyncJob`、`TrafficFetchJob`）证明队列任务是标准模式。**置备是典型的耗时任务（装包/下载/起服务/等上线，几十秒~几分钟），必须放队列，不能在 HTTP 请求里同步跑。**
- Octane（`laravel/octane:^2`）：HTTP worker 常驻，**绝不可**在请求线程里阻塞做 SSH（会占满 worker）；必须 dispatch 到 Horizon。

**PHP 侧自动化 SSH 的两条可行路径与权衡：**

| 方案 | 实现 | 优点 | 缺点 | 取舍 |
|---|---|---|---|---|
| **A. phpseclib（纯 PHP SSH，推荐）** | `composer require phpseclib/phpseclib:~3.0`，在队列 Job 内 `new SSH2($host,$port)`，`login()` 用密码或 `PublicKey::load($privateKey)`；逐条 `exec()` 收集 stdout/exit code；可 `read()`/`getServerPublicHostKey()` 做 host key 校验。 | 不依赖系统装 `ssh` 二进制（Octane/容器环境干净）；可编程式拿到 host key 指纹、exit code、流式输出；跨平台。 | 纯 PHP，交互式/伪终端能力弱于原生 ssh；大输出需注意内存。 | **MVP 选 A**。我们只需「非交互执行一段安装脚本 + 读退出码/日志」，phpseclib 完全胜任，且 host key 校验、私钥内存加载、无落盘最契合安全要求。 |
| **B. shell-out `ssh`/`sshpass`** | `Process::run('ssh -i keyfile user@host "bash -s" < install.sh')` | 复用系统 ssh，功能最全。 | 需在面板宿主装 `ssh`(+`sshpass` 才能用密码，很多镜像没有)；**私钥/密码必须落到临时文件或进程参数**（`ps` 可见、易泄露），与「不落盘」目标冲突；host key 校验靠 `known_hosts` 文件管理繁琐。 | 不选（安全面更差）。 |

> 结论：**phpseclib + Horizon 队列 Job**。

---

## 3. 架构设计

### 3.1 总体决策

- **SSH 自动化在哪跑**：Horizon 队列 Job（`ProvisionNodeJob`），由管理端 API dispatch。**不在 HTTP/Octane worker 内同步执行**。
- **用什么 SSH**：`phpseclib/phpseclib` ~3.0（纯 PHP，内存加载凭据，可校验 host key）。
- **装什么**：**复用 `xboard-node/install.sh`**，不重写安装逻辑。
- **用哪种节点模式**：**machine 模式优先**（每台目标机 = 一条 `v2_server_machine`，agent 绑 `machine_id`；节点记录后续可任意增减，agent 自动发现）。
  - 这样「一键加节点」实际分两类入口：
    - **新机器 + 首节点**：建 machine → SSH 装 agent（machine 模式）→ 建第 1 个 `v2_server`（写 `machine_id`）→ 等上线。
    - **已有机器 + 加节点**：直接建 `v2_server`（写已存在的 `machine_id`），**无需再 SSH**（agent 自动接管）。MVP 可只做前者，但数据模型要为后者留好。
  - 备选：单节点模式（`server_token`+`node_id`）。缺点是必须先建好 `v2_server` 拿到 id 才能装 agent，且每加一个节点都要 SSH。**仅作为「不想用 machine」的兼容路径，非默认。**

### 3.2 自动化流程分步（状态机）

置备任务 = 有限状态机，每步落库（`v2_server_provisioning.status` + `steps` json + `log` text，脱敏）。

```
[pending]
  → connect          # phpseclib SSH 连接 + host key 校验
  → probe            # uname -m / -s、读 /etc/os-release、检测 systemd、是否 root/可 sudo、端口占用
  → prepare_panel    # 在面板内建/取 ServerMachine（machine 模式），生成 machine token（不落 agent 明文）
  → install_agent    # 下发并执行 install.sh（machine 模式），带 panel url + machine token + machine_id
  → create_server    # 在面板建 v2_server 记录（写 machine_id、协议参数）—— 可与 install 并行/前置
  → wait_online      # 轮询 ServerMachine.last_seen_at / Server.is_online 直到上线或超时
  → done             # 成功
  ↘ failed (+ rollback)  # 任一步失败 → 标记 failed，按需回滚
```

逐步说明（含落点）：

1. **connect**：`SSH2($host,$port)`；先取 `getServerPublicHostKey()` 指纹做校验（见 §7）；`login($user, $authObject)`（密码或 `PublicKey`）。失败→`failed:auth`。
2. **probe**：`exec('uname -m; uname -s; cat /etc/os-release; command -v systemctl; id -u; ss -ltn')`。判定：架构∈{x86_64,aarch64}、OS∈install.sh 支持集、有 systemd、root 或可免密 sudo、`server_port` 未被占用。任何不满足→`failed:unsupported`（把原因写进日志）。
3. **prepare_panel**：
   - machine 模式：`ServerMachine::create(['name'=>…, 'token'=>generateToken()])`（或复用已选 machine）。**token 只在本 Job 内存里持有，传给 install.sh，不写入 provisioning 表。**
4. **install_agent**：把 `install.sh` 内容（优先读本仓库 `base_path('xboard-node/install.sh')`，与 `nodeInstallerUrl()` 同源逻辑）通过 SSH `exec` 执行：
   - 推荐：`exec('sudo bash -s -- --mode machine --panel <url> --token <token> --machine-id <id> --yes')`，脚本内容从 stdin 喂入（避免在目标机 `curl` 外网，也便于用本仓库版本）。
   - 或退化：直接执行 `buildInstallCommand()` 产出的 `curl … | sudo bash …`（需目标机能访问 GitHub raw）。
   - 收集 stdout/stderr + exit code；install.sh 自带健康检查与回滚（`install.sh:705` `perform_install`）。
5. **create_server**：`Server::create([... 'machine_id'=>$machine->id, 'enabled'=>true, 'show'=>…])`，复用 `ServerSave` 校验规则的逻辑（抽公共 service，见 §4）。`NodeSyncService::notifyMachineNodesChanged($machine->id)` 让已连 agent 立即发现新节点（`NodeSyncService.php:129`）。
6. **wait_online**：轮询（带退避，整体超时如 120s）：machine 上线看 `ServerMachine.last_seen_at`（agent 调 `machine/nodes`/`machine/status` 会刷新，`MachineController.php:144`）；节点上线看 `Server::is_online`（`Server.php:485`，依赖 agent touchNode）。两者达标→`done`。
7. **done / failed**：done 写完成时间；failed 记录失败步与脱敏原因，并按策略回滚（见 §3.3）。

### 3.3 幂等、重试、超时、回滚、并发

- **幂等**：
  - install.sh 自身幂等（`detect_current_state` + 备份 + 回滚，`install.sh:444`），重复跑安全。
  - 置备任务以 `provisioning.id` 为单位；每步开始前检查当前 `status`，支持「从失败步重试」而非整体重来。
  - 面板侧建 machine/server 前先按 (host, server_port) 或 (machine_id) 查重，避免重复建记录。
- **重试**：
  - 网络类错误（connect/download）自动重试（指数退避，参考 `install.sh:360` `run_with_retry` 与 `server-deploy-native.sh` 的重试模式）。
  - 鉴权失败、OS 不支持等**确定性错误不重试**，直接 failed 并提示。
  - Horizon Job 设 `$tries=1`（业务层自管重试，避免整段脚本被框架重跑），`$timeout` 设足够大（如 600s）但**短于** Horizon `retry_after`，防止重复执行（见 Horizon 文档约束）。
- **超时**：phpseclib 设 `setTimeout()`；每步有软超时；`wait_online` 有总超时（超时=failed:timeout，但 agent 可能稍后才上线，提示用户可「重新检测」）。
- **失败回滚**：
  - 目标机层：install.sh `trap on_error`/`rollback_install` 已处理 agent 文件/服务回滚。
  - 面板层：若 `create_server` 后 `wait_online` 失败，**默认保留** machine/server 记录但标记节点 `enabled=false`/`show=false`，让管理员人工排查（避免「装好了却被自动删」）；提供「清理」按钮再删。可配置「失败即回滚（删记录 + 远程 uninstall）」开关。
- **并发（多台同时加）**：
  - 每个置备任务独立 Job，天然并行（Horizon 多 worker）。
  - 对「同一 host」加分布式锁（`Cache::lock("provision:$host")`）防止两个任务同时 SSH 同一台机器互相踩。
  - machine token / server_token 生成无并发问题（随机/全局）。

### 3.4 时序（文字版）

```
Admin UI ──POST /server/provision/start──▶ ProvisionController
                                              │ 建 v2_server_provisioning(status=pending)
                                              │ 凭据加密暂存(短TTL,见§7) 或 仅传给Job
                                              └─ dispatch ProvisionNodeJob ─▶ Horizon
Admin UI ──GET /server/provision/status(轮询/SSE)──▶ 读 provisioning 表(status+steps+log)

ProvisionNodeJob(Horizon):
  connect→probe→prepare_panel→install_agent(SSH exec install.sh)→create_server
   →wait_online(poll last_seen_at/is_online)→done   每步更新 provisioning 行
   (失败→failed + 记录;按策略回滚;销毁内存凭据)
```

---

## 4. 数据模型变更

### 4.1 新增表 `v2_server_provisioning`（迁移）

记录每次置备任务（**不含明文凭据**）：

| 列 | 类型 | 说明 |
|---|---|---|
| `id` | bigint pk | |
| `status` | string | `pending/connecting/probing/installing/creating/waiting/done/failed` |
| `current_step` | string nullable | 当前步标识 |
| `steps` | json nullable | 各步状态/耗时数组（前端进度条用）|
| `host` | string | 目标机（**仅 host，不含凭据**）|
| `port` | int | SSH 端口 |
| `ssh_user` | string | SSH 用户名（非敏感）|
| `auth_method` | string | `password` / `key`（**不存内容**）|
| `host_key_fingerprint` | string nullable | 首次连接记录的 host key 指纹（TOFU，见§7）|
| `mode` | string | `machine` / `node` |
| `machine_id` | bigint nullable fk | 关联 `v2_server_machine`（成功后回填）|
| `server_id` | bigint nullable fk | 关联 `v2_server`（成功后回填）|
| `node_params` | json nullable | 节点协议参数快照（type/port/group_ids…，**非敏感**，便于重试）|
| `log` | text/longtext | **脱敏**安装日志（绝不含 token/凭据）|
| `error` | text nullable | 失败原因（脱敏）|
| `created_by` | bigint | 操作管理员（审计）|
| `created_at/updated_at` | ts | |

> 迁移命名遵循现有约定（参考 `database/migrations/2026_04_11_000001_add_machine_support.php`）。

### 4.2 `v2_server` / `v2_server_machine` 是否加字段

- **基本不需要**。machine 模式已具备所需一切（`v2_server_machine.token/is_active/last_seen_at`，`Server.machine_id`）。
- 可选（增强，非必须）：`v2_server_machine` 加 `provisioned_at` / `provision_source`（标记「由 SSH 一键置备生成」），便于审计与区分手动创建。MVP 可省。

### 4.3 凭据存储（若必须暂存）

- **首选**：凭据**不落库**——API 收到后直接随 Job payload 传递（Horizon Redis），Job 用完即弃。
  - 注意：Horizon payload 进 Redis 会短暂可见。**更稳妥**做法见 §7（短 TTL 加密缓存 + 用后即删，或拆分 token 仅服务端持有）。
- **次选**（若产品要「保存以便重试」）：单独 `provisioning_secrets`（或加密列），用 Laravel `Crypt`（APP_KEY）加密，设短 TTL，**置备结束立即删除**，并在 UI 明示「凭据仅用于本次安装」。

---

## 5. API / 端点（管理端，鉴权同现有 admin 组）

挂在 `app/Http/Routes/V2/AdminRoute.php` 的 `server/manage`（或新建 `server/provision`）分组，复用 `['admin','log']` 中间件（`AdminRoute.php:33`），路径前缀走 `secure_path`。

| 方法 | 路径 | 控制器方法 | 作用 |
|---|---|---|---|
| POST | `/server/provision/start` | `ProvisionController::start` | 接收 host/port/user/auth(method+secret)/mode/node_params → 建 provisioning 行 + dispatch Job → 返回 `provision_id` |
| GET | `/server/provision/status` | `ProvisionController::status` | 按 `id` 返回 `status/current_step/steps/log`（前端轮询；**响应里绝不回显凭据/token**）|
| POST | `/server/provision/retry` | `ProvisionController::retry` | 从失败步重试（需重新提交凭据，因不落库）|
| POST | `/server/provision/cancel` | `ProvisionController::cancel` | 取消/清理（可选远程 uninstall）|
| GET | `/server/provision/list` | `ProvisionController::list` | 历史任务列表（审计）|

- 进度反馈优先「前端轮询 GET status」（最简单、与现有 `fetchJsonObject` 一致）。进阶可上 SSE/WebSocket 流式日志（复用现有 WS 基建），列为 Phase 2。
- 入参校验：复用/扩展 `ServerSave` 的协议规则校验 `node_params`；SSH 字段单独校验（host 必填、port 1-65535、auth_method∈{password,key}、secret 必填且不入日志）。
- **限流**：`start`/`retry` 加 `RateLimiter`（参考 `MachineController::getToken` 的限流，`MachineController.php:127`），防滥用/SSRF 扫描。

### 5.1 复用与重构

- 把 `ManageController::save()` 里「构造并校验 Server 参数 + 创建」抽成 `ServerProvisionService::createServerForMachine()`，供置备 Job 与手动 save 共用，避免重复协议校验逻辑（`ServerSave.php`）。
- 安装命令拼装复用 `MachineController::buildInstallCommand()` / `nodeInstallerUrl()`（`MachineController.php:239`），但 SSH 场景改为「喂 install.sh 内容到 stdin」更稳。

---

## 6. 前端 UI（React 管理端）

### 6.1 放在哪

- **入口**：`frontend/admin/src/pages/modules/ServerMachinePage.tsx` 顶部工具栏新增按钮「SSH 一键加机器/节点」（与现有「添加机器」`Plus` 按钮并列，`ServerMachinePage.tsx:315`）。
  - 理由：本功能本质是「自动建 machine + 装 agent」，与机器管理页语义最贴；该页已有 token / installCommand / nodes 对话框基建可复用。
- 也可在 `ServerManagePage.tsx`「添加节点」旁加「自动置备到新服务器」入口（`ServerManagePage.tsx:1390`），二选一进同一向导。

### 6.2 表单（向导式 Dialog）

复用现有表单样式（`@/lib/form-styles` 的 `inputCls` 等、`Dialog`、`FormSelect`、`Switch`）：

- **第 1 步 — SSH 连接**：
  - `host`（域名/IP）、`port`（默认 22）、`ssh_user`（默认 root）。
  - 认证方式单选：`密码` | `私钥`。
    - 密码 → password 输入（type=password，不回显、不入历史）。
    - 私钥 → textarea 贴 PEM + 可选 passphrase。
  - host key 处理：首次连接展示指纹让管理员确认（TOFU），或提示「将记录此指纹」。
- **第 2 步 — 节点参数**：直接复用 `ServerProtocolFields` + 现有 `defaultCreatePayload` 字段（type/name/host/port/server_port/group_ids/rate/...）。`host` 默认带入第 1 步的 host。`kernel`（singbox/xray）选择。machine 选择：新建机器 or 选已有机器。
- **第 3 步 — 进度反馈**：
  - 步骤条（connect→probe→install→create→wait_online）对应 `steps` json。
  - 实时日志区（轮询 `GET /server/provision/status` 的 `log` 字段，等宽字体，类似 `ServerMachinePage` 的 install 命令展示框 `ServerMachinePage.tsx:389`）。
  - 终态：成功 → 跳转到该 machine 的节点列表（`navigate('/server/manage?machine_id=…')`，复用 `ServerMachinePage.tsx:279`）；失败 → 显示原因 + 「重试」/「清理」。

### 6.3 i18n

新增文案键（`server.provision.*`），中英双语，遵循现有 `t('…')` 模式与 `frontend/admin` 的 locale 文件结构。

---

## 7. 安全（重点)

> 本功能把「面板」变成可对任意服务器执行命令的主体，安全是第一优先级。

### 7.1 SSH 凭据处理
- **默认不落库、内存瞬时使用、用后即焚**：
  - API 收到 secret → 直接进 Job payload 或短 TTL 加密缓存（`Crypt::encrypt`，TTL≤任务超时），Job 取出 → 用完 `unset()` + `Cache::forget()`。
  - phpseclib `PublicKey::load($pem)` / 明文密码仅存在于 Job 进程内存，**不写临时文件**（这也是不选 shell-out `ssh -i keyfile` 的原因）。
- **密钥优于密码**：UI 引导优先用 SSH key；若用密码，提示风险。
- **不在任何日志/响应/异常里出现凭据**：
  - provisioning 表 `log` 写入前过滤（脱敏 token/password/private key）。
  - 注意 install.sh 把 `--token` 作为命令行参数传 agent（`ps` 在目标机可见瞬间）——可优先用「stdin 喂脚本 + 环境变量传 token」降低暴露；agent 侧本就支持 `token_env`（`config.go:439`）。
- **审计日志不记凭据**：记 who/when/host/结果，复用现有 `log` 中间件与 `SystemController::getAuditLog`（`AdminRoute.php:259`）。

### 7.2 Host key 校验（防 MITM）— 必做
- phpseclib 连接后 `getServerPublicHostKey()` 取指纹：
  - **首次（TOFU）**：展示给管理员确认并存 `host_key_fingerprint`。
  - **后续/重试**：比对已存指纹，不一致→**中止**并告警（防中间人/换机）。
- 严禁「无条件信任任意 host key」的静默实现。

### 7.3 最小权限 & 目标机
- 明确需要 root 或可 `sudo`（install.sh `check_root`，`install.sh:320`）。Phase 1 要求 root/sudo；非 root 列为后续课题（系统级 systemd 安装本就需特权）。
- 只执行「我们自己仓库的 install.sh」，不执行用户任意命令——**降低被当作任意命令执行跳板的风险**。

### 7.4 SSRF / 跳板风险与缓解
- 管理员可填任意 host → 面板会向其发起 SSH。缓解：
  - 仅 admin 角色可用（已有 `admin` 中间件）。
  - `start`/`retry` 限流 + 审计（防扫内网/批量探测）。
  - 可选 host 允许/拒绝清单（拒绝 169.254.x、可配置内网段豁免）。
  - 固定只连 SSH 端口 + 只跑安装脚本，不做通用「输入命令执行」。
- 凭据加密用 `APP_KEY`；确保 Horizon Redis 不对外暴露（部署层）。

### 7.5 panel/token 下发安全
- machine token 一机一个（`Str::random(32)`），泄露影响面仅限单机；优于全局 `server_token`（再次印证选 machine 模式）。
- panel URL 用 `admin_setting('app_url')`（`MachineController.php:241`），避免被 Host 头伪造。

---

## 8. 实施阶段拆分

### Phase 1 — MVP（machine 模式 + 密码/密钥 + 轮询进度）
- 依赖：`composer require phpseclib/phpseclib:~3.0`。
- 后端：迁移 `v2_server_provisioning`；`ProvisionController`（start/status/retry/cancel）；`ProvisionNodeJob`（connect→probe→prepare_panel(machine)→install_agent(SSH 跑 install.sh, machine 模式)→create_server→wait_online）；`ServerProvisionService`（抽公共建 Server 逻辑）。
- 安全：凭据不落库（Job payload/短 TTL）；host key TOFU + 校验；日志脱敏。
- 前端：`ServerMachinePage` 新增「SSH 一键加机器」向导（3 步）+ 轮询进度。
- **验收**：在一台干净 Ubuntu/Debian root 机上，填 SSH+节点参数 → 自动装好 agent、面板出现 machine + node、节点 `is_online=1`、用户可订阅。失败有清晰原因与可重试。

### Phase 2 — 体验与稳健
- 「已有机器 + 仅加节点（免 SSH）」入口（直接建 `v2_server` + `notifyMachineNodesChanged`）。
- 流式日志（SSE/WebSocket，复用现有 WS）替代轮询。
- 并发锁、退避重试打磨；OS 支持矩阵扩展（CentOS/Rocky/Alma 实测）；arm64 实测。
- 失败回滚策略可配置（保留 vs 远程 uninstall）。

### Phase 3 — 生命周期管理
- 远程「升级/卸载」节点（接 `install.sh upgrade|uninstall`，`install.sh:729`/`:768`）。
- 凭据可选托管（加密 + 轮换）以支持后续免重输运维。
- 批量置备（一次多台）、模板（保存常用节点参数）。

### Phase N — 进阶
- 非 root/受限 sudo 支持；Windows 目标机（需 agent 侧支持，当前不支持）；云厂商 API 开机后自动置备。

---

## 9. 风险与待决问题（请用户拍板）

### 9.0 已决策（2026-06-29，用户拍板）
- **二进制来源 = 保持 GitHub releases**（install.sh 默认不变；前提：目标机须能访问 GitHub；个别不通的机器实现时可加 `--binary`/自定义 base 兜底）→ 定问题 1。
- **machine 模式为默认架构**（一机装一次 agent、token 一机一个、加节点免重装）→ 定问题 6。
- **SSH 凭据不落库、用完即焚**（仅内存瞬时；§4.3 凭据暂存表不需要；§7.1 走纯瞬时路径）→ 定问题 3。
- **wait_online 超时 = 保留记录待排查**（不自动回滚删除；标记超时态供手动处理/重试）→ 定问题 5。
- 其余（2 OS 范围 / 4 非 root / 7 进度形态 / 8 host key / 9 Windows / 10 面板出网）沿用文档 MVP 默认，后续按需调整。

**以下为完整风险登记（已决策项见 §9.0）：**

1. **节点二进制来源/版本**：install.sh 默认从 `github.com/cedar2025/xboard-node/releases` 下 `xboard-node-linux-${ARCH}`（`install.sh:30`/`:483`）。本仓库 `xboard-node/` 是源码，**仓库内并无预编译二进制**。问题：
   - 目标机能访问 GitHub releases 吗（国内常被墙）？
   - 是否需要面板自托管二进制镜像（如放在面板某 `/download` 路由 / 边缘节点 `43.248.77.134`），并让 install.sh 用 `--binary`/自定义 base？**建议：面板提供二进制托管端点**，避免依赖外网。
2. **目标 OS / 架构支持范围**：MVP 锁定 systemd Linux + amd64/arm64（install.sh 现状）。是否需要更老系统 / 非 systemd（OpenRC、Alpine）？
3. **凭据是否允许暂存**：默认「不落库、用完即焚」。是否需要「保存凭据以便后续运维」（涉及加密托管与合规）？拍板决定 §4.3 / §7.1 走向。
4. **是否支持非 root**：MVP 要求 root/可 sudo。是否必须支持仅普通用户（系统级 systemd 安装通常需特权，难度高）？
5. **失败语义**：装好但 `wait_online` 超时——**保留记录待排查**（默认）还是**自动回滚删除**？
6. **machine vs 单节点**：是否同意「machine 模式为默认」（强烈推荐，免重配、token 隔离）？还是必须支持纯单节点 `server_token` 路径？
7. **进度反馈形态**：MVP 轮询是否够用，还是首发就要流式日志（成本更高）？
8. **host key 策略**：TOFU（首次信任并记录）是否可接受，还是要求管理员预先提供指纹？
9. **Windows 节点**：明确**暂不考虑**（agent/install.sh 不支持），仅记录为远期。
10. **面板出网能力**：面板宿主能直连目标机 22 端口吗（网络/防火墙）？跨网段/NAT 后的目标机如何处理（可能需反向/跳板，超出 MVP）。

---

## 10. 验收标准（「一键加节点成功」的定义）

一次置备视为成功，当且仅当：
1. 管理员在向导填入 SSH 连接信息（host/port/user + 密钥或密码）与节点参数，点击「开始置备」，**全程不再登录目标机**。
2. 系统自动：SSH 连接成功（host key 校验通过）→ 探测目标机通过 → 在面板创建/复用 `v2_server_machine`（machine 模式）→ 通过 SSH 执行 `install.sh` 成功（目标机 `systemctl is-active xboard-node` = active，本机 `:65530/healthz` 通过）→ 在面板创建 `v2_server` 记录（`machine_id` 正确、协议参数正确）。
3. 节点在超时时间内上线：`Server::is_online == 1`（`Server.php:485`）且 machine `last_seen_at` 近期刷新；该节点出现在对应 group 用户的可用列表（`ServerService::getAvailableServers`）。
4. **安全验收**：provisioning 表、日志、API 响应中**不存在**任何 SSH 密码/私钥/明文 token；host key 指纹已记录；凭据在任务结束后已从内存/缓存清除。
5. **失败可观测**：任一步失败时，UI 显示明确步骤与脱敏原因，且可「重试」或「清理」；目标机若失败已由 install.sh 自动回滚到先前状态。
6. **幂等**：对同一台机器重复置备不产生重复 machine/节点记录、不破坏已有 agent。

---

## 附录 A — 关键文件索引（实现时直接定位）

- 节点模型与协议字段：`app/Models/Server.php`（`:99` 类型、`:216` 协议配置、`:403` 可用状态、`:485` is_online）
- 节点写入校验：`app/Http/Requests/Admin/ServerSave.php`
- 手动加节点控制器：`app/Http/Controllers/V2/Admin/Server/ManageController.php`（`:51` save）
- 机器管理 + 一键命令生成：`app/Http/Controllers/V2/Admin/Server/MachineController.php`（`:239` buildInstallCommand、`:253` nodeInstallerUrl）
- 机器/节点鉴权中间件：`app/Http/Middleware/ServerV2.php`、`app/Http/Middleware/Server.php`（`server_token` 校验）
- 节点连接 service：`app/Services/ServerService.php`（`:292` buildNodeConfig、`:247` touchNode）、`app/Services/NodeSyncService.php`（`:129` notifyMachineNodesChanged）
- WS：`app/WebSocket/NodeWorker.php`
- 机器模型：`app/Models/ServerMachine.php`（`:53` generateToken）
- 节点 agent 安装脚本（施工蓝本）：`xboard-node/install.sh`
- 节点 agent 配置模型：`xboard-node/internal/config/config.go`（`:392` env 覆盖、`:439` token_env、`:606` machine 模式）
- 面板整机部署蓝本：`scripts/server-deploy-native.sh`
- shell-out 既有用法（Process facade）：`app/Services/UpdateService.php`
- 安装器仓库配置：`config/xboard.php`（`node_installer_repository`）
- 管理端节点页 / 机器页：`frontend/admin/src/pages/modules/ServerManagePage.tsx`、`frontend/admin/src/pages/modules/ServerMachinePage.tsx`
- 协议字段组件：`frontend/admin/src/components/server/ServerProtocolFields.tsx`
- admin 路由：`app/Http/Routes/V2/AdminRoute.php`（`:84` server/manage、`:101` server/machine）
