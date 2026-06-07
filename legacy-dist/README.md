# legacy-dist — 闭源原版前端快照

此目录保存 Xboard **官方编译产物**（非开源源码），用于：

- 7002 新栈部署时原样复制 UI
- 与 `public/assets/admin` Git 子模块互为备份

**禁止**用 `frontend/user` 的 Vue 仿写替代本目录进行生产部署。

更新方式：`python scripts/pull-legacy-frontend.py`
