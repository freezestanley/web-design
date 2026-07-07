#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { loadConfig } = require("./lib/load-config");
const { renderManifest } = require("./lib/manifest");
const { readProjectMeta } = require("./lib/project-state");
const { waitForPort } = require("./vitectrl/lib/process");

const PREVIEW_PORT = 4173;
const PREVIEW_HOST = "127.0.0.1";

/**
 * 确保 vite preview 在 4173 端口运行。
 * - 已在监听：跳过，不重复启动
 * - 未在监听：spawn npm run preview，等待端口就绪（最多 10s）
 */
async function ensureVitePreviewRunning(resolvedProjectPath) {
  // 用 waitForPort 快速探测（100ms 超时）判断端口是否已占用
  const already = await waitForPort(PREVIEW_HOST, PREVIEW_PORT, { timeoutMs: 100 })
    .then(() => true)
    .catch(() => false);
  if (already) return;

  const child = spawn(
    "npm",
    ["run", "preview:local", "--", "--host", PREVIEW_HOST, "--port", String(PREVIEW_PORT), "--strictPort"],
    { cwd: resolvedProjectPath, detached: true, stdio: "ignore" }
  );
  child.unref();

  await waitForPort(PREVIEW_HOST, PREVIEW_PORT, { timeoutMs: 10000 });
}

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

  // 直接复用 G7 已有 dist，不重新 build
  const distDir = path.join(resolvedProjectPath, "dist");
  const distIndexPath = path.join(distDir, "index.html");
  if (!fs.existsSync(distIndexPath)) {
    throw new Error("dist/index.html 不存在，请先完成 G7 build（node scripts/vitectrl/dev-preview.js start <project-path> --bypass false）");
  }

  const projectMeta = readProjectMeta(resolvedProjectPath);
  const { manifest } = renderManifest(resolvedProjectPath, projectMeta);
  const version = buildVersion(now);

  const appId = projectMeta.projectUid || manifest.projectId || path.basename(resolvedProjectPath);
  const appDir = path.join(resolvedOutputDir, appId);
  const versionsDir = path.join(appDir, "versions");
  const snapshotDir = path.join(versionsDir, version);
  const currentLink = path.join(appDir, "current");
  const tmpLink = path.join(appDir, "current.new");

  // 写入版本目录
  fs.mkdirSync(snapshotDir, { recursive: true });
  copyDirContents(distDir, snapshotDir);
  fs.writeFileSync(path.join(snapshotDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  const meta = {
    owner: projectMeta.author || "",
    appName: projectMeta.name || manifest.name || appId,
    appNo: appId,
    version,
    description: projectMeta.summary || "",
    uploadedBy: projectMeta.author || "",
    exportedAt: now.getTime(),
    publishedAt: now.getTime(),
    manifest
  };
  fs.writeFileSync(path.join(snapshotDir, "_meta.json"), JSON.stringify(meta, null, 2));

  // 原子更新 current 软链接
  try { fs.unlinkSync(tmpLink); } catch { /* 不存在则忽略 */ }
  fs.symlinkSync(`versions/${version}`, tmpLink);
  fs.renameSync(tmpLink, currentLink);

  return {
    appId,
    appName: meta.appName,
    version,
    snapshotPath: snapshotDir,
    outputDir: resolvedOutputDir,
    sharePreviewUrl: `${process.env.WEB_DESIGN_PREVIEW_GATEWAY_ORIGIN || "http://127.0.0.1:4173"}/`
  };
}

async function main() {
  const { command, projectPath, taskId, outputDir } = parseArgs(process.argv.slice(2));
  if (command !== "export" || !projectPath || !taskId) {
    fail("Usage: node scripts/share-preview.js export <project-path> <task-id> [--output-dir <dir>]");
  }

  const result = exportSharePreview(projectPath, taskId, outputDir);

  // 确保 vite preview 在 4173 端口运行（替代 serve gateway，后续可切回）
  try {
    await ensureVitePreviewRunning(path.resolve(projectPath));
  } catch (previewError) {
    process.stderr.write(`[warn] vite preview 启动失败：${previewError.message}\n`);
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => fail(error.message));
}

module.exports = {
  buildVersion,
  copyDirContents,
  exportSharePreview,
  formatVersionDate,
  parseArgs
};
