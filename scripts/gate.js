#!/usr/bin/env node

const fs = require("node:fs");
const { getAuditPath, readWorkflow, writeWorkflow } = require("./lib/task-files");

const GATES = [
  "G0_PROJECT_SELECTED",
  "G1_TASK_CREATED",
  "G2_PRODUCT_WRITTEN",
  "G3_PRODUCT_CONFIRMED",
  "G4_DESIGN_WRITTEN",
  "G5_DESIGN_CONFIRMED",
  "G6_DEVELOPMENT",
  "G7_STATIC_AUDIT_PASSED",
  "G8_PREVIEW_CONFIRMED",
  "G9_PUBLISH_READY",
  "DONE"
];

const CONFIRM_REQUIRED_GATES = new Set([
  "G2_PRODUCT_WRITTEN",
  "G4_DESIGN_WRITTEN",
  "G8_PREVIEW_CONFIRMED"
]);

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--confirm" || arg === "--reason") {
      options[arg.slice(2)] = argv[index + 1] || "";
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  return {
    command: positional[0],
    projectPath: positional[1],
    taskId: positional[2],
    options
  };
}

function nextGate(currentGate) {
  const index = GATES.indexOf(currentGate);
  return index >= 0 ? GATES[index + 1] || null : null;
}

function appendHistory(workflow, toGate, meta = {}) {
  workflow.history.push({
    from: workflow.currentGate,
    to: toGate,
    at: new Date().toISOString(),
    ...meta
  });
  workflow.currentGate = toGate;
  workflow.updatedAt = new Date().toISOString();
}

function assertConfirmIfNeeded(workflow, options) {
  if (CONFIRM_REQUIRED_GATES.has(workflow.currentGate) && !options.confirm) {
    fail(`Current gate ${workflow.currentGate} requires --confirm`);
  }
}

function assertAuditPass(projectPath, taskId) {
  const auditPath = getAuditPath(projectPath, taskId);
  if (!fs.existsSync(auditPath)) {
    fail("audit.md is required before advancing to static audit passed");
  }
  const content = fs.readFileSync(auditPath, "utf8");
  // 匹配 "## 结论" 节下第一个非空行必须是 PASS，模板默认是 PENDING 不通过
  if (!/^##\s*结论\s*\n\s*PASS\s*$/m.test(content)) {
    fail('audit.md 的"结论"部分必须明确写 PASS 才能推进（当前为 PENDING 或缺失）');
  }
}

function hasValidApiState(apiState) {
  return Boolean(apiState && typeof apiState === "object" && typeof apiState.sourceHash === "string" && apiState.sourceHash);
}

function assertProductSynced(workflow) {
  const apiState = workflow.apiState;

  if (!hasValidApiState(apiState)) {
    fail("G2 -> G3 requires product-sync first: workflow.apiState is missing or incomplete");
  }

  if (!["none", "provided"].includes(apiState.status)) {
    fail(`G2 -> G3 requires synced API status, got: ${apiState.status || "unknown"}`);
  }

  if (apiState.status === "provided" && (!Array.isArray(apiState.routes) || apiState.routes.length === 0)) {
    fail("G2 -> G3 requires product-sync to extract proxy routes for provided APIs");
  }
}

function handleStatus(projectPath, taskId) {
  const workflow = readWorkflow(projectPath, taskId);
  process.stdout.write(`${JSON.stringify({ ...workflow, nextGate: nextGate(workflow.currentGate) }, null, 2)}\n`);
}

function handleAdvance(projectPath, taskId, options) {
  const workflow = readWorkflow(projectPath, taskId);

  if (workflow.blocked) {
    fail(`Task is blocked: ${workflow.blockReason}`);
  }

  if (workflow.currentGate === "G9_PUBLISH_READY") {
    fail("Publish gate cannot advance directly; run publish.js");
  }

  assertConfirmIfNeeded(workflow, options);

  if (workflow.currentGate === "G2_PRODUCT_WRITTEN") {
    assertProductSynced(workflow);
  }

  if (workflow.currentGate === "G6_DEVELOPMENT") {
    assertAuditPass(projectPath, taskId);
  }

  const targetGate = nextGate(workflow.currentGate);
  if (!targetGate) {
    fail(`No next gate for ${workflow.currentGate}`);
  }

  const historyMeta = options.confirm ? { confirm: options.confirm } : {};
  appendHistory(workflow, targetGate, historyMeta);
  if (options.confirm) {
    workflow.userConfirmations.push({
      gate: targetGate,
      text: options.confirm,
      at: workflow.updatedAt
    });
  }
  writeWorkflow(projectPath, taskId, workflow);
}

function handleBlock(projectPath, taskId, reason) {
  if (!reason) {
    fail("block requires a reason");
  }
  const workflow = readWorkflow(projectPath, taskId);
  workflow.blocked = true;
  workflow.blockReason = reason;
  workflow.updatedAt = new Date().toISOString();
  writeWorkflow(projectPath, taskId, workflow);
}

function handleUnblock(projectPath, taskId) {
  const workflow = readWorkflow(projectPath, taskId);
  workflow.blocked = false;
  workflow.blockReason = "";
  workflow.updatedAt = new Date().toISOString();
  writeWorkflow(projectPath, taskId, workflow);
}

function handleReopenDev(projectPath, taskId, reason) {
  if (!reason) {
    fail("reopen-dev requires --reason");
  }
  const workflow = readWorkflow(projectPath, taskId);
  if (!["G7_STATIC_AUDIT_PASSED", "G8_PREVIEW_CONFIRMED", "G9_PUBLISH_READY", "DONE"].includes(workflow.currentGate)) {
    fail(`Cannot reopen development from ${workflow.currentGate}`);
  }
  appendHistory(workflow, "G6_DEVELOPMENT", { reason });
  workflow.blocked = false;
  workflow.blockReason = "";
  writeWorkflow(projectPath, taskId, workflow);
}

const { command, projectPath, taskId, options } = parseArgs(process.argv.slice(2));

if (!command || !projectPath || !taskId) {
  process.stderr.write("Usage: node scripts/gate.js <status|advance|block|unblock|reopen-dev> <project-path> <task-id> [--confirm text] [--reason text]\n");
  process.exit(1);
}

switch (command) {
  case "status":
    handleStatus(projectPath, taskId);
    break;
  case "advance":
    handleAdvance(projectPath, taskId, options);
    break;
  case "block":
    handleBlock(projectPath, taskId, options.reason || process.argv.slice(5).join(" "));
    break;
  case "unblock":
    handleUnblock(projectPath, taskId);
    break;
  case "reopen-dev":
    handleReopenDev(projectPath, taskId, options.reason);
    break;
  default:
    fail(`Unknown command: ${command}`);
}
