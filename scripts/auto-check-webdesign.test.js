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
        WEB_DESIGN_NOW: "2026-07-01T08:00:00.000Z",
        WEB_DESIGN_PROJECT_UID: "PROJaabbccddeeff0011",
        SESSION_KEY: "agent:agent-1:web:902:dm:session-1"
      },
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  return {
    projectPath: path.join(tempDir, "demo-project"),
    taskId: "20260701-080000-homepage"
  };
}

function gateCommand(args) {
  return spawnSync(process.execPath, ["scripts/gate.js", ...args], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env },
    encoding: "utf8"
  });
}

function writeProduct(projectPath, taskId) {
  fs.writeFileSync(
    path.join(projectPath, ".webdesign", "tasks", taskId, "product.md"),
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
}

function productSyncCommand(args) {
  return spawnSync(process.execPath, ["scripts/product-sync.js", ...args], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env },
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

function writeWorkflow(projectPath, taskId, workflow) {
  fs.writeFileSync(
    path.join(projectPath, ".webdesign", "tasks", taskId, "workflow.json"),
    JSON.stringify(workflow, null, 2)
  );
}

function runHeartbeatCheck(projectsDir) {
  return runHeartbeatCheckWithEnv(projectsDir);
}

function runHeartbeatCheckWithEnv(projectsDir, env = {}) {
  const heartbeatMemoryDir = path.join(projectsDir, ".heartbeat-memory");
  return spawnSync(process.execPath, ["heartbear/scripts/auto-check-webdesign.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      PROJECTS_DIR: projectsDir,
      WEBDESIGN_DIR: path.resolve(__dirname, ".."),
      HEARTBEAT_MEMORY_DIR: heartbeatMemoryDir,
      ...env
    },
    encoding: "utf8"
  });
}

function parseHeartbeatEntries(stdout) {
  const outputLines = stdout.trim().split("\n");
  const jsonStart = outputLines.findIndex((line) => line.startsWith("["));
  assert.notEqual(jsonStart, -1, "expected JSON payload in stdout");
  return JSON.parse(outputLines.slice(jsonStart).join("\n"));
}

test("heartbeat check reports ready_for_next_gate without auto-advancing workflow", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-heartbeat-"));
  const { projectPath, taskId } = initProject(tempDir);

  assert.equal(gateCommand(["advance", projectPath, taskId]).status, 0);
  writeProduct(projectPath, taskId);
  assert.equal(productSyncCommand([projectPath, taskId]).status, 0);
  assert.equal(gateCommand(["advance", projectPath, taskId, "--confirm", "需求确认通过"]).status, 0);
  assert.equal(gateCommand(["advance", projectPath, taskId]).status, 0);
  assert.equal(gateCommand(["advance", projectPath, taskId, "--confirm", "设计确认通过"]).status, 0);

  fs.mkdirSync(path.join(projectPath, "src", "pages"), { recursive: true });
  fs.writeFileSync(path.join(projectPath, "src", "pages", "homepage.jsx"), "export default null;\n");

  const result = runHeartbeatCheck(tempDir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /⚠️ 发现需要关注的任务：/);
  assert.match(result.stdout, /ready_for_next_gate|请推进到下一 gate|推进到开发阶段/i);

  const entries = parseHeartbeatEntries(result.stdout);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].project, "demo-project");
  assert.equal(entries[0].taskId, taskId);
  assert.equal(entries[0].gate, "G5_DESIGN_CONFIRMED");
  assert.equal(entries[0].status, "ready_for_next_gate");
  assert.equal(entries[0].severity, "warn");
  assert.equal(entries[0].blocked, false);
  assert.equal(readWorkflow(projectPath, taskId).currentGate, "G5_DESIGN_CONFIRMED");
});

test("heartbeat uses progress summary for stale development tasks and suppresses duplicate alerts during cooldown", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-heartbeat-"));
  const { projectPath, taskId } = initProject(tempDir);
  const taskPath = path.join(projectPath, ".webdesign", "tasks", taskId);
  const progressDir = path.join(taskPath, "progress");
  const progressFile = path.join(progressDir, "latest.md");

  assert.equal(gateCommand(["advance", projectPath, taskId]).status, 0);
  writeProduct(projectPath, taskId);
  assert.equal(productSyncCommand([projectPath, taskId]).status, 0);
  assert.equal(gateCommand(["advance", projectPath, taskId, "--confirm", "需求确认通过"]).status, 0);
  assert.equal(gateCommand(["advance", projectPath, taskId]).status, 0);
  assert.equal(gateCommand(["advance", projectPath, taskId, "--confirm", "设计确认通过"]).status, 0);
  assert.equal(gateCommand(["advance", projectPath, taskId]).status, 0);

  const workflow = readWorkflow(projectPath, taskId);
  workflow.updatedAt = "2026-07-01T08:00:10.000Z";
  writeWorkflow(projectPath, taskId, workflow);

  fs.mkdirSync(progressDir, { recursive: true });
  fs.writeFileSync(
    progressFile,
    [
      "stage: build",
      "task: footer",
      "status: done",
      "summary: footer 组件完成，已含桌面/移动布局。",
      "next: implement newsletter form",
      "updatedAt: 2026-07-01T08:00:10.000Z"
    ].join("\n")
  );

  const beforeStale = runHeartbeatCheckWithEnv(tempDir, {
    HEARTBEAT_NOW: "2026-07-01T08:00:20.000Z",
    HEARTBEAT_DEV_STALE_SECONDS: "30",
    HEARTBEAT_DEV_COOLDOWN_SECONDS: "120"
  });
  assert.equal(beforeStale.status, 0, beforeStale.stderr);
  assert.doesNotMatch(beforeStale.stdout, /⚠️ 发现需要关注的任务：/);

  const stale = runHeartbeatCheckWithEnv(tempDir, {
    HEARTBEAT_NOW: "2026-07-01T08:00:50.000Z",
    HEARTBEAT_DEV_STALE_SECONDS: "30",
    HEARTBEAT_DEV_COOLDOWN_SECONDS: "120"
  });
  assert.equal(stale.status, 0, stale.stderr);
  assert.match(stale.stdout, /⚠️ 发现需要关注的任务：/);
  assert.match(stale.stdout, /footer 组件完成/);
  assert.match(stale.stdout, /implement newsletter form/);

  const staleEntries = parseHeartbeatEntries(stale.stdout);
  assert.equal(staleEntries[0].status, "stalled");
  assert.equal(staleEntries[0].progressSummary, "footer 组件完成，已含桌面/移动布局。");
  assert.equal(staleEntries[0].progressNext, "implement newsletter form");

  const cooldown = runHeartbeatCheckWithEnv(tempDir, {
    HEARTBEAT_NOW: "2026-07-01T08:01:00.000Z",
    HEARTBEAT_DEV_STALE_SECONDS: "30",
    HEARTBEAT_DEV_COOLDOWN_SECONDS: "120"
  });
  assert.equal(cooldown.status, 0, cooldown.stderr);
  assert.doesNotMatch(cooldown.stdout, /⚠️ 发现需要关注的任务：/);
});
