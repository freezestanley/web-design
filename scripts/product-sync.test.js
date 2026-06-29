const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function initProject(tempDir) {
  const result = spawnSync(
    process.execPath,
    ["scripts/init-project.js", "demo-project", "homepage", "create", "--summary", "Demo project"],
    {
      cwd: path.resolve(__dirname, ".."),
      env: {
        ...process.env,
        WEB_DESIGN_PROJECTS_DIR: tempDir,
        WEB_DESIGN_NOW: "2026-06-25T10:20:30.000Z",
        WEB_DESIGN_PROJECT_UID: "PROJaabbccddeeff0011",
        SESSION_KEY: "agent:agent-1:web:902:dm:session-1"
      },
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  return {
    projectPath: path.join(tempDir, "demo-project"),
    taskId: "20260625-102030-homepage"
  };
}

function productSyncCommand(args, env = {}) {
  return spawnSync(process.execPath, ["scripts/product-sync.js", ...args], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, ...env },
    encoding: "utf8"
  });
}

function gateCommand(args, env = {}) {
  return spawnSync(process.execPath, ["scripts/gate.js", ...args], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, ...env },
    encoding: "utf8"
  });
}

function writeProduct(projectPath, taskId, content) {
  fs.writeFileSync(
    path.join(projectPath, ".webdesign", "tasks", taskId, "product.md"),
    content
  );
}

function readWorkflow(projectPath, taskId) {
  return JSON.parse(
    fs.readFileSync(
      path.join(projectPath, ".webdesign", "tasks", taskId, "workflow.json"),
      "utf8"
    )
  );
}

function readManifest(projectPath) {
  return JSON.parse(
    fs.readFileSync(path.join(projectPath, "manifest.json"), "utf8")
  );
}

test("product-sync marks no-api products and keeps proxy routes empty", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-product-sync-"));
  const { projectPath, taskId } = initProject(tempDir);

  writeProduct(
    projectPath,
    taskId,
    `# Product - demo-project

## 页面主题
homepage

## 页面素材

## 文案

## 接口状态
none

## API接口
本页面为纯静态展示，无接口依赖。

## 动效

## 受众

## 场景

## 验收要求
`
  );

  const result = productSyncCommand([projectPath, taskId]);
  assert.equal(result.status, 0, result.stderr);

  const workflow = readWorkflow(projectPath, taskId);
  assert.equal(workflow.apiState.status, "none");
  assert.ok(workflow.apiState.sourceHash);
  assert.ok(workflow.apiState.syncedAt);
  assert.equal(workflow.apiState.routeCount, 0);
  assert.deepEqual(workflow.apiState.routes, []);
  assert.equal(readManifest(projectPath).projectId, "PROJaabbccddeeff0011");
  assert.equal(readManifest(projectPath).name, "Demo project");
  assert.deepEqual(readManifest(projectPath).proxy.routes, []);
  assert.equal(gateCommand(["advance", projectPath, taskId]).status, 0);
  assert.equal(
    gateCommand(["advance", projectPath, taskId, "--confirm", "需求确认通过"]).status,
    0
  );
});

test("product-sync extracts proxy routes for provided APIs", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-product-sync-"));
  const { projectPath, taskId } = initProject(tempDir);

  writeProduct(
    projectPath,
    taskId,
    `# Product - demo-project

## 页面主题
homepage

## 页面素材

## 文案

## 接口状态
provided

## API接口
- upstreamOrigin：http://api.example.com
- GET /api/app-center/projects
- POST /api/user-center/login

## 动效

## 受众

## 场景

## 验收要求
`
  );

  const result = productSyncCommand([projectPath, taskId]);
  assert.equal(result.status, 0, result.stderr);

  const workflow = readWorkflow(projectPath, taskId);
  assert.equal(workflow.apiState.status, "provided");
  assert.equal(workflow.apiState.routeCount, 2);
  assert.deepEqual(workflow.apiState.routes, [
    { prefix: "/user-center", upstreamOrigin: "http://api.example.com" },
    { prefix: "/app-center", upstreamOrigin: "http://api.example.com" }
  ]);
  assert.deepEqual(readManifest(projectPath).proxy.routes, workflow.apiState.routes);
  assert.equal(gateCommand(["advance", projectPath, taskId]).status, 0);
  assert.equal(
    gateCommand(["advance", projectPath, taskId, "--confirm", "需求确认通过"]).status,
    0
  );
});

test("product-sync rejects pending API status", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-product-sync-"));
  const { projectPath, taskId } = initProject(tempDir);

  writeProduct(
    projectPath,
    taskId,
    `# Product - demo-project

## 页面主题
homepage

## 页面素材

## 文案

## 接口状态
pending

## API接口
待补充

## 动效

## 受众

## 场景

## 验收要求
`
  );

  const result = productSyncCommand([projectPath, taskId]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /pending|接口状态/i);
  assert.equal(fs.existsSync(path.join(projectPath, "manifest.json")), false);
  assert.equal(gateCommand(["advance", projectPath, taskId]).status, 0);
  const gateResult = gateCommand(["advance", projectPath, taskId, "--confirm", "需求确认通过"]);
  assert.equal(gateResult.status, 1);
  assert.match(gateResult.stderr, /product-sync|apiState|同步/i);
});

test("product-sync preserves multiple upstream origins in the rendered manifest", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-product-sync-"));
  const { projectPath, taskId } = initProject(tempDir);

  writeProduct(
    projectPath,
    taskId,
    `# Product - demo-project

## 页面主题
homepage

## 页面素材

## 文案

## 接口状态
provided

## API接口
- upstreamOrigin：http://api-a.example.com
- GET /api/app-center/projects
- POST /api/app-center/search
- upstreamOrigin：http://api-b.example.com
- GET /api/user-center/profile
- POST /api/user-center/logout

## 动效

## 受众

## 场景

## 验收要求
`
  );

  const result = productSyncCommand([projectPath, taskId]);
  assert.equal(result.status, 0, result.stderr);

  const workflow = readWorkflow(projectPath, taskId);
  assert.deepEqual(workflow.apiState.routes, [
    { prefix: "/user-center", upstreamOrigin: "http://api-b.example.com" },
    { prefix: "/app-center", upstreamOrigin: "http://api-a.example.com" }
  ]);
  assert.deepEqual(readManifest(projectPath).proxy.routes, workflow.apiState.routes);
});
