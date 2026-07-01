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

function runHeartbeatCheck(projectsDir) {
  return spawnSync(process.execPath, ["heartbear/scripts/auto-check-webdesign.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      PROJECTS_DIR: projectsDir,
      WEBDESIGN_DIR: path.resolve(__dirname, "..")
    },
    encoding: "utf8"
  });
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

  const outputLines = result.stdout.trim().split("\n");
  const jsonStart = outputLines.findIndex((line) => line.startsWith("["));
  assert.notEqual(jsonStart, -1, "expected JSON payload in stdout");
  const entries = JSON.parse(outputLines.slice(jsonStart).join("\n"));

  assert.equal(entries.length, 1);
  assert.equal(entries[0].project, "demo-project");
  assert.equal(entries[0].taskId, taskId);
  assert.equal(entries[0].gate, "G5_DESIGN_CONFIRMED");
  assert.equal(entries[0].status, "ready_for_next_gate");
  assert.equal(entries[0].severity, "warn");
  assert.equal(entries[0].blocked, false);
  assert.equal(readWorkflow(projectPath, taskId).currentGate, "G5_DESIGN_CONFIRMED");
});
