const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadServeConfig } = require("./serve-config");

test(".env.js can derive projectsDir from ../config.js", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-serve-config-"));
  const parentDir = path.join(rootDir, "parent");
  const serveDir = path.join(parentDir, "serve");

  fs.mkdirSync(serveDir, { recursive: true });
  fs.writeFileSync(
    path.join(parentDir, "config.js"),
    JSON.stringify(
      {
        PROJECTS_DIR: "/tmp/managed-projects"
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(serveDir, ".env.js"),
    [
      'const fs = require("node:fs");',
      'const path = require("node:path");',
      'const parentConfigPath = path.resolve(__dirname, "..", "config.js");',
      'const parentConfig = JSON.parse(fs.readFileSync(parentConfigPath, "utf8"));',
      "module.exports = {",
      '  host: "127.0.0.1",',
      "  port: 4173,",
      "  projectsDir: parentConfig.PROJECTS_DIR",
      "};"
    ].join("\n")
  );

  const config = loadServeConfig({ cwd: serveDir });

  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 4173);
  assert.equal(config.projectsDir, "/tmp/managed-projects");
  assert.equal(config.__configPath.endsWith(".env.js"), true);
});

test("loadServeConfig falls back to JSON config when .env.js is not present", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-serve-config-json-"));
  fs.writeFileSync(
    path.join(rootDir, "config.example.json"),
    JSON.stringify(
      {
        host: "127.0.0.1",
        port: 4175,
        projectsDir: "./projects"
      },
      null,
      2
    )
  );

  const config = loadServeConfig({ cwd: rootDir });

  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 4175);
  assert.equal(config.projectsDir, "./projects");
  assert.equal(config.__configPath.endsWith("config.example.json"), true);
});

test("loadServeConfig derives projectsDir from ../config.js when loaded config omits it", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-serve-config-parent-fallback-"));
  const parentDir = path.join(rootDir, "parent");
  const serveDir = path.join(parentDir, "serve");

  fs.mkdirSync(serveDir, { recursive: true });
  fs.writeFileSync(
    path.join(parentDir, "config.js"),
    JSON.stringify(
      {
        PROJECTS_DIR: "/tmp/shared-preview-projects"
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(serveDir, "config.example.json"),
    JSON.stringify(
      {
        host: "127.0.0.1",
        port: 4176
      },
      null,
      2
    )
  );

  const config = loadServeConfig({ cwd: serveDir });

  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 4176);
  assert.equal(config.projectsDir, "/tmp/shared-preview-projects");
  assert.equal(config.__configPath.endsWith("config.example.json"), true);
});
