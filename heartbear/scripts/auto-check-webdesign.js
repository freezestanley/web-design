#!/usr/bin/env node
/**
 * web-design 心跳检查
 * 只负责发现任务状态、输出催促信息和写入日志，不自动推进 gate、不自动发布。
 */

const fs = require("node:fs");
const path = require("node:path");

const PROJECTS_DIR = process.env.PROJECTS_DIR || "/home/ubuntu/claw-workspace/projects";
const HEARTBEAT_MEMORY_DIR = process.env.HEARTBEAT_MEMORY_DIR || path.join(PROJECTS_DIR, "..", "memory");
const NOW_TS = process.env.HEARTBEAT_NOW ? Date.parse(process.env.HEARTBEAT_NOW) : Date.now();
const DEV_STALE_SECONDS = Number(process.env.HEARTBEAT_DEV_STALE_SECONDS || 30);
const CONFIRM_STALE_SECONDS = Number(process.env.HEARTBEAT_CONFIRM_STALE_SECONDS || 60);
const PUBLISH_STALE_SECONDS = Number(process.env.HEARTBEAT_PUBLISH_STALE_SECONDS || 180);
const DEV_COOLDOWN_SECONDS = Number(process.env.HEARTBEAT_DEV_COOLDOWN_SECONDS || 120);
const CONFIRM_COOLDOWN_SECONDS = Number(process.env.HEARTBEAT_CONFIRM_COOLDOWN_SECONDS || 600);
const PUBLISH_COOLDOWN_SECONDS = Number(process.env.HEARTBEAT_PUBLISH_COOLDOWN_SECONDS || 600);

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

function readProgress(taskPath) {
  const progressPath = path.join(taskPath, "progress", "latest.md");
  if (!fs.existsSync(progressPath)) {
    return null;
  }

  const content = fs.readFileSync(progressPath, "utf8");
  const progress = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || !line.includes(":")) continue;
    const separatorIndex = line.indexOf(":");
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) {
      progress[key] = value;
    }
  }

  return progress;
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

function getStaleSeconds(task, workflow, progress) {
  const workflowUpdated = Date.parse(workflow.updatedAt || "");
  const progressUpdated = Date.parse(progress?.updatedAt || "");
  const explicitTs = Math.max(
    Number.isFinite(workflowUpdated) ? workflowUpdated : 0,
    Number.isFinite(progressUpdated) ? progressUpdated : 0
  );
  const latestTs = explicitTs || latestMtimeMs(task.taskPath);

  if (!latestTs || !Number.isFinite(NOW_TS)) return 0;
  return Math.max(0, Math.floor((NOW_TS - latestTs) / 1000));
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
  staleMinutes,
  staleSeconds,
  progressTask,
  progressSummary,
  progressNext
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
    staleMinutes,
    staleSeconds,
    progressTask,
    progressSummary,
    progressNext
  };
}

function classifyTask(projectPath, projectName, task, workflow) {
  const gate = workflow.currentGate;
  const pageSlug = workflow.pageSlug;
  const progress = readProgress(task.taskPath);
  const staleSeconds = getStaleSeconds(task, workflow, progress);
  const staleMinutes = Math.floor(staleSeconds / 60);
  const progressTask = progress?.task || "";
  const progressSummary = progress?.summary || "";
  const progressNext = progress?.next || "";

  function entry(extra) {
    return makeEntry({
      ...extra,
      project: projectName,
      taskId: task.taskId,
      gate,
      blocked: extra.blocked ?? false,
      blockReason: extra.blockReason ?? "",
      staleMinutes,
      staleSeconds,
      progressTask,
      progressSummary,
      progressNext
    });
  }

  if (workflow.blocked) {
    return entry({
      gate,
      severity: "critical",
      status: "blocked",
      reason: workflow.blockReason || "task is blocked",
      suggestedNextAction: "unblock the task or update workflow.blockReason with a resolvable action",
      blocked: true,
      blockReason: workflow.blockReason || ""
    });
  }

  if (gate === "G2_PRODUCT_WRITTEN") {
    return entry({
      gate,
      severity: "warn",
      status: "awaiting_product_confirmation",
      reason: "product.md is written and waiting for user confirmation",
      suggestedNextAction: "ask the user to confirm product.md before advancing"
    });
  }

  if (gate === "G4_DESIGN_WRITTEN") {
    return entry({
      gate,
      severity: "warn",
      status: "awaiting_design_confirmation",
      reason: "design.md is written and waiting for user confirmation",
      suggestedNextAction: "ask the user to confirm design.md before advancing"
    });
  }

  if (gate === "G5_DESIGN_CONFIRMED") {
    if (hasCode(projectPath, pageSlug)) {
      return entry({
        gate,
        severity: "warn",
        status: "ready_for_next_gate",
        reason: "page code already exists but workflow has not advanced to development",
        suggestedNextAction: "review progress and advance to the next gate when appropriate"
      });
    }

    return entry({
      gate,
      severity: staleSeconds >= DEV_STALE_SECONDS ? "critical" : "warn",
      status: staleSeconds >= DEV_STALE_SECONDS ? "stalled" : "needs_development",
      reason: staleSeconds >= DEV_STALE_SECONDS
        ? "design is confirmed but development appears stalled"
        : "design is confirmed but page code is not present yet",
      suggestedNextAction: "continue development for the confirmed page"
    });
  }

  if (gate === "G6_DEVELOPMENT") {
    const distReady = hasDist(projectPath, pageSlug);
    const audit = getAuditStatus(projectPath, task.taskId);

    if (!distReady) {
      return entry({
        gate,
        severity: staleSeconds >= DEV_STALE_SECONDS ? "critical" : "warn",
        status: staleSeconds >= DEV_STALE_SECONDS ? "stalled" : "needs_build",
        reason: staleSeconds >= DEV_STALE_SECONDS
          ? "development has not produced a build for too long"
          : "dist output is missing",
        suggestedNextAction: "finish development and run the production build"
      });
    }

    if (audit.conclusion === "PASS") {
      return entry({
        gate,
        severity: "warn",
        status: "audit_passed_waiting_advance",
        reason: "dist exists and audit.md is PASS, but workflow is still in development",
        suggestedNextAction: "advance the workflow to static audit passed"
      });
    }

    if (audit.conclusion === "MISSING") {
      return entry({
        gate,
        severity: "warn",
        status: "needs_audit",
        reason: "dist exists but audit.md is missing",
        suggestedNextAction: "create audit.md and complete the static audit"
      });
    }

    if (audit.conclusion === "PENDING" || audit.conclusion === "UNKNOWN") {
      return entry({
        gate,
        severity: "warn",
        status: "needs_audit",
        reason: `dist exists but audit conclusion is ${audit.conclusion}`,
        suggestedNextAction: "finish the static audit and update conclusion to PASS or FAIL"
      });
    }

    return entry({
      gate,
      severity: "critical",
      status: "inconsistent_state",
      reason: `audit conclusion is ${audit.conclusion}, which needs manual review`,
      suggestedNextAction: "inspect audit.md and reconcile workflow state manually"
    });
  }

  if (gate === "G7_STATIC_AUDIT_PASSED" || gate === "G8_PREVIEW") {
    return entry({
      gate,
      severity: "warn",
      status: "awaiting_preview_confirmation",
      reason: "the task is waiting for preview review before publish readiness",
      suggestedNextAction: "open the preview, send the URL, and ask the user for confirmation"
    });
  }

  if (gate === "G8_PREVIEW_CONFIRMED") {
    return entry({
      gate,
      severity: "warn",
      status: "ready_for_next_gate",
      reason: "preview is confirmed and the workflow can move to publish readiness",
      suggestedNextAction: "advance the workflow to G9_PUBLISH_READY"
    });
  }

  if (gate === "G9_PUBLISH_READY") {
    return entry({
      gate,
      severity: "warn",
      status: "publish_ready",
      reason: "the task is ready for publish and waiting for explicit user approval",
      suggestedNextAction: "wait for the user to explicitly say 发布, then run publish.js"
    });
  }

  return entry({
    gate,
    severity: staleSeconds >= DEV_STALE_SECONDS ? "critical" : "info",
    status: staleSeconds >= DEV_STALE_SECONDS ? "stalled" : "ready_for_next_gate",
    reason: staleSeconds >= DEV_STALE_SECONDS
      ? `workflow has stayed at ${gate} for ${staleMinutes} minutes`
      : `workflow is still active at ${gate}`,
    suggestedNextAction: "inspect the current gate and continue the next concrete step"
  });
}

function formatAlert(entry) {
  const progressBits = [];
  if (entry.progressSummary) {
    progressBits.push(`最近完成：${entry.progressSummary}`);
  }
  if (entry.progressNext) {
    progressBits.push(`下一步：${entry.progressNext}`);
  }

  return `🔔 [${entry.project}] 任务 ${entry.taskId}：${entry.gate}，${entry.reason}，${entry.suggestedNextAction}${progressBits.length ? `，${progressBits.join("，")}` : ""}`;
}

function getAlertPolicy(entry) {
  if (entry.status === "blocked" || entry.status === "inconsistent_state") {
    return { thresholdSeconds: 0, cooldownSeconds: DEV_COOLDOWN_SECONDS };
  }

  if (entry.status === "awaiting_product_confirmation" || entry.status === "awaiting_design_confirmation" || entry.status === "awaiting_preview_confirmation") {
    return { thresholdSeconds: CONFIRM_STALE_SECONDS, cooldownSeconds: CONFIRM_COOLDOWN_SECONDS };
  }

  if (entry.status === "publish_ready") {
    return { thresholdSeconds: PUBLISH_STALE_SECONDS, cooldownSeconds: PUBLISH_COOLDOWN_SECONDS };
  }

  if (entry.status === "needs_build" || entry.status === "needs_development" || entry.status === "stalled" || entry.status === "needs_audit") {
    return { thresholdSeconds: DEV_STALE_SECONDS, cooldownSeconds: DEV_COOLDOWN_SECONDS };
  }

  return { thresholdSeconds: 0, cooldownSeconds: DEV_COOLDOWN_SECONDS };
}

function readAlertState() {
  const statePath = path.join(HEARTBEAT_MEMORY_DIR, "heartbeat-alert-state.json");
  if (!fs.existsSync(statePath)) {
    return { path: statePath, entries: {} };
  }

  try {
    return {
      path: statePath,
      entries: JSON.parse(fs.readFileSync(statePath, "utf8"))
    };
  } catch {
    return { path: statePath, entries: {} };
  }
}

function writeAlertState(state) {
  const stateDir = path.dirname(state.path);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }
  fs.writeFileSync(state.path, JSON.stringify(state.entries, null, 2));
}

function shouldEmitAlert(entry, state) {
  const { thresholdSeconds, cooldownSeconds } = getAlertPolicy(entry);
  if (entry.staleSeconds < thresholdSeconds) {
    return false;
  }

  const key = `${entry.project}::${entry.taskId}`;
  const fingerprint = [
    entry.gate,
    entry.status,
    entry.reason,
    entry.suggestedNextAction,
    entry.progressSummary,
    entry.progressNext
  ].join("|");
  const previous = state.entries[key];

  if (!previous || previous.fingerprint !== fingerprint) {
    state.entries[key] = { fingerprint, sentAt: NOW_TS };
    return true;
  }

  if ((NOW_TS - previous.sentAt) / 1000 >= cooldownSeconds) {
    state.entries[key] = { fingerprint, sentAt: NOW_TS };
    return true;
  }

  return false;
}

function writeLog(results, alerts) {
  const checkLogPath = path.join(HEARTBEAT_MEMORY_DIR, "heartbeat-check.json");
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
  const alertState = readAlertState();

  for (const projectPath of findProjects()) {
    const projectName = path.basename(projectPath);
    for (const task of findTasks(projectPath)) {
      const workflow = readWorkflow(task);
      if (!workflow || workflow.currentGate === "DONE") continue;

      const entry = classifyTask(projectPath, projectName, task, workflow);
      results.push(entry);
      if (shouldEmitAlert(entry, alertState)) {
        alerts.push(formatAlert(entry));
      }
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
  writeAlertState(alertState);
}

main();
