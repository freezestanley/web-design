#!/usr/bin/env node
/**
 * web-design 心跳检查
 * 只负责发现任务状态、输出催促信息和写入日志，不自动推进 gate、不自动发布。
 */

const fs = require("node:fs");
const path = require("node:path");

const PROJECTS_DIR = process.env.PROJECTS_DIR || "/home/ubuntu/claw-workspace/projects";
const STALE_MINUTES_THRESHOLD = Number(process.env.HEARTBEAT_STALE_MINUTES || 120);
const NOW_TS = process.env.HEARTBEAT_NOW ? Date.parse(process.env.HEARTBEAT_NOW) : Date.now();

function findProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs.readdirSync(PROJECTS_DIR)
    .map((name) => path.join(PROJECTS_DIR, name))
    .filter((projectPath) => fs.statSync(projectPath).isDirectory())
    .filter((projectPath) => fs.existsSync(path.join(projectPath, ".webdesign", "project.json")));
}

function findTasks(projectPath) {
  const tasksDir = path.join(projectPath, ".webdesign", "tasks");
  if (!fs.existsSync(tasksDir)) return [];
  return fs.readdirSync(tasksDir)
    .map((taskId) => ({
      taskId,
      taskPath: path.join(tasksDir, taskId),
      workflowPath: path.join(tasksDir, taskId, "workflow.json")
    }))
    .filter((task) => fs.existsSync(task.workflowPath));
}

function readWorkflow(task) {
  try {
    return JSON.parse(fs.readFileSync(task.workflowPath, "utf8"));
  } catch {
    return null;
  }
}

function hasCode(projectPath, pageSlug) {
  const pagesDir = path.join(projectPath, "src", "pages");
  if (!fs.existsSync(pagesDir) || !pageSlug) return false;
  const candidates = [
    path.join(pagesDir, pageSlug),
    path.join(pagesDir, `${pageSlug}.jsx`),
    path.join(pagesDir, `${pageSlug}.tsx`),
    path.join(pagesDir, `${pageSlug}.vue`),
    path.join(pagesDir, `${pageSlug}.js`)
  ];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

function hasDist(projectPath, pageSlug) {
  const taskDist = path.join(projectPath, "dist", pageSlug || "", "index.html");
  const rootDist = path.join(projectPath, "dist", "index.html");
  return fs.existsSync(taskDist) || fs.existsSync(rootDist);
}

function getAuditStatus(projectPath, taskId) {
  const auditPath = path.join(projectPath, ".webdesign", "tasks", taskId, "audit.md");
  if (!fs.existsSync(auditPath)) {
    return { exists: false, conclusion: "MISSING" };
  }

  const content = fs.readFileSync(auditPath, "utf8");
  const match = content.match(/^conclusion:\s*(\w+)\s*$/im);
  return {
    exists: true,
    conclusion: match ? match[1].toUpperCase() : "UNKNOWN"
  };
}

function latestMtimeMs(dirPath) {
  let latest = 0;
  if (!fs.existsSync(dirPath)) return latest;

  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    latest = Math.max(latest, stat.mtimeMs);
    if (!stat.isDirectory()) continue;
    for (const entry of fs.readdirSync(current)) {
      stack.push(path.join(current, entry));
    }
  }

  return latest;
}

function getStaleMinutes(task, workflow) {
  const workflowUpdated = Date.parse(workflow.updatedAt || "");
  const latestFileTs = latestMtimeMs(task.taskPath);
  const latestTs = Math.max(
    Number.isFinite(workflowUpdated) ? workflowUpdated : 0,
    latestFileTs
  );

  if (!latestTs || !Number.isFinite(NOW_TS)) return 0;
  return Math.max(0, Math.floor((NOW_TS - latestTs) / 60000));
}

function makeEntry({
  project,
  taskId,
  gate,
  severity,
  status,
  reason,
  suggestedNextAction,
  blocked,
  blockReason,
  staleMinutes
}) {
  return {
    project,
    taskId,
    gate,
    severity,
    status,
    reason,
    suggestedNextAction,
    blocked,
    blockReason,
    staleMinutes
  };
}

function classifyTask(projectPath, projectName, task, workflow) {
  const gate = workflow.currentGate;
  const pageSlug = workflow.pageSlug;
  const staleMinutes = getStaleMinutes(task, workflow);
  const isStalled = staleMinutes >= STALE_MINUTES_THRESHOLD;

  if (workflow.blocked) {
    return makeEntry({
      project: projectName,
      taskId: task.taskId,
      gate,
      severity: "critical",
      status: "blocked",
      reason: workflow.blockReason || "task is blocked",
      suggestedNextAction: "unblock the task or update workflow.blockReason with a resolvable action",
      blocked: true,
      blockReason: workflow.blockReason || "",
      staleMinutes
    });
  }

  if (gate === "G2_PRODUCT_WRITTEN") {
    return makeEntry({
      project: projectName,
      taskId: task.taskId,
      gate,
      severity: "warn",
      status: "awaiting_product_confirmation",
      reason: "product.md is written and waiting for user confirmation",
      suggestedNextAction: "ask the user to confirm product.md before advancing",
      blocked: false,
      blockReason: "",
      staleMinutes
    });
  }

  if (gate === "G4_DESIGN_WRITTEN") {
    return makeEntry({
      project: projectName,
      taskId: task.taskId,
      gate,
      severity: "warn",
      status: "awaiting_design_confirmation",
      reason: "design.md is written and waiting for user confirmation",
      suggestedNextAction: "ask the user to confirm design.md before advancing",
      blocked: false,
      blockReason: "",
      staleMinutes
    });
  }

  if (gate === "G5_DESIGN_CONFIRMED") {
    if (hasCode(projectPath, pageSlug)) {
      return makeEntry({
        project: projectName,
        taskId: task.taskId,
        gate,
        severity: "warn",
        status: "ready_for_next_gate",
        reason: "page code already exists but workflow has not advanced to development",
        suggestedNextAction: "review progress and advance to the next gate when appropriate",
        blocked: false,
        blockReason: "",
        staleMinutes
      });
    }

    return makeEntry({
      project: projectName,
      taskId: task.taskId,
      gate,
      severity: isStalled ? "critical" : "warn",
      status: isStalled ? "stalled" : "needs_development",
      reason: isStalled
        ? "design is confirmed but development appears stalled"
        : "design is confirmed but page code is not present yet",
      suggestedNextAction: "continue development for the confirmed page",
      blocked: false,
      blockReason: "",
      staleMinutes
    });
  }

  if (gate === "G6_DEVELOPMENT") {
    const distReady = hasDist(projectPath, pageSlug);
    const audit = getAuditStatus(projectPath, task.taskId);

    if (!distReady) {
      return makeEntry({
        project: projectName,
        taskId: task.taskId,
        gate,
        severity: isStalled ? "critical" : "warn",
        status: isStalled ? "stalled" : "needs_build",
        reason: isStalled
          ? "development has not produced a build for too long"
          : "dist output is missing",
        suggestedNextAction: "finish development and run the production build",
        blocked: false,
        blockReason: "",
        staleMinutes
      });
    }

    if (audit.conclusion === "PASS") {
      return makeEntry({
        project: projectName,
        taskId: task.taskId,
        gate,
        severity: "warn",
        status: "audit_passed_waiting_advance",
        reason: "dist exists and audit.md is PASS, but workflow is still in development",
        suggestedNextAction: "advance the workflow to static audit passed",
        blocked: false,
        blockReason: "",
        staleMinutes
      });
    }

    if (audit.conclusion === "MISSING") {
      return makeEntry({
        project: projectName,
        taskId: task.taskId,
        gate,
        severity: "warn",
        status: "needs_audit",
        reason: "dist exists but audit.md is missing",
        suggestedNextAction: "create audit.md and complete the static audit",
        blocked: false,
        blockReason: "",
        staleMinutes
      });
    }

    if (audit.conclusion === "PENDING" || audit.conclusion === "UNKNOWN") {
      return makeEntry({
        project: projectName,
        taskId: task.taskId,
        gate,
        severity: "warn",
        status: "needs_audit",
        reason: `dist exists but audit conclusion is ${audit.conclusion}`,
        suggestedNextAction: "finish the static audit and update conclusion to PASS or FAIL",
        blocked: false,
        blockReason: "",
        staleMinutes
      });
    }

    return makeEntry({
      project: projectName,
      taskId: task.taskId,
      gate,
      severity: "critical",
      status: "inconsistent_state",
      reason: `audit conclusion is ${audit.conclusion}, which needs manual review`,
      suggestedNextAction: "inspect audit.md and reconcile workflow state manually",
      blocked: false,
      blockReason: "",
      staleMinutes
    });
  }

  if (gate === "G7_STATIC_AUDIT_PASSED" || gate === "G8_PREVIEW") {
    return makeEntry({
      project: projectName,
      taskId: task.taskId,
      gate,
      severity: "warn",
      status: "awaiting_preview_confirmation",
      reason: "the task is waiting for preview review before publish readiness",
      suggestedNextAction: "open the preview, send the URL, and ask the user for confirmation",
      blocked: false,
      blockReason: "",
      staleMinutes
    });
  }

  if (gate === "G8_PREVIEW_CONFIRMED") {
    return makeEntry({
      project: projectName,
      taskId: task.taskId,
      gate,
      severity: "warn",
      status: "ready_for_next_gate",
      reason: "preview is confirmed and the workflow can move to publish readiness",
      suggestedNextAction: "advance the workflow to G9_PUBLISH_READY",
      blocked: false,
      blockReason: "",
      staleMinutes
    });
  }

  if (gate === "G9_PUBLISH_READY") {
    return makeEntry({
      project: projectName,
      taskId: task.taskId,
      gate,
      severity: "warn",
      status: "publish_ready",
      reason: "the task is ready for publish and waiting for explicit user approval",
      suggestedNextAction: "wait for the user to explicitly say 发布, then run publish.js",
      blocked: false,
      blockReason: "",
      staleMinutes
    });
  }

  return makeEntry({
    project: projectName,
    taskId: task.taskId,
    gate,
    severity: isStalled ? "critical" : "info",
    status: isStalled ? "stalled" : "ready_for_next_gate",
    reason: isStalled
      ? `workflow has stayed at ${gate} for ${staleMinutes} minutes`
      : `workflow is still active at ${gate}`,
    suggestedNextAction: "inspect the current gate and continue the next concrete step",
    blocked: false,
    blockReason: "",
    staleMinutes
  });
}

function formatAlert(entry) {
  return `🔔 [${entry.project}] 任务 ${entry.taskId}：${entry.gate}，${entry.reason}，${entry.suggestedNextAction}`;
}

function writeLog(results, alerts) {
  const checkLogPath = path.join(PROJECTS_DIR, "..", "memory", "heartbeat-check.json");
  const checkDir = path.dirname(checkLogPath);
  if (!fs.existsSync(checkDir)) {
    fs.mkdirSync(checkDir, { recursive: true });
  }

  fs.writeFileSync(
    checkLogPath,
    JSON.stringify(
      {
        checkedAt: new Date(NOW_TS).toISOString(),
        alertCount: alerts.length,
        projects: results
      },
      null,
      2
    )
  );
}

function main() {
  const results = [];
  const alerts = [];

  for (const projectPath of findProjects()) {
    const projectName = path.basename(projectPath);
    for (const task of findTasks(projectPath)) {
      const workflow = readWorkflow(task);
      if (!workflow || workflow.currentGate === "DONE") continue;

      const entry = classifyTask(projectPath, projectName, task, workflow);
      results.push(entry);
      alerts.push(formatAlert(entry));
    }
  }

  if (alerts.length > 0) {
    console.log("⚠️ 发现需要关注的任务：");
    for (const alert of alerts) {
      console.log(alert);
    }
    console.log("");
    console.log(`共 ${alerts.length} 项待处理。`);
    console.log("");
  }

  console.log(JSON.stringify(results, null, 2));
  writeLog(results, alerts);
}

main();
