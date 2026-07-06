/**
 * ensure-serve.js
 *
 * 在 share-preview export 完成后调用。
 * 确保 web-design-serve-gateway pm2 进程处于 online 状态：
 *   1. errored / stopped → kill 占用端口的孤儿进程 → pm2 restart
 *   2. 不存在           → pm2 start ecosystem.config.cjs
 *   3. online           → 直接跳过
 */

const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const SERVE_DIR = path.resolve(__dirname, "..", "..", "serve");
const PM2_BIN = path.join(SERVE_DIR, "node_modules", ".bin", "pm2");
const ECOSYSTEM = path.join(SERVE_DIR, "ecosystem.config.cjs");
const APP_NAME = "web-design-serve-gateway";
const SERVE_PORT = 4173;
const WAIT_MS = 10_000;
const POLL_INTERVAL_MS = 500;

function pm2(...args) {
  return spawnSync(PM2_BIN, args, { encoding: "utf8", cwd: SERVE_DIR });
}

/**
 * 返回 app 的 pm2 状态字符串，或 null（不存在）
 */
function getStatus() {
  const result = pm2("jlist");
  if (result.status !== 0) return null;
  let list;
  try {
    list = JSON.parse(result.stdout);
  } catch {
    return null;
  }
  const app = list.find((p) => p.name === APP_NAME);
  return app ? app.pm2_env.status : null;
}

/**
 * Kill 占用指定端口的进程（macOS / Linux lsof）
 */
function freePort(port) {
  try {
    const out = execFileSync("lsof", ["-ti", `:${port}`], { encoding: "utf8" }).trim();
    if (!out) return;
    for (const pid of out.split("\n").filter(Boolean)) {
      try {
        process.kill(Number(pid), "SIGTERM");
      } catch {
        // 进程已消失则忽略
      }
    }
    // 给进程 500ms 退出
    const deadline = Date.now() + 500;
    while (Date.now() < deadline) { /* busy-wait */ }
  } catch {
    // lsof 不可用或端口已空闲
  }
}

/**
 * 轮询直到 online 或超时
 */
function waitOnline(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = getStatus();
    if (status === "online") return true;
    // busy-wait 轮询（脚本环境，无事件循环）
    const tick = Date.now() + POLL_INTERVAL_MS;
    while (Date.now() < tick) { /* spin */ }
  }
  return false;
}

/**
 * 对外接口：确保服务 online，返回 { alreadyRunning, started, url }
 */
function ensureServeRunning() {
  if (!fs.existsSync(PM2_BIN)) {
    throw new Error(
      `pm2 不存在，请先在 serve/ 目录执行 npm install：${PM2_BIN}`
    );
  }
  if (!fs.existsSync(ECOSYSTEM)) {
    throw new Error(`ecosystem.config.cjs 不存在：${ECOSYSTEM}`);
  }

  const status = getStatus();

  if (status === "online") {
    return { alreadyRunning: true, started: false, url: `http://127.0.0.1:${SERVE_PORT}` };
  }

  if (status === "errored" || status === "stopped") {
    // 释放端口后重启
    freePort(SERVE_PORT);
    const r = pm2("restart", APP_NAME);
    if (r.status !== 0) {
      throw new Error(`pm2 restart 失败：${r.stderr || r.stdout}`);
    }
  } else {
    // 首次启动
    const r = pm2("start", ECOSYSTEM);
    if (r.status !== 0) {
      throw new Error(`pm2 start 失败：${r.stderr || r.stdout}`);
    }
  }

  const ok = waitOnline(WAIT_MS);
  if (!ok) {
    throw new Error(
      `web-design-serve-gateway 启动超时（${WAIT_MS}ms），` +
      `请检查 serve/logs/pm2-error.log`
    );
  }

  return { alreadyRunning: false, started: true, url: `http://127.0.0.1:${SERVE_PORT}` };
}

module.exports = { ensureServeRunning };
