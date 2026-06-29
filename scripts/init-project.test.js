const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("init-project copies scaffold and creates .webdesign task files", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-init-project-"));
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

  const projectPath = path.join(tempDir, "demo-project");
  const taskId = "20260625-102030-homepage";

  assert.equal(fs.existsSync(path.join(projectPath, "package.json")), true);
  assert.equal(fs.existsSync(path.join(projectPath, "vite.config.js")), true);
  assert.equal(fs.existsSync(path.join(projectPath, "src", "main.jsx")), true);

  const projectMeta = JSON.parse(
    fs.readFileSync(path.join(projectPath, ".webdesign", "project.json"), "utf8")
  );
  assert.equal(projectMeta.projectUid, "PROJaabbccddeeff0011");
  assert.equal(projectMeta.name, "demo-project");
  assert.equal(projectMeta.summary, "Demo project");
  assert.equal(projectMeta.author, "902");
  assert.equal(projectMeta.currentTaskId, taskId);

  const taskDir = path.join(projectPath, ".webdesign", "tasks", taskId);
  const workflow = JSON.parse(fs.readFileSync(path.join(taskDir, "workflow.json"), "utf8"));
  assert.equal(workflow.taskId, taskId);
  assert.equal(workflow.pageSlug, "homepage");
  assert.equal(workflow.intent, "create");
  assert.equal(workflow.currentGate, "G1_TASK_CREATED");
  assert.equal(workflow.apiState, null);

  assert.equal(fs.existsSync(path.join(taskDir, "product.md")), true);
  assert.equal(fs.existsSync(path.join(taskDir, "design.md")), true);
  assert.equal(fs.existsSync(path.join(taskDir, "audit.md")), true);
});
