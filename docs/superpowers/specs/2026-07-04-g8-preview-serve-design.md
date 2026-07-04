# G8 预览切换为 serve 托管

日期：2026-07-04  
状态：待实现

---

## 背景

当前 G7→G8 流程使用 `dev-preview.js start` 启动 Vite 进程，向用户发送 `previewGatewayUrl`（`/preview/dev/<name>/`）。该地址在 gateway.js 中没有对应路由，`previewAuth.enabled` 默认 `false` 时实际不可用。用户验收看到的环境与发布环境不一致。

目标：G8 用户验收通过 serve（`gateway.js`）托管的静态快照进行，体验与发布环境完全一致。

---

## 决策汇总

| 问题 | 决策 |
|------|------|
| G7/G8 build 条件 | 统一强制 `VITE_SSO_BYPASS=false`；`dev-preview.js start --bypass false` 触发 build |
| share-preview export 是否重新 build | 否——直接复用 G7 已有 `dist/`，不重复 build |
| PROJECTS_DIR 目录结构 | `<appId>/current`（软链接）+ `<appId>/versions/<ver>/` |
| reopen-dev 清理 | 本地开发不清理废弃版本目录 |
| build 失败保护 | G7 build 先输出到 `dist-tmp/`，成功后 rename 替换 `dist/`，失败则 `dist/` 原样保留 |
| build 超时 | 300s |
| G7 CDP 审计地址 | Vite 原始端口（`result.viteUrl`），删除 `previewGatewayUrl` |

---

## 目录结构

```
PROJECTS_DIR/                          # config.js PROJECTS_DIR
  <appId>/
    current -> versions/<latest-ver>/  # 软链接，始终指向最新版本
    versions/
      v20260704120000-a3f2b1/
        index.html
        assets/
        manifest.json
        _meta.json
      v20260704140000-b4c2d2/          # 后续 export 追加，不覆盖旧版本
        ...
```

- `appId` 取自 `projectMeta.projectUid`
- `current` 软链接每次 export 后原子更新：先写 `current.new`，再 `fs.renameSync` 覆盖 `current`
- `publish.js` 不写 `PROJECTS_DIR`，无兼容旧结构问题
- 旧结构目录（不含 `current/` 的子目录）被 `discoverApps` 跳过，不影响 serve 正常运行

### `_meta.json` schema（必填字段）

```json
{
  "appNo": "<projectUid>",
  "appName": "<projectMeta.name>",
  "version": "v20260704120000-a3f2b1",
  "exportedAt": 1751000000000,
  "manifest": { ... }
}
```

`discoverApps` 只依赖 `appNo` 字段，其余字段供调试和未来使用。

---

## 改动范围

### 1. `scripts/share-preview.js`

**移除 build 步骤**：删除 `fs.rmSync(dist)` 和 `execFileSync("npm", ["run", "build"])` 这两行，改为直接使用已有 `dist/`。  
前置校验：若 `dist/index.html` 不存在则 `fail("dist/index.html 不存在，请先完成 G7 build")`。

**写入目录结构**：
```
snapshotDir = PROJECTS_DIR/<appId>/versions/<version>/
currentLink = PROJECTS_DIR/<appId>/current
```
export 步骤：
1. 若 `<appId>/` 不存在则创建
2. `copyDirContents(dist, snapshotDir)`
3. 写 `snapshotDir/manifest.json`、`snapshotDir/_meta.json`
4. 原子更新软链接：
   ```js
   fs.symlinkSync(`versions/${version}`, tmpLink)
   fs.renameSync(tmpLink, currentLink)
   ```

**返回值**：`sharePreviewUrl = /apps/<appId>/`（不变）

---

### 2. `scripts/vitectrl/dev-preview.js`

**build 保护**（原本在 share-preview，现移到这里，因为 G7 build 是唯一一次 build）：

`startManagedPreview` 内部调用 `npm run build` 时改为：
1. build 输出到 `dist-tmp/`（传 `--outDir dist-tmp` 给 vite build）
2. 成功 → `fs.renameSync('dist-tmp', 'dist')`
3. 失败 → 清理 `dist-tmp/`，抛出错误，`dist/` 原样保留
4. 加 `timeout: 300_000`

**输出字段**：移除 `previewGatewayUrl`，改为输出 `viteUrl`（即 `result.url`，Vite 原始端口，用于 G7 CDP 审计）。

**`--bypass` 默认值改为 `false`**：与"G7 build 统一 bypass=false"决策对齐。

---

### 3. `serve/gateway.js`

**`discoverApps` 改造**：

旧：扫描 `projectsDir` 顶层子目录，读 `<subdir>/_meta.json`。

新：
1. 扫描 `projectsDir` 顶层子目录（每个子目录即一个 `appId`）
2. 读 `<appId>/current/_meta.json`（`fs.readFileSync` 跟随软链接）
3. 若 `current` 不存在或 `_meta.json` 不可读，**跳过该目录**（兼容旧结构无需迁移）
4. 取 `_meta.json.appNo` 作为 appId

**静态文件服务路径**：  
由旧的 `app.rootDir`（版本目录）改为 `path.join(projectsDir, appId, 'current')`，路由语义不变：`/apps/<appId>/` → serve `<appId>/current/`。

**`readProjectsSignature` 改造**：  
取 `<appId>/current` 软链接**本身**的 `lstatSync().mtimeMs`（不 resolve 目标），软链接每次被替换时 mtime 自然更新，触发热重载。

---

### 4. `SKILL.md`

**Step 12（G6→G7，build 与审计）**：
- 改：`node scripts/vitectrl/dev-preview.js start <project-path> --bypass false`
- CDP 审计和截图使用返回值中的 `viteUrl`（Vite 原始端口）
- 删除所有 `previewGatewayUrl` 引用

**Step 14（G7→G8，用户验收）**：
- 改：执行 `node scripts/share-preview.js export <project-path> <task-id>`
- 取返回值 `sharePreviewUrl`，执行 `open <sharePreviewUrl>`，发纯文本地址给用户
- 用户通过 serve 的 SSO 引导访问，体验与发布环境一致

**删除**：
- Step 12 中 `--bypass` 默认 true 的说明
- SKILL.md 原第 199 行 `previewGatewayUrl` 相关描述

**不变**：
- SKILL.md:207 SSO 登录页暂停规则
- Step 16 G8→G9 checkpoint 规则
- `reopen-dev` 相关规则

---

## 不改动

- `scripts/gate.js`：G7→G8 的 `--confirm` 机制不变
- `scripts/publish.js`：不写 `PROJECTS_DIR`，不受影响
- `serve/gateway.js` SSO/session 逻辑：路由结构不变

---

## 关键约束

1. `share-preview.js export` 不重新 build，直接复用 `dist/`；G7 build 是唯一一次 build，条件为 `VITE_SSO_BYPASS=false`
2. 软链接更新必须原子性：先写 `current.new`，再 `fs.renameSync` 覆盖，避免 serve 短暂读到损坏状态
3. `readProjectsSignature` 读软链接**本身**的 `lstatSync().mtimeMs`，不 resolve 目标路径
4. `discoverApps` 跳过无 `current/` 的目录，旧结构目录静默忽略，无需迁移脚本

---

## 遗留问题（本次不处理）

- reopen-dev 后废弃 `versions/` 子目录不清理（本地无影响，对外暴露时另行处理）

---

## 实现顺序

1. `scripts/share-preview.js`：移除 build + 新目录结构 + 软链接写入
2. `scripts/vitectrl/dev-preview.js`：build 保护 + `--bypass` 默认改 false + 输出 `viteUrl`
3. `serve/gateway.js`：`discoverApps` + signature + 静态文件路径
4. `SKILL.md`：Step 12 / Step 14 / 删除 `previewGatewayUrl`
