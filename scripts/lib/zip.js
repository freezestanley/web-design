const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function createZipFromEntries(cwd, outputPath, entries) {
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { force: true });
  }
  execFileSync("zip", ["-qr", outputPath, ...entries], { cwd, stdio: "pipe" });
  return outputPath;
}

function createSourceZip(projectPath) {
  const outputPath = path.join(projectPath, `${path.basename(projectPath)}-source.zip`);
  const entries = fs.readdirSync(projectPath).filter((entry) => !entry.endsWith(".zip") && entry !== "node_modules");
  return createZipFromEntries(projectPath, outputPath, entries);
}

function createDistZip(projectPath) {
  const outputPath = path.join(projectPath, `${path.basename(projectPath)}-dist.zip`);
  return createZipFromEntries(projectPath, outputPath, ["dist", "dist-single"]);
}

module.exports = {
  createSourceZip,
  createDistZip
};
