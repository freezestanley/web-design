const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { buildPlugin } = require("./plugins/web-design-control-plugin/scripts/build-plugin");

test("buildPlugin emits dist assets and manifest for gateway loading", () => {
  const rootDir = path.join(path.resolve(__dirname), "plugins", "web-design-control-plugin");
  const distDir = path.join(rootDir, "dist");

  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  const result = buildPlugin({ rootDir });

  assert.equal(result.manifest.name, "web-design-control-plugin");
  assert.equal(fs.existsSync(path.join(distDir, "plugin.js")), true);
  assert.equal(fs.existsSync(path.join(distDir, "plugin.css")), true);
  assert.equal(fs.existsSync(path.join(distDir, "manifest.json")), true);

  const pluginJs = fs.readFileSync(path.join(distDir, "plugin.js"), "utf8");
  const pluginCss = fs.readFileSync(path.join(distDir, "plugin.css"), "utf8");
  const manifest = JSON.parse(fs.readFileSync(path.join(distDir, "manifest.json"), "utf8"));

  assert.match(pluginJs, /WebDesignControlPlugin/);
  assert.match(pluginJs, /mount/);
  assert.match(pluginCss, /wdp-root/);
  assert.equal(manifest.global, "WebDesignControlPlugin");
  assert.equal(manifest.js, "plugin.js");
  assert.equal(manifest.css, "plugin.css");
});

test("buildPlugin includes share dialog and publish button in output", () => {
  const rootDir = path.join(path.resolve(__dirname), "plugins", "web-design-control-plugin");
  const distDir = path.join(rootDir, "dist");

  const result = buildPlugin({ rootDir });

  const pluginJs = fs.readFileSync(path.join(distDir, "plugin.js"), "utf8");
  const pluginCss = fs.readFileSync(path.join(distDir, "plugin.css"), "utf8");

  assert.match(pluginJs, /wdp-share-dialog/, "plugin.js should contain share dialog class");
  assert.match(pluginJs, /wdp-btn--publish/, "plugin.js should contain publish button class");
  assert.match(pluginJs, /loadShareConfig/, "plugin.js should contain loadShareConfig method");
  assert.match(pluginJs, /submitShare/, "plugin.js should contain submitShare method");
  assert.match(pluginJs, /searchUsers/, "plugin.js should contain searchUsers method");

  assert.match(pluginCss, /wdp-action-bar/, "plugin.css should contain action bar class");
  assert.match(pluginCss, /wdp-overlay/, "plugin.css should contain overlay class");
  assert.match(pluginCss, /wdp-share-dialog/, "plugin.css should contain share dialog class");
});
