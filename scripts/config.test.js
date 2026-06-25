const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./lib/load-config");

test("config exposes managed directory constants", () => {
  const rawConfig = fs.readFileSync(path.resolve(__dirname, "..", "config.js"), "utf8").trim();
  assert.equal(rawConfig.startsWith("{"), true);

  const config = loadConfig();
  assert.equal(typeof config.PROJECTS_DIR, "string");
  assert.equal(config.WEBDESIGN_DIR, ".webdesign");
  assert.equal(config.TASKS_DIR, "tasks");
  assert.equal(config.WORKFLOW_VERSION, "v1");
  assert.equal(config.TEMPLATE_DIR, "templates/scaffold");
});
