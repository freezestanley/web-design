#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { loadConfig } = require("./lib/load-config");
const { resolveAuthorFromSession } = require("./lib/session-author");
const { renderManifest } = require("./lib/manifest");
const { createDistZip, createSourceZip } = require("./lib/zip");
const { buildPublishMarker } = require("./lib/publish-marker");
const config = loadConfig();

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function getTaskDir(projectPath, taskId) {
  return path.join(projectPath, config.WEBDESIGN_DIR, config.TASKS_DIR, taskId);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveProjectAuthor(projectMeta) {
  if (projectMeta.author) {
    return projectMeta.author;
  }

  return resolveAuthorFromSession();
}

const rawProjectPath = process.argv[2];
const taskId = process.argv[3];

if (!rawProjectPath || !taskId) {
  fail("Usage: node scripts/publish.js <project-path> <task-id>");
}

const projectPath = path.resolve(rawProjectPath);

const workflowPath = path.join(getTaskDir(projectPath, taskId), "workflow.json");
const projectMetaPath = path.join(projectPath, config.WEBDESIGN_DIR, "project.json");

const workflow = readJson(workflowPath);
if (workflow.currentGate !== "G9_PUBLISH_READY") {
  fail(`Current gate must be G9_PUBLISH_READY, got ${workflow.currentGate}`);
}
if (workflow.blocked) {
  fail(`Task is blocked: ${workflow.blockReason}`);
}

execFileSync("npm", ["run", "build"], { cwd: projectPath, stdio: "pipe" });

const distPath = path.join(projectPath, "dist");
if (!fs.existsSync(distPath)) {
  fail("Build completed without dist output");
}

const projectMeta = readJson(projectMetaPath);
projectMeta.author = resolveProjectAuthor(projectMeta);
try {
  renderManifest(projectPath, projectMeta);
} catch (error) {
  fail(error.message);
}

const sourceZipPath = createSourceZip(projectPath);
const distZipPath = createDistZip(projectPath);

projectMeta.sourceZipPath = sourceZipPath;
projectMeta.distZipPath = distZipPath;
projectMeta.updatedAt = new Date().toISOString();
fs.writeFileSync(projectMetaPath, JSON.stringify(projectMeta, null, 2));

workflow.history.push({
  from: workflow.currentGate,
  to: "DONE",
  at: new Date().toISOString()
});
workflow.currentGate = "DONE";
workflow.updatedAt = new Date().toISOString();
fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));

process.stdout.write(`${buildPublishMarker({
  projectUid: projectMeta.projectUid || "",
  sourceZipPath,
  distZipPath,
  projectName: projectMeta.name,
  summary: projectMeta.summary
})}\n`);
