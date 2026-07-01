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

function gateCommand(args, env = {}) {
  return spawnSync(process.execPath, ["scripts/gate.js", ...args], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, ...env },
    encoding: "utf8"
  });
}

function readWorkflow(projectPath, taskId) {
  return JSON.parse(
    fs.readFileSync(
      path.join(projectPath, ".webdesign", "tasks", taskId, "workflow.json"),
      "utf8"
    )
  );
}

function productSyncCommand(args, env = {}) {
  return spawnSync(process.execPath, ["scripts/product-sync.js", ...args], {
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

function syncNoApiProduct(projectPath, taskId) {
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
}

test("gate advances through legal order and requires confirms on confirmation gates", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gate-"));
  const { projectPath, taskId } = initProject(tempDir);

  assert.equal(gateCommand(["advance", projectPath, taskId]).status, 0);
  syncNoApiProduct(projectPath, taskId);
  const missingProductConfirm = gateCommand(["advance", projectPath, taskId]);
  assert.equal(missingProductConfirm.status, 1);
  assert.match(missingProductConfirm.stderr, /confirm/i);

  assert.equal(
    gateCommand(["advance", projectPath, taskId, "--confirm", "需求确认通过"]).status,
    0
  );
  assert.equal(gateCommand(["advance", projectPath, taskId]).status, 0);

  const missingDesignConfirm = gateCommand(["advance", projectPath, taskId]);
  assert.equal(missingDesignConfirm.status, 1);
  assert.match(missingDesignConfirm.stderr, /confirm/i);

  assert.equal(
    gateCommand(["advance", projectPath, taskId, "--confirm", "设计确认通过"]).status,
    0
  );

  assert.equal(readWorkflow(projectPath, taskId).currentGate, "G5_DESIGN_CONFIRMED");
});

test("gate blocks G2 to G3 until product-sync records API state", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gate-"));
  const { projectPath, taskId } = initProject(tempDir);

  assert.equal(gateCommand(["advance", projectPath, taskId]).status, 0);

  const blockedResult = gateCommand([
    "advance",
    projectPath,
    taskId,
    "--confirm",
    "需求确认通过"
  ]);
  assert.equal(blockedResult.status, 1);
  assert.match(blockedResult.stderr, /product-sync|apiState|同步/i);

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

  const syncResult = productSyncCommand([projectPath, taskId]);
  assert.equal(syncResult.status, 0, syncResult.stderr);

  const passResult = gateCommand([
    "advance",
    projectPath,
    taskId,
    "--confirm",
    "需求确认通过"
  ]);
  assert.equal(passResult.status, 0, passResult.stderr);
  assert.equal(readWorkflow(projectPath, taskId).currentGate, "G3_PRODUCT_CONFIRMED");
});

test("gate blocks G6 to G7 when audit.md is not PASS", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gate-"));
  const { projectPath, taskId } = initProject(tempDir);

  gateCommand(["advance", projectPath, taskId]);
  syncNoApiProduct(projectPath, taskId);
  gateCommand(["advance", projectPath, taskId, "--confirm", "需求确认通过"]);
  gateCommand(["advance", projectPath, taskId]);
  gateCommand(["advance", projectPath, taskId, "--confirm", "设计确认通过"]);
  gateCommand(["advance", projectPath, taskId]);

  const auditResult = gateCommand(["advance", projectPath, taskId]);
  assert.equal(auditResult.status, 1);
  assert.match(auditResult.stderr, /audit/i);
});

test("G9_PUBLISH_READY cannot advance directly to DONE", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gate-"));
  const { projectPath, taskId } = initProject(tempDir);
  const taskDir = path.join(projectPath, ".webdesign", "tasks", taskId);

  gateCommand(["advance", projectPath, taskId]);
  syncNoApiProduct(projectPath, taskId);
  gateCommand(["advance", projectPath, taskId, "--confirm", "需求确认通过"]);
  gateCommand(["advance", projectPath, taskId]);
  gateCommand(["advance", projectPath, taskId, "--confirm", "设计确认通过"]);
  gateCommand(["advance", projectPath, taskId]);
  fs.writeFileSync(path.join(taskDir, "audit.md"), "# Audit\n\nconclusion: PASS\n");
  gateCommand(["advance", projectPath, taskId]);
  gateCommand(["advance", projectPath, taskId]);
  gateCommand(["advance", projectPath, taskId, "--confirm", "可以发布"]);

  const result = gateCommand(["advance", projectPath, taskId]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /publish/i);
});

test("reopen-dev returns previewed task to G6_DEVELOPMENT", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gate-"));
  const { projectPath, taskId } = initProject(tempDir);
  const taskDir = path.join(projectPath, ".webdesign", "tasks", taskId);

  gateCommand(["advance", projectPath, taskId]);
  syncNoApiProduct(projectPath, taskId);
  gateCommand(["advance", projectPath, taskId, "--confirm", "需求确认通过"]);
  gateCommand(["advance", projectPath, taskId]);
  gateCommand(["advance", projectPath, taskId, "--confirm", "设计确认通过"]);
  gateCommand(["advance", projectPath, taskId]);
  fs.writeFileSync(path.join(taskDir, "audit.md"), "# Audit\n\nconclusion: PASS\n");
  gateCommand(["advance", projectPath, taskId]);
  gateCommand(["advance", projectPath, taskId]);

  const result = gateCommand([
    "reopen-dev",
    projectPath,
    taskId,
    "--reason",
    "用户要求修改页面"
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readWorkflow(projectPath, taskId).currentGate, "G6_DEVELOPMENT");
});
