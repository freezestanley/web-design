#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./lib/load-config");
const { getSessionAuthor } = require("./lib/session-author");
const { buildTaskId, generateProjectUid, writeProjectMeta } = require("./lib/project-state");
const config = loadConfig();

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--summary") {
      options.summary = argv[index + 1] || "";
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  return {
    projectName: positional[0],
    pageSlug: positional[1],
    intent: positional[2],
    summary: options.summary || ""
  };
}

function copyDir(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function writeTextFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function renderProductTemplate(projectName, pageSlug) {
  return `# Product - ${projectName}

## 页面主题
${pageSlug}

## 页面素材

## 文案

## API接口

## 动效

## 受众

## 场景

## 验收要求
`;
}

function renderDesignTemplate(projectName, pageSlug) {
  return `# Design - ${projectName}

## 页面
${pageSlug}

## 视觉方向

## 布局结构

## 组件清单

## 交互说明
`;
}

function renderAuditTemplate(projectName, pageSlug) {
  return `# Audit - ${projectName}

## 页面
${pageSlug}

## CDP检查

## UI走查

## 修改复查

conclusion: PENDING
`;
}

const { projectName, pageSlug, intent, summary } = parseArgs(process.argv.slice(2));

if (!projectName || !pageSlug || !intent) {
  process.stderr.write("Usage: node scripts/init-project.js <project-name> <page-slug> <intent> [--summary <summary>]\n");
  process.exit(1);
}

const now = process.env.WEB_DESIGN_NOW ? new Date(process.env.WEB_DESIGN_NOW) : new Date();
const taskId = buildTaskId(now, pageSlug);
// projectUid 在项目创建时生成一次，写入后不可更改
const projectUid = process.env.WEB_DESIGN_PROJECT_UID || generateProjectUid();
const projectsDir = process.env.WEB_DESIGN_PROJECTS_DIR
  ? path.resolve(process.env.WEB_DESIGN_PROJECTS_DIR)
  : config.PROJECTS_DIR;
const projectPath = path.join(projectsDir, projectName);
const templatePath = path.resolve(__dirname, "..", config.TEMPLATE_DIR);
const taskPath = path.join(projectPath, config.WEBDESIGN_DIR, config.TASKS_DIR, taskId);

if (fs.existsSync(projectPath)) {
  process.stderr.write(`Project already exists: ${projectPath}\n`);
  process.exit(1);
}

copyDir(templatePath, projectPath);

const nowIso = now.toISOString();
writeProjectMeta(projectPath, {
  projectUid,
  name: projectName,
  summary,
  author: getSessionAuthor(),
  template: path.basename(config.TEMPLATE_DIR),
  createdAt: nowIso,
  updatedAt: nowIso,
  currentTaskId: taskId,
  sourceZipPath: "",
  distZipPath: ""
});

writeTextFile(
  path.join(taskPath, "workflow.json"),
  JSON.stringify(
    {
      taskId,
      pageSlug,
      intent,
      currentGate: "G1_TASK_CREATED",
      apiState: null,
      blocked: false,
      blockReason: "",
      userConfirmations: [],
      history: [],
      createdAt: nowIso,
      updatedAt: nowIso
    },
    null,
    2
  )
);
writeTextFile(path.join(taskPath, "product.md"), renderProductTemplate(projectName, pageSlug));
writeTextFile(path.join(taskPath, "design.md"), renderDesignTemplate(projectName, pageSlug));
writeTextFile(path.join(taskPath, "audit.md"), renderAuditTemplate(projectName, pageSlug));

process.stdout.write(`${JSON.stringify({ projectPath, taskId }, null, 2)}\n`);
