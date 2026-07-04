const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { createLogger } = require("./logger");

function createWritableBuffer() {
  let output = "";
  return {
    write(chunk) {
      output += String(chunk);
    },
    read() {
      return output;
    }
  };
}

function readJsonLines(filePath) {
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) {
    return [];
  }
  return text.split("\n").map((line) => JSON.parse(line));
}

test("logger writes categorized jsonl files and human-readable console logs", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-logger-"));
  const stdout = createWritableBuffer();
  const stderr = createWritableBuffer();
  const logger = createLogger({
    rootDir,
    level: "info",
    now: () => new Date("2026-07-04T12:34:56.000Z"),
    stdout,
    stderr
  });

  logger.info("gateway.started", { port: 4173 });
  logger.info("request.completed", { method: "GET", path: "/apps", statusCode: 200 }, { category: "access" });
  logger.error("request.failed", { path: "/apps/APP1/", statusCode: 500 }, { category: "error" });

  const runtimeDir = path.join(rootDir, "logs", "runtime");
  const appLogs = readJsonLines(path.join(runtimeDir, "app-2026-07-04.jsonl"));
  const accessLogs = readJsonLines(path.join(runtimeDir, "access-2026-07-04.jsonl"));
  const errorLogs = readJsonLines(path.join(runtimeDir, "error-2026-07-04.jsonl"));

  assert.equal(appLogs.length, 1);
  assert.equal(appLogs[0].event, "gateway.started");
  assert.equal(accessLogs.length, 1);
  assert.equal(accessLogs[0].path, "/apps");
  assert.equal(errorLogs.length, 1);
  assert.equal(errorLogs[0].statusCode, 500);

  assert.match(stdout.read(), /INFO gateway\.started/);
  assert.match(stdout.read(), /INFO request\.completed/);
  assert.match(stderr.read(), /ERROR request\.failed/);
});

test("logger preserves fields and honors log level", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-logger-redact-"));
  const stdout = createWritableBuffer();
  const stderr = createWritableBuffer();
  const logger = createLogger({
    rootDir,
    level: "info",
    now: () => new Date("2026-07-04T08:00:00.000Z"),
    stdout,
    stderr
  });

  logger.debug("auth.debug", { requestId: "req-1", sessionToken: "secret-token" });
  logger.error(
    "auth.failed",
    {
      requestId: "req-2",
      sessionToken: "secret-token",
      cookie: "a=b",
      ticket: "ticket-1",
      nested: {
        authorization: "Bearer secret"
      }
    },
    { category: "error" }
  );

  const runtimeDir = path.join(rootDir, "logs", "runtime");
  const errorLogs = readJsonLines(path.join(runtimeDir, "error-2026-07-04.jsonl"));

  assert.equal(fs.existsSync(path.join(runtimeDir, "app-2026-07-04.jsonl")), false);
  assert.equal(errorLogs.length, 1);
  assert.equal(errorLogs[0].sessionToken, "secret-token");
  assert.equal(errorLogs[0].cookie, "a=b");
  assert.equal(errorLogs[0].ticket, "ticket-1");
  assert.equal(errorLogs[0].nested.authorization, "Bearer secret");
  assert.doesNotMatch(stdout.read(), /auth\.debug/);
  assert.match(stderr.read(), /secret-token/);
});
