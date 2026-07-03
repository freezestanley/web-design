#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

function loadSourceManifest(rootDir) {
  const manifestPath = path.join(rootDir, "src", "plugin.manifest.json");
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function needsBuild(rootDir) {
  const manifest = loadSourceManifest(rootDir);
  const distDir = path.join(rootDir, "dist");
  const outputFiles = [
    path.join(distDir, "plugin.js"),
    path.join(distDir, "plugin.css"),
    path.join(distDir, "manifest.json")
  ];

  if (outputFiles.some((filePath) => !fs.existsSync(filePath))) {
    return true;
  }

  const latestSourceTime = [...manifest.js, ...manifest.css, "src/plugin.manifest.json"]
    .map((relativePath) => path.join(rootDir, relativePath))
    .map((filePath) => fs.statSync(filePath).mtimeMs)
    .reduce((max, value) => Math.max(max, value), 0);

  const earliestOutputTime = outputFiles
    .map((filePath) => fs.statSync(filePath).mtimeMs)
    .reduce((min, value) => Math.min(min, value), Number.POSITIVE_INFINITY);

  return latestSourceTime > earliestOutputTime;
}

function buildPlugin(options = {}) {
  const rootDir = path.resolve(options.rootDir || path.join(__dirname, ".."));
  const manifest = loadSourceManifest(rootDir);
  const distDir = path.join(rootDir, "dist");
  fs.mkdirSync(distDir, { recursive: true });

  const sourceManifestPath = path.join(rootDir, "src", "plugin.manifest.json");
  const jsBundle = [
    "(function (global) {",
    "  var plugin = {};",
    `  plugin.name = ${JSON.stringify(manifest.name)};`,
    `  plugin.version = ${JSON.stringify(manifest.version)};`
  ];

  manifest.js.forEach((relativePath) => {
    const absolutePath = path.join(rootDir, relativePath);
    const code = fs.readFileSync(absolutePath, "utf8");
    jsBundle.push("");
    jsBundle.push(`  // ${relativePath}`);
    jsBundle.push("  (function (plugin, global) {");
    code.split("\n").forEach((line) => {
      jsBundle.push(`    ${line}`);
    });
    jsBundle.push("  })(plugin, global);");
  });

  jsBundle.push("");
  jsBundle.push(`  global.${manifest.global} = plugin.entry;`);
  jsBundle.push("})(window);");
  jsBundle.push("");

  const cssBundle = manifest.css
    .map((relativePath) => fs.readFileSync(path.join(rootDir, relativePath), "utf8"))
    .join("\n\n");

  const outputManifest = {
    name: manifest.name,
    version: manifest.version,
    js: "plugin.js",
    css: "plugin.css",
    global: manifest.global,
    sourceManifest: path.relative(rootDir, sourceManifestPath)
  };

  fs.writeFileSync(path.join(distDir, "plugin.js"), jsBundle.join("\n"));
  fs.writeFileSync(path.join(distDir, "plugin.css"), cssBundle);
  fs.writeFileSync(path.join(distDir, "manifest.json"), JSON.stringify(outputManifest, null, 2));

  return {
    distDir,
    manifest: outputManifest
  };
}

if (require.main === module) {
  const result = buildPlugin();
  process.stdout.write(`${path.join(result.distDir, "plugin.js")}\n`);
}

module.exports = {
  buildPlugin,
  needsBuild
};
