# Product Sync Gate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Step 2 product-sync entrypoint so API status is explicitly synchronized before `G2 -> G3`, and enforce that gate in code.

**Architecture:** Keep `init-project.js` focused on scaffolding. Add a dedicated `product-sync.js` command that reads the current `product.md`, records API status metadata into `workflow.json`, updates manifest proxy routes when needed, and lets `gate.js` validate synchronization state instead of relying on SKILL text alone.

**两层 manifest 说明（关键约束）：**
- `.webdesign/manifest.json` — 模板层，含占位符（`<project-uid>` 等），`writeProxyRoutes` 写这里
- 根目录 `manifest.json` — 运行时层，由 `renderManifest(projectPath, projectMeta)` 渲染生成，项目实际运行依赖这里
- `product-sync.js` 必须在 `writeProxyRoutes` 之后调用 `renderManifest`，否则代理信息不会生效

**Tech Stack:** Node.js CLI scripts, `node:test`, existing `.webdesign` workflow metadata, manifest proxy helper.

---

### Task 1: Lock expected behavior with tests

**Files:**
- Modify: `scripts/gate.test.js`
- Add: `scripts/product-sync.test.js`
- Modify: `scripts/init-project.test.js`

1. 写一个失败测试：新建任务在未执行 product sync 的情况下，无法从 `G2_PRODUCT_WRITTEN` 推进到 `G3_PRODUCT_CONFIRMED`。
2. 写一个失败测试：`apiStatus=none` 执行 product sync 后，gate 允许推进，且根目录 `manifest.json` 的 `proxy.routes` 为空数组。
3. 写一个失败测试：`apiStatus=provided` 执行 product sync 后，根目录 `manifest.json`（非 `.webdesign/manifest.json`）的 `proxy.routes` 包含提取到的路由；gate 允许推进。
4. 写一个失败测试：`apiStatus=pending` 执行 product sync 失败，无法推进。
5. 运行上述测试，确认它们因预期原因失败。

> **注意**：测试中 `readManifest` 应读取根目录 `manifest.json`，而非 `.webdesign/manifest.json`，否则测试无法覆盖真正的同步问题。

### Task 2: Implement product synchronization

**Files:**
- Add: `scripts/product-sync.js`
- Add: `scripts/lib/task-files.js`

1. 在 `task-files.js` 中添加任务文件路径解析的共享 helper。
2. 实现 `product-sync.js`：读取 `product.md`，解析接口状态，对内容做 hash，更新 `workflow.json` 的 `apiState`。
3. `apiStatus=none` 时：清空 manifest proxy routes，调用 `renderManifest` 将模板渲染到根目录 `manifest.json`，标记同步完成。
4. `apiStatus=provided` 时：从 product 文档提取 proxy routes，写入 `.webdesign/manifest.json` 模板，再调用 `renderManifest(projectPath, projectMeta)` 渲染到根目录 `manifest.json`；`projectMeta` 通过 `readProjectMeta(projectPath)` 从 `.webdesign/project.json` 读取。
5. `apiStatus=pending` 或格式非法时：报错退出，不写任何文件。

> **渲染步骤顺序（不可省略）：**
> 1. `writeProxyRoutes(projectPath, routes)` — 写模板层
> 2. `const projectMeta = readProjectMeta(projectPath)` — 读项目元数据
> 3. `renderManifest(projectPath, projectMeta)` — 渲染运行时层

### Task 3: Enforce the gate

**Files:**
- Modify: `scripts/gate.js`
- Modify: `scripts/init-project.js`
- Modify: `SKILL.md`

1. 在 `init-project.js` 创建新任务的 `workflow.json` 时，初始化 `apiState: null`（占位，表示未同步）。
2. 在 `gate.js` 的 `handleAdvance` 中，针对 `G2_PRODUCT_WRITTEN → G3_PRODUCT_CONFIRMED` 新增同步检查：
   - 读取 `workflow.apiState`，若为 `null` / 不存在，拒绝推进，提示"需先执行 product-sync"
   - `apiState.status` 为 `pending` 或不合法，拒绝推进
   - `apiState.status === "provided"` 且 `apiState.routes` 为空，拒绝推进
3. 同步检查通过条件：`apiState.status === "none"` 或（`apiState.status === "provided"` 且 `routes.length > 0`）且 `sourceHash` 非空。
4. 更新 `SKILL.md` Step 2，将 `product-sync.js` 标注为进入 G3 之前的必要操作。

### Task 4: Verify end-to-end

**Files:**
- Verify: `scripts/init-project.test.js`
- Verify: `scripts/product-sync.test.js`
- Verify: `scripts/gate.test.js`

1. 运行 `product-sync.test.js` 的专项测试，重点断言：
   - `readManifest(projectPath)` 读根目录 `manifest.json`，`proxy.routes` 与 `workflow.apiState.routes` 一致
2. 运行 `gate.test.js`，确认 G2→G3 在未同步时被拦截、同步后放行。
3. 若专项测试全部通过，运行完整 script 测试套件。
4. 检查最终 diff，确认实现与上述门控行为一致。
