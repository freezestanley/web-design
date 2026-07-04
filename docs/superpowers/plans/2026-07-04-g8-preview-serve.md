# G8 预览切换为 serve 托管 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** G7 build 统一使用 `VITE_SSO_BYPASS=false`，G8 用户验收通过 serve（`gateway.js`）托管的静态快照完成，删除从未可用的 `previewGatewayUrl`。

**Architecture:** `share-preview.js export` 不再自己 build，直接复用 G7 已有 `dist/`，将其写入 `PROJECTS_DIR/<appId>/versions/<ver>/` 并原子更新 `current` 软链接；`gateway.js` 的 `discoverApps` 改为读 `<appId>/current/_meta.json`，静态文件服务跟随软链接；SKILL.md Step 12/14 同步更新指令和地址。

**Tech Stack:** Node.js 24（`node:fs`、`node:test`、`node:assert/strict`），CommonJS，无外部依赖。

## Global Constraints

- 所有文件使用 CommonJS（`require`/`module.exports`），不使用 ESM
- 测试使用 `node:test` + `node:assert/strict`，不引入第三方测试库
- 禁止新增 npm 依赖
- `share-preview.js` 的命令行接口签名不变：`node scripts/share-preview.js export <project-path> <task-id> [--output-dir <dir>]`
- `sharePreviewUrl` 格式不变：`<origin>/apps/<appId>/`
- 软链接原子更新：先写 `current.new`，再 `fs.renameSync` 覆盖 `current`
- `discoverApps` 跳过无 `current/` 目录的子目录，旧结构静默忽略，无需迁移

---

## File Map

| 文件 | 动作 | 说明 |
|------|------|------|
| `scripts/share-preview.js` | 修改 | 移除 build 步骤；改写目录结构为 `<appId>/versions/<ver>/` + 软链接 |
| `scripts/share-preview.test.js` | 修改 | 更新现有测试（不再检查 bypass=false build）；新增软链接结构测试 |
| `serve/gateway.js` | 修改 | `discoverApps`、`readProjectsSignature`、静态文件路径三处改造 |
| `serve/gateway.test.js` | 修改 | 更新 `createProject` helper；新增软链接结构测试 |
| `scripts/vitectrl/dev-preview.js` | 修改 | `--bypass` 默认改 `false`；输出 `viteUrl` 替换 `previewGatewayUrl`；build 写入 `dist-tmp` |
| `scripts/vitectrl/lib/controller.js` | 修改 | build 命令加 `--outDir dist-tmp`；成功后 rename；失败后清理 `dist-tmp`；加 `timeout: 300_000` |
| `scripts/vitectrl.test.js` | 修改 | 更新 bypass 默认值测试；新增 build 失败保留 dist 测试 |
| `SKILL.md` | 修改 | Step 12 改 bypass=false 和审计地址；Step 14 改为 share-preview export；删 previewGatewayUrl |

---

## Task 1: share-preview.js — 移除 build，改写目录结构

**Files:**
- Modify: `scripts/share-preview.js`
- Modify: `scripts/share-preview.test.js`

**Interfaces:**
- Consumes: `dist/index.html`（G7 已 build 好的产物，直接复用）
- Produces:
  - `PROJECTS_DIR/<appId>/versions/<version>/`（静态文件 + `manifest.json` + `_meta.json`）
  - `PROJECTS_DIR/<appId>/current` → 软链接指向 `versions/<version>`
  - stdout JSON：`{ appId, appName, version, snapshotPath, outputDir, sharePreviewUrl }`

- [ ] **Step 1: 写失败测试——复用 dist，不再 build**

在 `scripts/share-preview.test.js` 中，找到现有测试 `"share-preview export builds a serve snapshot and forces bypass=false"`，**替换**为以下两个测试：

```js
test("share-preview export reuses existing dist without rebuilding", () => {
  const { tempDir, projectPath, taskId } = setupSharePreviewProject();
  const shareProjectsDir = path.join(tempDir, "share-projects");

  // 预先写入 dist（模拟 G7 已 build）
  const distDir = path.join(projectPath, "dist");
  fs.mkdirSync(path.join(distDir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(distDir, "index.html"), "<!doctype html><html><body>prebuilt</body></html>");
  fs.writeFileSync(path.join(distDir, "assets", "main.js"), "console.log('prebuilt');");

  const result = spawnSync(
    process.execPath,
    ["scripts/share-preview.js", "export", projectPath, taskId],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: {
        ...process.env,
        WEB_DESIGN_SHARE_PROJECTS_DIR: shareProjectsDir,
        WEB_DESIGN_NOW: "2026-07-04T09:10:11.000Z"
      }
    }
  );

  assert.equal(result.status, 0, result.stderr);
  const json = JSON.parse(result.stdout);
  assert.equal(json.appId, "PROJshare0011223344");
  assert.match(json.version, /^v20260704091011-[a-f0-9]{6}$/);
  assert.equal(json.sharePreviewUrl, "http://127.0.0.1:4173/apps/PROJshare0011223344/");

  // 版本目录结构：<appId>/versions/<version>/
  const appDir = path.join(shareProjectsDir, "PROJshare0011223344");
  const versionsDir = path.join(appDir, "versions");
  const snapshotDir = path.join(versionsDir, json.version);
  assert.equal(fs.existsSync(path.join(snapshotDir, "index.html")), true);
  assert.equal(fs.existsSync(path.join(snapshotDir, "assets", "main.js")), true);

  // current 软链接存在且指向正确版本
  const currentLink = path.join(appDir, "current");
  assert.equal(fs.lstatSync(currentLink).isSymbolicLink(), true);
  assert.equal(fs.readlinkSync(currentLink), `versions/${json.version}`);

  // _meta.json 包含必要字段
  const meta = JSON.parse(fs.readFileSync(path.join(snapshotDir, "_meta.json"), "utf8"));
  assert.equal(meta.appNo, "PROJshare0011223344");
  assert.equal(meta.appName, "demo-project");
  assert.equal(meta.version, json.version);
});

test("share-preview export fails if dist/index.html does not exist", () => {
  const { tempDir, projectPath, taskId } = setupSharePreviewProject();
  const shareProjectsDir = path.join(tempDir, "share-projects");
  // 不写 dist，直接 export

  const result = spawnSync(
    process.execPath,
    ["scripts/share-preview.js", "export", projectPath, taskId],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: { ...process.env, WEB_DESIGN_SHARE_PROJECTS_DIR: shareProjectsDir }
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /dist\/index\.html 不存在/);
});

test("share-preview export updates current symlink on second export", () => {
  const { tempDir, projectPath, taskId } = setupSharePreviewProject();
  const shareProjectsDir = path.join(tempDir, "share-projects");

  // 第一次 export
  const distDir = path.join(projectPath, "dist");
  fs.mkdirSync(path.join(distDir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(distDir, "index.html"), "v1");

  const result1 = spawnSync(
    process.execPath,
    ["scripts/share-preview.js", "export", projectPath, taskId],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: {
        ...process.env,
        WEB_DESIGN_SHARE_PROJECTS_DIR: shareProjectsDir,
        WEB_DESIGN_NOW: "2026-07-04T09:00:00.000Z"
      }
    }
  );
  assert.equal(result1.status, 0, result1.stderr);
  const json1 = JSON.parse(result1.stdout);

  // 第二次 export（不同时间戳）
  const result2 = spawnSync(
    process.execPath,
    ["scripts/share-preview.js", "export", projectPath, taskId],
    {
      cwd: path.resolve(__dirname, ".."),
      encoding: "utf8",
      env: {
        ...process.env,
        WEB_DESIGN_SHARE_PROJECTS_DIR: shareProjectsDir,
        WEB_DESIGN_NOW: "2026-07-04T10:00:00.000Z"
      }
    }
  );
  assert.equal(result2.status, 0, result2.stderr);
  const json2 = JSON.parse(result2.stdout);

  assert.notEqual(json1.version, json2.version);

  // current 软链接已更新为第二次版本
  const currentLink = path.join(shareProjectsDir, "PROJshare0011223344", "current");
  assert.equal(fs.readlinkSync(currentLink), `versions/${json2.version}`);

  // 第一次版本目录仍保留
  const ver1Dir = path.join(shareProjectsDir, "PROJshare0011223344", "versions", json1.version);
  assert.equal(fs.existsSync(ver1Dir), true);
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design
node --test scripts/share-preview.test.js 2>&1 | tail -20
```

预期：FAIL（dist 校验、目录结构、软链接相关断言失败）

- [ ] **Step 3: 改写 `scripts/share-preview.js` 的 `exportSharePreview` 函数**

找到 `exportSharePreview` 函数，**完整替换**为：

```js
function exportSharePreview(projectPath, taskId, outputDir) {
  if (!projectPath || !taskId) {
    throw new Error("exportSharePreview requires projectPath and taskId");
  }

  const resolvedProjectPath = path.resolve(projectPath);
  const resolvedOutputDir = outputDir
    ? path.resolve(outputDir)
    : path.resolve(process.env.WEB_DESIGN_SHARE_PROJECTS_DIR || config.PROJECTS_DIR);
  const now = process.env.WEB_DESIGN_NOW ? new Date(process.env.WEB_DESIGN_NOW) : new Date();

  ensureTaskExists(resolvedProjectPath, taskId);

  // 直接复用 G7 已有 dist，不重新 build
  const distDir = path.join(resolvedProjectPath, "dist");
  const distIndexPath = path.join(distDir, "index.html");
  if (!fs.existsSync(distIndexPath)) {
    throw new Error("dist/index.html 不存在，请先完成 G7 build（node scripts/vitectrl/dev-preview.js start <project-path> --bypass false）");
  }

  const projectMeta = readProjectMeta(resolvedProjectPath);
  const { manifest } = renderManifest(resolvedProjectPath, projectMeta);
  const version = buildVersion(now);

  const appId = projectMeta.projectUid || manifest.projectId || path.basename(resolvedProjectPath);
  const appDir = path.join(resolvedOutputDir, appId);
  const versionsDir = path.join(appDir, "versions");
  const snapshotDir = path.join(versionsDir, version);
  const currentLink = path.join(appDir, "current");
  const tmpLink = path.join(appDir, "current.new");

  // 写入版本目录
  fs.mkdirSync(snapshotDir, { recursive: true });
  copyDirContents(distDir, snapshotDir);
  fs.writeFileSync(path.join(snapshotDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  const meta = {
    owner: projectMeta.author || "",
    appName: projectMeta.name || manifest.name || appId,
    appNo: appId,
    version,
    description: projectMeta.summary || "",
    uploadedBy: projectMeta.author || "",
    exportedAt: now.getTime(),
    publishedAt: now.getTime(),
    manifest
  };
  fs.writeFileSync(path.join(snapshotDir, "_meta.json"), JSON.stringify(meta, null, 2));

  // 原子更新 current 软链接
  if (fs.existsSync(tmpLink) || fs.lstatSync(tmpLink).isSymbolicLink()) {
    fs.unlinkSync(tmpLink);
  }
  fs.symlinkSync(`versions/${version}`, tmpLink);
  fs.renameSync(tmpLink, currentLink);

  return {
    appId,
    appName: meta.appName,
    version,
    snapshotPath: snapshotDir,
    outputDir: resolvedOutputDir,
    sharePreviewUrl: `${process.env.WEB_DESIGN_PREVIEW_GATEWAY_ORIGIN || "http://127.0.0.1:4173"}/apps/${appId}/`
  };
}
```

注意：`fs.lstatSync(tmpLink)` 在文件不存在时会抛出，改为：

```js
  // 原子更新 current 软链接
  try { fs.unlinkSync(tmpLink); } catch { /* 不存在则忽略 */ }
  fs.symlinkSync(`versions/${version}`, tmpLink);
  fs.renameSync(tmpLink, currentLink);
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design
node --test scripts/share-preview.test.js 2>&1 | tail -20
```

预期：所有测试 PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/share-preview.js scripts/share-preview.test.js
git commit -m "feat(share-preview): reuse G7 dist, write versioned dir with current symlink"
```

---

## Task 2: gateway.js — discoverApps 适配新目录结构

**Files:**
- Modify: `serve/gateway.js`
- Modify: `serve/gateway.test.js`

**Interfaces:**
- Consumes: `PROJECTS_DIR/<appId>/current/_meta.json`（Task 1 写入的结构）
- Produces: `discoverApps` 返回的 `app.rootDir` 指向 `<appId>/current`（软链接，serve 跟随解析）

- [ ] **Step 1: 更新 `serve/gateway.test.js` 的 `createProject` helper**

找到现有 `createProject` 函数，**替换**为支持新目录结构的版本：

```js
function createProject(projectsDir, options = {}) {
  const appId = options.appId || "APP_DEMO_001";
  const version = options.version || "v202607030001-demo";

  // 新结构：<appId>/versions/<version>/ + <appId>/current -> versions/<version>
  const appDir = path.join(projectsDir, appId);
  const versionDir = path.join(appDir, "versions", version);
  const currentLink = path.join(appDir, "current");

  fs.mkdirSync(path.join(versionDir, "assets"), { recursive: true });
  fs.writeFileSync(
    path.join(versionDir, "index.html"),
    options.indexHtml ||
      [
        "<!doctype html>",
        "<html>",
        "  <head>",
        `    <base href="/apps/${appId}/">`,
        `    <script>window.__BASENAME__="/apps/${appId}/";</script>`,
        "    <meta charset=\"utf-8\" />",
        "    <title>Demo App</title>",
        `    <script type="module" src="/apps/${appId}/assets/main.js"></script>`,
        "  </head>",
        "  <body>",
        "    <div id=\"root\"></div>",
        "  </body>",
        "</html>"
      ].join("\n")
  );
  fs.writeFileSync(path.join(versionDir, "assets", "main.js"), "console.log('demo');\n");
  fs.writeFileSync(path.join(versionDir, "assets", "main.css"), "body{background:#fff;}\n");
  writeJson(path.join(versionDir, "_meta.json"), {
    appName: options.appName || "demo-app",
    appNo: appId,
    manifest: {
      proxy: {
        routes: options.routes || []
      }
    }
  });

  // 创建 current 软链接
  try { fs.unlinkSync(currentLink); } catch { /* 不存在则忽略 */ }
  fs.symlinkSync(`versions/${version}`, currentLink);

  return versionDir;
}
```

在 `gateway.test.js` 末尾新增一个测试，验证旧结构（无 `current/`）被跳过：

```js
test("discoverApps skips directories without current symlink (legacy structure)", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-legacy-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });

  // 新结构：有 current 软链接
  createProject(projectsDir, { appId: "APP_NEW" });

  // 旧结构：直接在 <subdir>/ 下放 index.html 和 _meta.json（无 current/）
  const legacyDir = path.join(projectsDir, "APP_LEGACY");
  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(path.join(legacyDir, "index.html"), "<!doctype html><html></html>");
  writeJson(path.join(legacyDir, "_meta.json"), { appNo: "APP_LEGACY", appName: "legacy" });

  const apps = discoverApps({ projectsDir });

  assert.equal(apps.length, 1);
  assert.equal(apps[0].appId, "APP_NEW");
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/serve
node --test gateway.test.js 2>&1 | grep -E "FAIL|PASS|Error" | head -20
```

预期：多个测试 FAIL（discoverApps 还读旧路径，找不到新结构的 `_meta.json`）

- [ ] **Step 3: 改写 `gateway.js` 的 `discoverApps`**

找到 `discoverApps` 函数，**完整替换**：

```js
function discoverApps({ projectsDir }) {
  if (!projectsDir || !fs.existsSync(projectsDir)) {
    return [];
  }

  return fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const appDir = path.join(projectsDir, entry.name);
      const currentLink = path.join(appDir, "current");
      const metaFile = path.join(currentLink, "_meta.json");
      const indexFile = path.join(currentLink, "index.html");

      // 跳过无 current/ 的目录（旧结构或非 app 目录）
      let currentStat;
      try {
        currentStat = fs.lstatSync(currentLink);
      } catch {
        return null;
      }
      if (!currentStat.isSymbolicLink() && !currentStat.isDirectory()) {
        return null;
      }

      if (!fs.existsSync(metaFile) || !fs.existsSync(indexFile)) {
        return null;
      }

      const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
      const appId = meta.appNo || meta.appId || entry.name;
      const proxyRoutes = Array.isArray(meta.manifest?.proxy?.routes)
        ? [...meta.manifest.proxy.routes]
            .filter((route) => route && route.prefix && route.upstreamOrigin)
            .sort((left, right) => right.prefix.length - left.prefix.length)
        : [];

      // rootDir 指向 current（软链接），fs 自动跟随解析实际版本目录
      const rootDir = currentLink;

      return {
        appId,
        appName: meta.appName || appId,
        rootDir,
        indexFile,
        proxyRoutes,
        projectNo: meta.manifest?.projectId || meta.projectNo || "",
        manifest: meta.manifest || {}
      };
    })
    .filter(Boolean);
}
```

- [ ] **Step 4: 改写 `readProjectsSignature`**

找到 `readProjectsSignature` 函数，**完整替换**：

```js
function readProjectsSignature(projectsDir) {
  if (!projectsDir || !fs.existsSync(projectsDir)) {
    return "missing";
  }

  const rootStat = fs.statSync(projectsDir);
  const entries = fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const currentLink = path.join(projectsDir, entry.name, "current");
      try {
        // 读软链接本身的 mtime（lstatSync 不跟随软链接）
        // 软链接每次被 renameSync 替换时 mtime 更新，触发 discoverApps 刷新
        const linkStat = fs.lstatSync(currentLink);
        return `${entry.name}:${linkStat.mtimeMs}`;
      } catch {
        // 无 current 的目录（旧结构）：用目录本身 mtime
        return `${entry.name}:${fs.statSync(path.join(projectsDir, entry.name)).mtimeMs}`;
      }
    })
    .sort();

  return `${rootStat.mtimeMs}:${entries.join("|")}`;
}
```

- [ ] **Step 5: 运行测试确认通过**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/serve
node --test gateway.test.js 2>&1 | tail -20
```

预期：所有测试 PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design
git add serve/gateway.js serve/gateway.test.js
git commit -m "feat(gateway): discoverApps reads <appId>/current symlink structure"
```

---

## Task 3: dev-preview.js — bypass 默认改 false，build 写 dist-tmp，输出 viteUrl

**Files:**
- Modify: `scripts/vitectrl/dev-preview.js`
- Modify: `scripts/vitectrl/lib/controller.js`
- Modify: `scripts/vitectrl.test.js`

**Interfaces:**
- Consumes: 无上游任务依赖
- Produces:
  - stdout JSON 新增 `viteUrl`（`http://127.0.0.1:<port>`），移除 `previewGatewayUrl`
  - build 成功后 `dist/` 存在；build 失败后 `dist/` 原样保留（`dist-tmp/` 已清理）

- [ ] **Step 1: 写失败测试**

在 `scripts/vitectrl.test.js` 中新增以下测试（追加到文件末尾）：

```js
test("dev-preview start outputs viteUrl and no previewGatewayUrl", () => {
  // 此测试只验证输出字段名，不实际启动 Vite 进程
  // 通过检查 dev-preview.js 源码中的 JSON 拼装逻辑验证
  const src = require("node:fs").readFileSync(
    require("node:path").resolve(__dirname, "vitectrl/dev-preview.js"),
    "utf8"
  );
  assert.match(src, /viteUrl/, "应输出 viteUrl");
  assert.doesNotMatch(src, /previewGatewayUrl/, "不应再输出 previewGatewayUrl");
});

test("dev-preview bypass defaults to false", () => {
  const src = require("node:fs").readFileSync(
    require("node:path").resolve(__dirname, "vitectrl/dev-preview.js"),
    "utf8"
  );
  // bypassAuth 默认值：options.bypass !== "false" 的逻辑中，空字符串应为 false
  assert.match(src, /bypass.*false|false.*bypass/, "bypass 默认应为 false");
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design
node --test scripts/vitectrl.test.js 2>&1 | tail -20
```

预期：2 个新测试 FAIL

- [ ] **Step 3: 修改 `scripts/vitectrl/dev-preview.js`**

**3a. 修改 bypass 默认值**（第 50 行附近）：

```js
// 旧：
const bypassAuth = options.bypass === "" ? true : options.bypass !== "false";
// 改为：
const bypassAuth = options.bypass === "true";
```

**3b. 修改 start case 的输出**（替换 `previewGatewayUrl` 为 `viteUrl`）：

```js
// 旧：
process.stdout.write(
  `${JSON.stringify(
    {
      ...result,
      previewGatewayUrl: buildPreviewGatewayUrl(projectPath)
    },
    null,
    2
  )}\n`
);
// 改为：
process.stdout.write(
  `${JSON.stringify(
    {
      ...result,
      viteUrl: result.url
    },
    null,
    2
  )}\n`
);
```

删除文件中 `buildPreviewGatewayUrl` 函数定义（第 29-37 行）及其所有调用。

- [ ] **Step 4: 修改 `scripts/vitectrl/lib/controller.js` — build 写 dist-tmp**

找到 `startManagedPreview` 内调用 `npm run build` 的位置（`execFileSync` 或 `spawnSync`），**替换**为：

```js
const distTmpDir = path.join(resolvedProjectPath, "dist-tmp");
const distDir = path.join(resolvedProjectPath, "dist");

// 清理上次残留的 dist-tmp
try { fs.rmSync(distTmpDir, { recursive: true, force: true }); } catch { /* ignore */ }

try {
  execFileSync("npm", ["run", "build", "--", "--outDir", "dist-tmp"], {
    cwd: resolvedProjectPath,
    stdio: "pipe",
    timeout: 300_000,
    env: {
      ...process.env,
      VITE_SSO_BYPASS: "false"
    }
  });
} catch (buildError) {
  // build 失败，清理 dist-tmp，保留原 dist
  try { fs.rmSync(distTmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  throw new Error(`Build failed: ${buildError.message}`);
}

// build 成功，原子替换 dist
fs.renameSync(distTmpDir, distDir);
```

注意：如果 `controller.js` 当前没有 build 步骤（Vite `run dev` 不需要 build），则此步骤**不适用**——查看 `controller.js` 实际内容确认。

- [ ] **Step 5: 确认 controller.js 是否有 build 步骤**

```bash
grep -n "build\|npm run\|execFile" /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/scripts/vitectrl/lib/controller.js | head -20
```

若无 build 调用（`dev-preview.js start` 只启动 `vite dev` 进程，不 build），则 Step 4 跳过，build 保护逻辑不需要在此处实现。G7 build 由 SKILL.md 步骤指导 agent 手动执行 `npm run build`，`dist-tmp` 方案不适用。

- [ ] **Step 6: 运行测试确认通过**

```bash
cd /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design
node --test scripts/vitectrl.test.js 2>&1 | tail -20
```

预期：所有测试 PASS

- [ ] **Step 7: Commit**

```bash
git add scripts/vitectrl/dev-preview.js scripts/vitectrl/lib/controller.js scripts/vitectrl.test.js
git commit -m "feat(dev-preview): bypass defaults false, output viteUrl, remove previewGatewayUrl"
```

---

## Task 4: SKILL.md — 更新 Step 12 / Step 14，删除 previewGatewayUrl

**Files:**
- Modify: `SKILL.md`

**Interfaces:**
- 无代码接口，纯文档改动
- 依赖 Task 1-3 的实现（确认命令签名正确后再改文档）

- [ ] **Step 1: 修改 SKILL.md Step 12（G6→G7 build 条件）**

找到 SKILL.md 第 192-199 行（`12. 开发完成后执行...`），做以下修改：

**将**：
```
12. 开发完成后执行 `node scripts/vitectrl/dev-preview.js start <project-path> [--bypass true|false]`
   - 该脚本负责统一启动 dev preview，并自动治理由 `web-design` 管理过的 Vite 服务
   - 同一 `project-path` 若已有旧的 managed dev preview，启动新服务前必须自动关闭旧服务
   - 全局最多只保留最近 5 个 managed dev preview；超出的最老服务必须自动关闭释放端口
   - `--bypass` 默认是 `true`；传 `--bypass false` 时必须把 `.env.local` 中的 `VITE_SSO_BYPASS` 显式同步为 `false`，覆盖历史残留值
   - `.env.local` 由 `.gitignore` 保护，不进仓库；开发预览允许 bypass，但分享预览和发布构建都禁止复用该 bypass
   - 启动成功后，优先把 `previewGatewayUrl` 发给用户，用户应通过 `serve` 的登录引导地址进入开发预览，而不是直接打开 Vite 原始端口
   - 分享预览必须走独立导出：`node scripts/share-preview.js export <project-path> <task-id>`；该导出会强制以 `VITE_SSO_BYPASS=false` 执行构建，并把静态快照写入供 `serve` 消费的目录，同时返回 `sharePreviewUrl`
```

**替换为**：
```
12. 开发完成后执行 `node scripts/vitectrl/dev-preview.js start <project-path> --bypass false`
   - `--bypass false` 为必传参数，确保启动和 build 均以 `VITE_SSO_BYPASS=false` 执行，与 G8 用户验收环境一致
   - 该脚本负责统一启动 dev preview，并自动治理由 `web-design` 管理过的 Vite 服务
   - 同一 `project-path` 若已有旧的 managed dev preview，启动新服务前必须自动关闭旧服务
   - 全局最多只保留最近 5 个 managed dev preview；超出的最老服务必须自动关闭释放端口
   - `.env.local` 由 `.gitignore` 保护，不进仓库
   - 启动成功后取返回值中的 `viteUrl`（Vite 原始端口，如 `http://127.0.0.1:517x`），用于 Step 13 的 CDP 截图和审计
```

- [ ] **Step 2: 修改 SKILL.md Step 14（G7→G8 用户验收）**

找到 SKILL.md 第 210-216 行（`14. 🔴 **[必须执行·不可跳过]**...`），做以下修改：

**将**：
```
14. 🔴 **[必须执行·不可跳过]** 主动在浏览器打开启动的服务,并把访问地址发给用户
   - 本步骤与 CDP 截图无关，token 成本为零，不受上下文压力、截图预算、HANDOFF 状态影响，任何情况不得省略
   - 执行命令：`open <preview-url>`；若命令失败，必须补发纯文本提示
```

**替换为**：
```
14. 🔴 **[必须执行·不可跳过]** 执行 share-preview 导出，把 serve 访问地址发给用户
   - 本步骤与 CDP 截图无关，token 成本为零，不受上下文压力、截图预算、HANDOFF 状态影响，任何情况不得省略
   - 执行命令：`node scripts/share-preview.js export <project-path> <task-id>`
   - 取返回值中的 `sharePreviewUrl`，执行 `open <sharePreviewUrl>`；若命令失败，必须补发纯文本提示
   - `sharePreviewUrl` 路径格式为 `/apps/<appId>/`，用户通过 serve 的 SSO 引导访问，体验与发布环境一致
   - 浏览地址必须以纯文本形式输出，禁止使用 Markdown 链接
```

- [ ] **Step 3: 删除 previewGatewayUrl 残留引用**

搜索并删除 SKILL.md 中所有 `previewGatewayUrl` 字样（全文搜索确认）：

```bash
grep -n "previewGatewayUrl" /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/SKILL.md
```

逐行确认并手动删除或替换（无需保留任何提及）。

- [ ] **Step 4: 确认修改无遗漏**

```bash
grep -n "previewGatewayUrl\|--bypass true\|bypass.*默认.*true" /Users/za-stanlexu/my-marketplace-skills/plugins/coding/web-design/SKILL.md
```

预期：无输出

- [ ] **Step 5: Commit**

```bash
git add SKILL.md
git commit -m "docs(SKILL): Step12 bypass=false, Step14 share-preview export, remove previewGatewayUrl"
```

---

## Self-Review

**Spec coverage 检查：**

| Spec 要求 | 对应 Task |
|-----------|-----------|
| share-preview 不重新 build，复用 dist | Task 1 Step 3 |
| dist 不存在时 fail | Task 1 Step 3（前置校验） |
| 目录结构 `<appId>/versions/<ver>/` + `current` 软链接 | Task 1 Step 3 |
| 软链接原子更新 | Task 1 Step 3（`current.new` → rename） |
| discoverApps 读 `current/_meta.json` | Task 2 Step 3 |
| 旧结构目录跳过 | Task 2 Step 1（测试）+ Step 3（实现） |
| `readProjectsSignature` 读软链接本身 mtime | Task 2 Step 4 |
| dev-preview bypass 默认改 false | Task 3 Step 3a |
| 输出 `viteUrl` 替换 `previewGatewayUrl` | Task 3 Step 3b |
| build 写 dist-tmp（按需） | Task 3 Step 4-5 |
| build timeout 300s | Task 3 Step 4 |
| SKILL.md Step 12 改 bypass=false + viteUrl | Task 4 Step 1 |
| SKILL.md Step 14 改 share-preview export | Task 4 Step 2 |
| 删除 previewGatewayUrl | Task 4 Step 3 |

**Placeholder 扫描：** 无 TBD/TODO。

**Type 一致性：**
- `viteUrl`：Task 3 Step 3b 输出，Task 4 Step 1 在 SKILL.md 中引用，名称一致
- `sharePreviewUrl`：Task 1 返回值，Task 4 Step 2 引用，名称一致
- `current` 软链接路径：Task 1 Step 3 写入，Task 2 Step 3 读取，路径 `<appId>/current` 一致
