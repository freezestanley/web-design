const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function createZipFromEntries(cwd, outputPath, entries) {
  const absoluteOutputPath = path.resolve(outputPath);
  if (fs.existsSync(absoluteOutputPath)) {
    fs.rmSync(absoluteOutputPath, { force: true });
  }
  execFileSync("zip", ["-qr", absoluteOutputPath, ...entries], { cwd, stdio: "pipe" });
  return absoluteOutputPath;
}

function createSourceZip(projectPath) {
  const outputPath = path.join(projectPath, "project.zip");
  const entries = fs.readdirSync(projectPath).filter((entry) => !entry.endsWith(".zip") && entry !== "node_modules");
  return createZipFromEntries(projectPath, outputPath, entries);
}

function createDistZip(projectPath) {
  const outputPath = path.join(projectPath, "dist.zip");
  return createZipFromEntries(projectPath, outputPath, ["dist", "dist-single"]);
}

module.exports = {
  createSourceZip,
  createDistZip
};
