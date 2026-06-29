#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { extractRoutesFromText, writeProxyRoutes } = require("./lib/manifest-proxy");
const { renderManifest } = require("./lib/manifest");
const { readProjectMeta } = require("./lib/project-state");
const { getProductPath, readWorkflow, writeWorkflow } = require("./lib/task-files");

const VALID_API_STATUS = new Set(["none", "provided", "pending"]);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--upstream-origin") {
      options.upstreamOrigin = argv[index + 1] || "";
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  return {
    projectPath: positional[0],
    taskId: positional[1],
    upstreamOrigin: options.upstreamOrigin || positional[2] || ""
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readSection(markdown, title) {
  const pattern = new RegExp(
    `^##\\s+${escapeRegExp(title)}\\s*$([\\s\\S]*?)(?=^##\\s+|\\Z)`,
    "m"
  );
  const match = markdown.match(pattern);
  return match ? match[1].trim() : "";
}

function parseApiStatus(markdown) {
  const status = readSection(markdown, "接口状态").split(/\s+/)[0]?.trim().toLowerCase() || "";
  if (!VALID_API_STATUS.has(status)) {
    throw new Error("product.md 缺少有效的 `## 接口状态`，可选值：none | provided | pending");
  }
  return status;
}

function hashContent(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function buildApiState(status, sourceHash, routes) {
  return {
    status,
    sourceFile: "product.md",
    sourceHash,
    syncedAt: new Date().toISOString(),
    routeCount: routes.length,
    routes
  };
}

function syncProduct(projectPath, taskId, upstreamOrigin) {
  const productPath = getProductPath(projectPath, taskId);
  if (!fs.existsSync(productPath)) {
    throw new Error(`product.md 不存在：${productPath}`);
  }

  const productContent = fs.readFileSync(productPath, "utf8");
  const apiStatus = parseApiStatus(productContent);

  if (apiStatus === "pending") {
    throw new Error("接口状态仍为 pending，请先补全接口信息，或明确改成 none");
  }

  const routes = apiStatus === "none"
    ? []
    : extractRoutesFromText(productContent, upstreamOrigin || undefined);

  if (apiStatus === "provided" && routes.length === 0) {
    throw new Error("接口状态为 provided，但未提取到任何 proxy route。请补充接口路径和 upstreamOrigin。");
  }

  writeProxyRoutes(path.resolve(projectPath), routes);
  const projectMeta = readProjectMeta(projectPath);
  renderManifest(path.resolve(projectPath), projectMeta);

  const workflow = readWorkflow(projectPath, taskId);
  workflow.apiState = buildApiState(apiStatus, hashContent(productContent), routes);
  workflow.updatedAt = new Date().toISOString();
  writeWorkflow(projectPath, taskId, workflow);

  return workflow.apiState;
}

function main() {
  const { projectPath, taskId, upstreamOrigin } = parseArgs(process.argv.slice(2));

  if (!projectPath || !taskId) {
    fail(
      "Usage: node scripts/product-sync.js <project-path> <task-id> [upstream-origin]\n" +
        "   or: node scripts/product-sync.js <project-path> <task-id> --upstream-origin <origin>"
    );
  }

  const apiState = syncProduct(path.resolve(projectPath), taskId, upstreamOrigin);
  process.stdout.write(
    `${JSON.stringify(
      {
        status: apiState.status,
        routeCount: apiState.routeCount,
        routes: apiState.routes
      },
      null,
      2
    )}\n`
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    fail(error.message);
  }
}

module.exports = {
  buildApiState,
  hashContent,
  parseApiStatus,
  readSection,
  syncProduct
};
