const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

test("resolve-project finds managed project path inside projects dir", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-resolve-project-"));
  const projectDir = path.join(tempDir, "demo");
  fs.mkdirSync(path.join(projectDir, ".webdesign"), { recursive: true });
  fs.writeFileSync(
    path.join(projectDir, ".webdesign", "project.json"),
    JSON.stringify({ name: "demo", summary: "Demo", updatedAt: "2026-06-25T10:00:00.000Z" }, null, 2)
  );

  const result = spawnSync(process.execPath, ["scripts/resolve-project.js", "demo"], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, WEB_DESIGN_PROJECTS_DIR: tempDir },
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    name: "demo",
    projectPath: projectDir
  });
});
