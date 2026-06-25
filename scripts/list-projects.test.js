const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function writeProject(baseDir, name, summary, updatedAt) {
  const projectDir = path.join(baseDir, name);
  const metadataDir = path.join(projectDir, ".webdesign");
  fs.mkdirSync(metadataDir, { recursive: true });
  fs.writeFileSync(
    path.join(metadataDir, "project.json"),
    JSON.stringify({ name, summary, updatedAt }, null, 2)
  );
}

test("list-projects CLI prints managed project rows as JSON", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-list-projects-"));
  writeProject(tempDir, "demo", "Demo summary", "2026-06-25T10:00:00.000Z");

  const result = spawnSync(process.execPath, ["scripts/list-projects.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, WEB_DESIGN_PROJECTS_DIR: tempDir },
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [
    {
      name: "demo",
      summary: "Demo summary",
      updatedAt: "2026-06-25T10:00:00.000Z",
      projectPath: path.join(tempDir, "demo")
    }
  ]);
});
