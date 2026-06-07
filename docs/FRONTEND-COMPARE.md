# 双端口部署说明（原版前端复刻）

| 端口 | 实例 | 前端 | URL |
|------|------|------|-----|
| **7001** | `/opt/xboard-legacy` | 原版闭源 dist 快照 | http://43.248.77.134:7001 |
| **7002** | `/opt/xboard` | **同一套原版 dist**（非 Vue 仿写） | http://43.248.77.134:7002 |

详见 `docs/FRONTEND-REPLICA.md`。

## 部署原版 dist

```bash
python scripts/pull-legacy-frontend.py          # 可选：从 7001 拉快照到本地
python scripts/deploy-original-frontend.py      # 本地 legacy-dist → 7002
# 或直接在服务器：
python scripts/ssh-run.py scripts/restore-original-frontend.sh
python scripts/ssh-run.py scripts/restart-dual.sh
```

## 验收

两端口 `umi.js` MD5 必须一致；登录页均有 **English** 按钮与完整仪表盘侧栏。

对比重点：**后端栈**（L13/PHP8.5 vs 旧实例），不是两套不同 UI。

## 管理后台路径

安装时生成的 `secure_path` 对两端口相同，例如：`http://43.248.77.134:7001/{secure_path}` 与 `7002/{secure_path}`
