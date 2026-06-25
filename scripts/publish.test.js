const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");

function setupPublishProject() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-publish-"));
  const projectPath = path.join(tempDir, "demo-project");
  const taskId = "20260625-102030-homepage";
  const taskDir = path.join(projectPath, ".webdesign", "tasks", taskId);

  fs.mkdirSync(path.join(projectPath, "src"), { recursive: true });
  fs.mkdirSync(taskDir, { recursive: true });

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
      "const distDir = path.join(process.cwd(), 'dist');",
      "const distSingleDir = path.join(process.cwd(), 'dist-single');",
      "fs.mkdirSync(distDir, { recursive: true });",
      "fs.mkdirSync(distSingleDir, { recursive: true });",
      "fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><h1>publish</h1>');",
      "fs.writeFileSync(path.join(distSingleDir, 'index.html'), '<!doctype html><h1>single</h1>');"
    ].join("\n")
  );

  fs.writeFileSync(
    path.join(projectPath, ".webdesign", "project.json"),
    JSON.stringify(
      {
        name: "demo-project",
        summary: "Demo summary",
        author: "stanley",
        template: "scaffold",
        createdAt: "2026-06-25T10:00:00.000Z",
        updatedAt: "2026-06-25T10:00:00.000Z",
        currentTaskId: taskId,
        sourceZipPath: "",
        distZipPath: ""
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
        currentGate: "G9_PUBLISH_READY",
        blocked: false,
        blockReason: "",
        userConfirmations: [],
        history: [],
        createdAt: "2026-06-25T10:00:00.000Z",
        updatedAt: "2026-06-25T10:00:00.000Z"
      },
      null,
      2
    )
  );

  return { projectPath, taskId };
}

test("publish only runs from G9_PUBLISH_READY and emits dual zip marker", () => {
  const { projectPath, taskId } = setupPublishProject();
  const result = spawnSync(process.execPath, ["scripts/publish.js", projectPath, taskId], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /##publishStart##stanley｜.*source\.zip｜.*dist\.zip｜demo-project｜Demo summary##publishEnd##/);

  const projectMeta = JSON.parse(
    fs.readFileSync(path.join(projectPath, ".webdesign", "project.json"), "utf8")
  );
  assert.equal(fs.existsSync(projectMeta.sourceZipPath), true);
  assert.equal(fs.existsSync(projectMeta.distZipPath), true);
  const zipListing = execFileSync("zipinfo", ["-1", projectMeta.distZipPath], { encoding: "utf8" });
  assert.match(zipListing, /^dist\/$/m);
  assert.match(zipListing, /^dist\/index\.html$/m);
  assert.match(zipListing, /^dist-single\/$/m);
  assert.match(zipListing, /^dist-single\/index\.html$/m);

  const workflow = JSON.parse(
    fs.readFileSync(path.join(projectPath, ".webdesign", "tasks", taskId, "workflow.json"), "utf8")
  );
  assert.equal(workflow.currentGate, "DONE");
});

test("publish rejects tasks that are not in publish ready gate", () => {
  const { projectPath, taskId } = setupPublishProject();
  const workflowPath = path.join(projectPath, ".webdesign", "tasks", taskId, "workflow.json");
  const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));
  workflow.currentGate = "G8_PREVIEW_CONFIRMED";
  fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));

  const result = spawnSync(process.execPath, ["scripts/publish.js", projectPath, taskId], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /G9_PUBLISH_READY/);
});

test("publish fails when build does not produce dist-single output", () => {
  const { projectPath, taskId } = setupPublishProject();
  fs.writeFileSync(
    path.join(projectPath, "build-script.cjs"),
    [
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "const distDir = path.join(process.cwd(), 'dist');",
      "fs.mkdirSync(distDir, { recursive: true });",
      "fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><h1>publish</h1>');"
    ].join("\n")
  );

  const result = spawnSync(process.execPath, ["scripts/publish.js", projectPath, taskId], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /dist-single/);
});
