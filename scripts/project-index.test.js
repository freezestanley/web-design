const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { listProjects } = require("./lib/project-index");

function writeProject(baseDir, name, summary, updatedAt) {
  const projectDir = path.join(baseDir, name);
  const metadataDir = path.join(projectDir, ".webdesign");
  fs.mkdirSync(metadataDir, { recursive: true });
  fs.writeFileSync(
    path.join(metadataDir, "project.json"),
    JSON.stringify({ name, summary, updatedAt }, null, 2)
  );
}

test("listProjects only returns managed projects sorted by updatedAt desc", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-project-index-"));
  writeProject(tempDir, "alpha", "Alpha summary", "2026-06-24T10:00:00.000Z");
  writeProject(tempDir, "beta", "Beta summary", "2026-06-25T10:00:00.000Z");
  fs.mkdirSync(path.join(tempDir, "unmanaged"), { recursive: true });

  const rows = listProjects({ projectsDir: tempDir });

  assert.deepEqual(rows, [
    {
      name: "beta",
      summary: "Beta summary",
      updatedAt: "2026-06-25T10:00:00.000Z",
      projectPath: path.join(tempDir, "beta")
    },
    {
      name: "alpha",
      summary: "Alpha summary",
      updatedAt: "2026-06-24T10:00:00.000Z",
      projectPath: path.join(tempDir, "alpha")
    }
  ]);
});
