const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

test("pm2 ecosystem config exposes the gateway app definition", () => {
  const ecosystem = require("./ecosystem.config.cjs");
  const app = ecosystem.apps.find((entry) => entry.name === "web-design-serve-gateway");

  assert.ok(Array.isArray(ecosystem.apps));
  assert.ok(app);
  assert.equal(app.script, "server.js");
  assert.equal(app.cwd, __dirname);
  assert.equal(app.autorestart, true);
  assert.equal(app.watch, false);
  assert.equal(app.time, true);
  assert.equal(app.max_restarts, 10);
  assert.equal(app.exec_mode, "fork");
  assert.equal(path.basename(app.error_file), "pm2-error.log");
  assert.equal(path.basename(app.out_file), "pm2-out.log");
});
