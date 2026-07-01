#!/usr/bin/env node
/**
 * web-design 任务自动续航检查
 * 扫描所有项目，找出卡在非 DONE 状态的任务，尝试自动推进不需要确认的 gate
 */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const PROJECTS_DIR = process.env.PROJECTS_DIR || "/home/ubuntu/claw-workspace/projects";
const WEBDESIGN_SCRIPT_DIR = path.join(
  process.env.WEBDESIGN_DIR || "/home/ubuntu/claw-workspace/.agents/skills/web-design",
  "scripts"
);

const CONFIRM_REQUIRED_GATES = new Set([
  "G2_PRODUCT_WRITTEN",
  "G4_DESIGN_WRITTEN",
  "G8_PREVIEW_CONFIRMED",
]);

// Gate 推进链
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

function findProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs.readdirSync(PROJECTS_DIR)
    .map(name => path.join(PROJECTS_DIR, name))
    .filter(p => fs.statSync(p).isDirectory())
    .filter(p => fs.existsSync(path.join(p, ".webdesign", "project.json")));
}

function findTasks(projectPath) {
  const tasksDir = path.join(projectPath, ".webdesign", "tasks");
  if (!fs.existsSync(tasksDir)) return [];
  return fs.readdirSync(tasksDir)
    .map(name => ({
      taskId: name,
      taskPath: path.join(tasksDir, name),
      workflowPath: path.join(tasksDir, name, "workflow.json")
    }))
    .filter(t => fs.existsSync(t.workflowPath));
}

function readWorkflow(task) {
  try {
    return JSON.parse(fs.readFileSync(task.workflowPath, "utf8"));
  } catch (e) {
    return null;
  }
}

function canAutoAdvance(gate) {
  // 不需要用户确认的 gate 可以自动推进
  return !CONFIRM_REQUIRED_GATES.has(gate);
}

function hasCode(projectPath, pageSlug) {
  const pagesDir = path.join(projectPath, "src", "pages");
  if (!fs.existsSync(pagesDir)) return false;
  const candidates = [
    path.join(pagesDir, pageSlug),
    path.join(pagesDir, `${pageSlug}.jsx`),
    path.join(pagesDir, `${pageSlug}.tsx`),
    path.join(pagesDir, `${pageSlug}.vue`),
    path.join(pagesDir, `${pageSlug}.js`),
  ];
  return candidates.some(p => fs.existsSync(p));
}

function hasDist(projectPath, pageSlug) {
  const taskDist = path.join(projectPath, "dist", pageSlug, "index.html");
  const rootDist = path.join(projectPath, "dist", "index.html");
  return fs.existsSync(taskDist) || fs.existsSync(rootDist);
}

function hasAuditPass(projectPath, taskId) {
  const auditPath = path.join(projectPath, ".webdesign", "tasks", taskId, "audit.md");
  if (!fs.existsSync(auditPath)) return false;
  const content = fs.readFileSync(auditPath, "utf8");
  // 匹配 "## 结论" 节下第一个非空行必须是 PASS，模板默认是 PENDING 不通过
  return /^##\s*结论\s*\n\s*PASS\s*$/m.test(content);
}

function advanceGate(projectPath, taskId, confirm = null) {
  const cmd = [
    "node",
    path.join(WEBDESIGN_SCRIPT_DIR, "gate.js"),
    "advance",
    projectPath,
    taskId
  ];
  if (confirm) {
    cmd.push("--confirm", confirm);
  }
  try {
    execSync(cmd.join(" "), { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.stderr?.toString() || e.message };
  }
}

function runPublish(projectPath, taskId) {
  const cmd = [
    "node",
    path.join(WEBDESIGN_SCRIPT_DIR, "publish.js"),
    projectPath,
    taskId
  ];
  try {
    const output = execSync(cmd.join(" "), { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    return { ok: true, output };
  } catch (e) {
    return { ok: false, error: e.stderr?.toString() || e.message };
  }
}


function main() {
  const projects = findProjects();
  const results = [];

  for (const projectPath of projects) {
    const projectName = path.basename(projectPath);
    const tasks = findTasks(projectPath);

    for (const task of tasks) {
      const workflow = readWorkflow(task);
      if (!workflow) continue;

      const { currentGate, pageSlug } = workflow;
      if (currentGate === "DONE") continue;

      const result = {
        project: projectName,
        taskId: task.taskId,
        gate: currentGate,
        actions: [],
        blocked: workflow.blocked,
        blockReason: workflow.blockReason
      };

      if (workflow.blocked) {
        results.push(result);
        continue;
      }

      // 策略：根据 gate 状态和项目实际情况决定行动
      switch (currentGate) {
        case "G5_DESIGN_CONFIRMED":
          // hasCode 按 pageSlug 精确匹配，只推 G5→G6，止步
          if (hasCode(projectPath, pageSlug)) {
            const r = advanceGate(projectPath, task.taskId);
            if (r.ok) {
              result.actions.push("✅ 已推进到 G6_DEVELOPMENT");
            } else {
              result.actions.push(`❌ 推进失败: ${r.error}`);
            }
          } else {
            result.actions.push("⏳ 等待开发完成");
          }
          break;

        case "G6_DEVELOPMENT":
          if (hasDist(projectPath, pageSlug)) {
            if (!hasAuditPass(projectPath, task.taskId)) {
              result.actions.push("⏸ 等待人工审计：请填写 audit.md 并将结论改为 PASS");
            } else {
              const r = advanceGate(projectPath, task.taskId);
              if (r.ok) {
                result.actions.push("✅ 已推进到 G7_STATIC_AUDIT_PASSED");
              } else {
                result.actions.push(`❌ 推进失败: ${r.error}`);
              }
            }
          } else {
            result.actions.push("⏳ 等待构建完成（dist 不存在）");
          }
          break;

        case "G7_STATIC_AUDIT_PASSED":
          // G8 = PREVIEW_CONFIRMED，必须人工预览后手动 advance，不自动推进
          result.actions.push("⏸ 等待用户预览确认后手动执行 gate advance");
          break;

        case "G8_PREVIEW_CONFIRMED":
        case "G9_PUBLISH_READY":
          // 需要用户确认，不能自动推进
          result.actions.push("⏸ 等待用户确认后执行发布");
          break;

        default:
          if (canAutoAdvance(currentGate)) {
            const r = advanceGate(projectPath, task.taskId);
            if (r.ok) {
              result.actions.push(`✅ 已自动推进到下一个 gate`);
            } else {
              result.actions.push(`❌ 推进失败: ${r.error}`);
            }
          } else {
            result.actions.push("⏸ 需要用户确认，等待中");
          }
      }

      results.push(result);
    }
  }

  // 输出 JSON 结果
  console.log(JSON.stringify(results, null, 2));

  // 写入检查结果日志
  const checkLogPath = path.join(PROJECTS_DIR, "..", "memory", "heartbeat-check.json");
  const checkDir = path.dirname(checkLogPath);
  if (!fs.existsSync(checkDir)) fs.mkdirSync(checkDir, { recursive: true });
  fs.writeFileSync(checkLogPath, JSON.stringify({
    checkedAt: new Date().toISOString(),
    projects: results
  }, null, 2));
}

main();
