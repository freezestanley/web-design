const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const { createSourceZip, createDistZip } = require("./lib/zip");

function listZipEntries(zipPath) {
  const output = execFileSync(
    "python3",
    [
      "-c",
      [
        "import json, sys, zipfile",
        "with zipfile.ZipFile(sys.argv[1], 'r') as archive:",
        "    print(json.dumps(sorted(archive.namelist())))"
      ].join("\n"),
      zipPath
    ],
    { encoding: "utf8" }
  );

  return JSON.parse(output);
}

function withPythonOnlyPath(callback) {
  const tempBinDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-python-bin-"));
  const pythonPath = execFileSync("python3", ["-c", "import sys; print(sys.executable)"], {
    encoding: "utf8"
  }).trim();

  fs.symlinkSync(pythonPath, path.join(tempBinDir, "python3"));

  const previousPath = process.env.PATH;
  process.env.PATH = tempBinDir;

  try {
    return callback();
  } finally {
    process.env.PATH = previousPath;
  }
}

test("zip helper works when only python3 is available on PATH", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-zip-helper-"));
  const projectPath = path.join(tempDir, "demo-project");

  fs.mkdirSync(path.join(projectPath, "src"), { recursive: true });
  fs.mkdirSync(path.join(projectPath, "dist"), { recursive: true });
  fs.mkdirSync(path.join(projectPath, "dist-single"), { recursive: true });
  fs.mkdirSync(path.join(projectPath, "node_modules", "demo-dep"), { recursive: true });
  fs.writeFileSync(path.join(projectPath, "src", "main.js"), "console.log('demo');");
  fs.writeFileSync(path.join(projectPath, "dist", "index.html"), "<!doctype html><h1>dist</h1>");
  fs.writeFileSync(
    path.join(projectPath, "dist-single", "index.html"),
    "<!doctype html><h1>single</h1>"
  );
  fs.writeFileSync(path.join(projectPath, "node_modules", "demo-dep", "index.js"), "demo");
  fs.writeFileSync(path.join(projectPath, "old.zip"), "stale zip");

  withPythonOnlyPath(() => {
    const sourceZipPath = createSourceZip(projectPath);
    const distZipPath = createDistZip(projectPath);

    assert.equal(path.basename(sourceZipPath), "project.zip");
    assert.equal(path.basename(distZipPath), "dist.zip");
  });

  const sourceZipEntries = listZipEntries(path.join(projectPath, "project.zip"));
  assert.equal(sourceZipEntries.includes("src/"), true);
  assert.equal(sourceZipEntries.includes("src/main.js"), true);
  assert.equal(sourceZipEntries.some((entry) => entry.startsWith("node_modules/")), false);
  assert.equal(sourceZipEntries.includes("old.zip"), false);

  const distZipEntries = listZipEntries(path.join(projectPath, "dist.zip"));
  assert.equal(distZipEntries.includes("dist/"), true);
  assert.equal(distZipEntries.includes("dist/index.html"), true);
  assert.equal(distZipEntries.includes("dist-single/"), true);
  assert.equal(distZipEntries.includes("dist-single/index.html"), true);
});
