#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./lib/load-config");
const config = loadConfig();

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

function getTaskDir(projectPath, taskId) {
  return path.join(projectPath, config.WEBDESIGN_DIR, config.TASKS_DIR, taskId);
}

function getWorkflowPath(projectPath, taskId) {
  return path.join(getTaskDir(projectPath, taskId), "workflow.json");
}

function readWorkflow(projectPath, taskId) {
  return JSON.parse(fs.readFileSync(getWorkflowPath(projectPath, taskId), "utf8"));
}

function writeWorkflow(projectPath, taskId, workflow) {
  fs.writeFileSync(getWorkflowPath(projectPath, taskId), JSON.stringify(workflow, null, 2));
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
  const auditPath = path.join(getTaskDir(projectPath, taskId), "audit.md");
  if (!fs.existsSync(auditPath)) {
    fail("audit.md is required before advancing to static audit passed");
  }
  const content = fs.readFileSync(auditPath, "utf8");
  if (!/\bPASS\b/.test(content)) {
    fail("audit.md must contain PASS before advancing from development");
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
