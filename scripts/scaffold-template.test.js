const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const scaffoldRoot = path.resolve(__dirname, "..", "templates", "scaffold");

test("scaffold package includes router, zustand, tailwind, zip-pack and singlefile build support", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(scaffoldRoot, "package.json"), "utf8"));

  assert.equal(typeof pkg.dependencies["react-router-dom"], "string");
  assert.equal(typeof pkg.dependencies.zustand, "string");
  assert.equal(typeof pkg.devDependencies.tailwindcss, "string");
  assert.equal(typeof pkg.devDependencies["@adjfut/vite-plugin-zip-pack"], "string");
  assert.equal(typeof pkg.devDependencies["vite-plugin-singlefile"], "string");
  assert.match(
    pkg.scripts.build,
    /^vite build && vite build --config vite\.singlefile\.config\.js$/
  );
});

test("scaffold contains regular app structure files", () => {
  const requiredFiles = [
    "postcss.config.js",
    "tailwind.config.js",
    "vite.singlefile.config.js",
    "src/app/App.jsx",
    "src/app/router.jsx",
    "src/app/providers.jsx",
    "src/pages/home/index.jsx",
    "src/stores/app-store.js",
    "src/styles/main.css"
  ];

  for (const file of requiredFiles) {
    assert.equal(fs.existsSync(path.join(scaffoldRoot, file)), true, file);
  }
});

test("vite config wires react and zip pack", () => {
  const viteConfig = fs.readFileSync(path.join(scaffoldRoot, "vite.config.js"), "utf8");

  assert.match(viteConfig, /import zipPack from "@adjfut\/vite-plugin-zip-pack";/);
  assert.match(viteConfig, /plugins:\s*\[\s*react\(\),\s*zipPack\(/);
});

test("singlefile vite config wires react and vite-plugin-singlefile", () => {
  const singlefileConfig = fs.readFileSync(
    path.join(scaffoldRoot, "vite.singlefile.config.js"),
    "utf8"
  );

  assert.match(
    singlefileConfig,
    /import \{ viteSingleFile \} from "vite-plugin-singlefile";/
  );
  assert.match(singlefileConfig, /plugins:\s*\[\s*react\(\),\s*viteSingleFile\(\)/);
  assert.match(singlefileConfig, /outDir:\s*"dist-single"/);
});
