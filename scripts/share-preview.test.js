const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function setupSharePreviewProject() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-share-preview-"));
  const projectPath = path.join(tempDir, "demo-project");
  const taskId = "20260704-010203-homepage";
  const taskDir = path.join(projectPath, ".webdesign", "tasks", taskId);

  fs.mkdirSync(path.join(projectPath, "src"), { recursive: true });
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(path.join(projectPath, "src", "main.js"), "console.log('share-preview');");
  fs.writeFileSync(path.join(projectPath, ".env.local"), "VITE_SSO_BYPASS=true\n", "utf8");

  fs.writeFileSync(
    path.join(projectPath, "package.json"),
    JSON.stringify(
      {
        name: "demo-project",
        private: true,
        scripts: {
          build: "node build-script.cjs"
        }
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(projectPath, "build-script.cjs"),
    [
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "const distDir = path.join(process.cwd(), 'dist', 'assets');",
      "fs.mkdirSync(distDir, { recursive: true });",
      "fs.writeFileSync(path.join(process.cwd(), 'dist', 'index.html'), `<!doctype html><html><body>bypass=${process.env.VITE_SSO_BYPASS || ''}</body></html>`);",
      "fs.writeFileSync(path.join(distDir, 'main.js'), 'console.log(\"shared\")');"
    ].join("\n")
  );

  fs.writeFileSync(
    path.join(projectPath, ".webdesign", "project.json"),
    JSON.stringify(
      {
        projectUid: "PROJshare0011223344",
        name: "demo-project",
        summary: "Demo share preview",
        author: "stanley",
        template: "scaffold",
        createdAt: "2026-07-04T01:00:00.000Z",
        updatedAt: "2026-07-04T01:00:00.000Z",
        currentTaskId: taskId,
        sourceZipPath: "",
        distZipPath: ""
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(projectPath, ".webdesign", "manifest.json"),
    JSON.stringify(
      {
        projectId: "<project-name>",
        name: "<project summary or name>",
        entry: "dist/index.html",
        owner: "<project.json.author or empty>",
        proxy: {
          routes: [
            {
              prefix: "/orders",
              upstreamOrigin: "http://localhost:3000"
            }
          ]
        }
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(taskDir, "workflow.json"),
    JSON.stringify(
      {
        taskId,
        pageSlug: "homepage",
        intent: "create",
        currentGate: "G7_STATIC_AUDIT_PASSED",
        blocked: false,
        blockReason: "",
        userConfirmations: [],
        history: [],
        createdAt: "2026-07-04T01:00:00.000Z",
        updatedAt: "2026-07-04T01:00:00.000Z"
      },
      null,
      2
    )
  );

  return { tempDir, projectPath, taskId };
}

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

test("share-preview export uses configured preview gateway origin when provided", () => {
  const { tempDir, projectPath, taskId } = setupSharePreviewProject();
  const shareProjectsDir = path.join(tempDir, "share-projects");

  // 预先写入 dist
  const distDir = path.join(projectPath, "dist");
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, "index.html"), "<!doctype html><html><body>prebuilt</body></html>");

  const result = spawnSync(process.execPath, ["scripts/share-preview.js", "export", projectPath, taskId], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    env: {
      ...process.env,
      WEB_DESIGN_SHARE_PROJECTS_DIR: shareProjectsDir,
      WEB_DESIGN_PREVIEW_GATEWAY_ORIGIN: "http://preview.example.com:7788"
    }
  });

  assert.equal(result.status, 0, result.stderr);
  const json = JSON.parse(result.stdout);
  assert.equal(json.sharePreviewUrl, "http://preview.example.com:7788/apps/PROJshare0011223344/");
});
