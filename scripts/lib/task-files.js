const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./load-config");

const config = loadConfig();

function getTaskDir(projectPath, taskId) {
  return path.join(projectPath, config.WEBDESIGN_DIR, config.TASKS_DIR, taskId);
}

function getWorkflowPath(projectPath, taskId) {
  return path.join(getTaskDir(projectPath, taskId), "workflow.json");
}

function getProductPath(projectPath, taskId) {
  return path.join(getTaskDir(projectPath, taskId), "product.md");
}

function getAuditPath(projectPath, taskId) {
  return path.join(getTaskDir(projectPath, taskId), "audit.md");
}

function readWorkflow(projectPath, taskId) {
  return JSON.parse(fs.readFileSync(getWorkflowPath(projectPath, taskId), "utf8"));
}

function writeWorkflow(projectPath, taskId, workflow) {
  fs.writeFileSync(getWorkflowPath(projectPath, taskId), JSON.stringify(workflow, null, 2));
}

module.exports = {
  getTaskDir,
  getWorkflowPath,
  getProductPath,
  getAuditPath,
  readWorkflow,
  writeWorkflow
};
