#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { loadConfig } = require("./lib/load-config");
const { renderManifest } = require("./lib/manifest");
const { readProjectMeta } = require("./lib/project-state");

const config = loadConfig();

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output-dir") {
      options.outputDir = argv[index + 1] || "";
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  return {
    command: positional[0],
    projectPath: positional[1],
    taskId: positional[2],
    outputDir: options.outputDir || ""
  };
}

function formatVersionDate(date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hours = `${date.getUTCHours()}`.padStart(2, "0");
  const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");
  const seconds = `${date.getUTCSeconds()}`.padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function buildVersion(now) {
  return `v${formatVersionDate(now)}-${crypto.randomBytes(3).toString("hex")}`;
}

function copyDirContents(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirContents(sourcePath, targetPath);
      continue;
    }
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function ensureTaskExists(projectPath, taskId) {
  const workflowPath = path.join(projectPath, config.WEBDESIGN_DIR, config.TASKS_DIR, taskId, "workflow.json");
  if (!fs.existsSync(workflowPath)) {
    throw new Error(`workflow.json 不存在：${workflowPath}`);
  }
}

function exportSharePreview(projectPath, taskId, outputDir) {
  if (!projectPath || !taskId) {
    throw new Error("exportSharePreview requires projectPath and taskId");
  }

  const resolvedProjectPath = path.resolve(projectPath);
  const resolvedOutputDir = outputDir
    ? path.resolve(outputDir)
    : path.resolve(process.env.WEB_DESIGN_SHARE_PROJECTS_DIR || config.PROJECTS_DIR);
  const now = process.env.WEB_DESIGN_NOW ? new Date(process.env.WEB_DESIGN_NOW) : new Date();

  ensureTaskExists(resolvedProjectPath, taskId);

  fs.rmSync(path.join(resolvedProjectPath, "dist"), { recursive: true, force: true });
  execFileSync("npm", ["run", "build"], {
    cwd: resolvedProjectPath,
    stdio: "pipe",
    env: {
      ...process.env,
      VITE_SSO_BYPASS: "false"
    }
  });

  const distDir = path.join(resolvedProjectPath, "dist");
  const distIndexPath = path.join(distDir, "index.html");
  if (!fs.existsSync(distIndexPath)) {
    throw new Error("Build completed without dist/index.html");
  }

  const projectMeta = readProjectMeta(resolvedProjectPath);
  const { manifest } = renderManifest(resolvedProjectPath, projectMeta);
  const version = buildVersion(now);
  const snapshotDir = path.join(resolvedOutputDir, version);
  fs.rmSync(snapshotDir, { recursive: true, force: true });
  copyDirContents(distDir, snapshotDir);
  fs.writeFileSync(path.join(snapshotDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  const meta = {
    owner: projectMeta.author || "",
    appName: projectMeta.name || manifest.name || projectMeta.projectUid || path.basename(resolvedProjectPath),
    appNo: projectMeta.projectUid || manifest.projectId || path.basename(resolvedProjectPath),
    version,
    description: projectMeta.summary || "",
    uploadedBy: projectMeta.author || "",
    exportedAt: now.getTime(),
    publishedAt: now.getTime(),
    manifest
  };
  fs.writeFileSync(path.join(snapshotDir, "_meta.json"), JSON.stringify(meta, null, 2));

  return {
    appId: meta.appNo,
    appName: meta.appName,
    version,
    snapshotPath: snapshotDir,
    outputDir: resolvedOutputDir,
    sharePreviewUrl: `${process.env.WEB_DESIGN_PREVIEW_GATEWAY_ORIGIN || "http://127.0.0.1:4173"}/apps/${meta.appNo}/`
  };
}

function main() {
  const { command, projectPath, taskId, outputDir } = parseArgs(process.argv.slice(2));
  if (command !== "export" || !projectPath || !taskId) {
    fail("Usage: node scripts/share-preview.js export <project-path> <task-id> [--output-dir <dir>]");
  }

  const result = exportSharePreview(projectPath, taskId, outputDir);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    fail(error.message);
  }
}

module.exports = {
  buildVersion,
  copyDirContents,
  exportSharePreview,
  formatVersionDate,
  parseArgs
};
