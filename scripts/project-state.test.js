const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  buildTaskId,
  getProjectMetaPath,
  readProjectMeta,
  writeProjectMeta
} = require("./lib/project-state");

test("getProjectMetaPath points to .webdesign/project.json", () => {
  const projectPath = "/tmp/demo-project";
  assert.equal(
    getProjectMetaPath(projectPath),
    path.join(projectPath, ".webdesign", "project.json")
  );
});

test("readProjectMeta and writeProjectMeta round-trip metadata", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-project-state-"));
  const projectPath = path.join(tempDir, "demo");
  const meta = {
    name: "demo",
    summary: "summary"
  };

  writeProjectMeta(projectPath, meta);

  assert.deepEqual(readProjectMeta(projectPath), meta);
});

test("buildTaskId renders timestamp and slug", () => {
  const date = new Date("2026-06-25T10:20:30.000Z");
  assert.equal(buildTaskId(date, "homepage"), "20260625-102030-homepage");
});
