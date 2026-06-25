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
        WEB_DESIGN_NOW: "2026-06-25T10:20:30.000Z"
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

test("gate advances through legal order and requires confirms on confirmation gates", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gate-"));
  const { projectPath, taskId } = initProject(tempDir);

  assert.equal(gateCommand(["advance", projectPath, taskId]).status, 0);
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

test("gate blocks G6 to G7 when audit.md is not PASS", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gate-"));
  const { projectPath, taskId } = initProject(tempDir);

  gateCommand(["advance", projectPath, taskId]);
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
  gateCommand(["advance", projectPath, taskId, "--confirm", "需求确认通过"]);
  gateCommand(["advance", projectPath, taskId]);
  gateCommand(["advance", projectPath, taskId, "--confirm", "设计确认通过"]);
  gateCommand(["advance", projectPath, taskId]);
  fs.writeFileSync(path.join(taskDir, "audit.md"), "# Audit\n\n## 结论\nPASS\n");
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
  gateCommand(["advance", projectPath, taskId, "--confirm", "需求确认通过"]);
  gateCommand(["advance", projectPath, taskId]);
  gateCommand(["advance", projectPath, taskId, "--confirm", "设计确认通过"]);
  gateCommand(["advance", projectPath, taskId]);
  fs.writeFileSync(path.join(taskDir, "audit.md"), "# Audit\n\n## 结论\nPASS\n");
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
