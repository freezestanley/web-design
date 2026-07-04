const fs = require("node:fs");
const path = require("node:path");

const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function normalizeLevel(level) {
  const normalized = String(level || "info").toLowerCase();
  return LOG_LEVELS[normalized] ? normalized : "info";
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Error) && !(value instanceof Date);
}

function sanitizeValue(key, value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(key, item));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, sanitizeValue(childKey, childValue)])
    );
  }

  return value;
}

function sanitizeFields(fields = {}) {
  const sanitized = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, sanitizeValue(key, value)])
  );

  if (fields.error instanceof Error) {
    sanitized.errorName = fields.error.name;
    sanitized.errorMessage = fields.error.message;
    sanitized.stack = fields.error.stack;
    delete sanitized.error;
  }

  return sanitized;
}

function formatConsoleValue(value) {
  if (value === undefined) {
    return null;
  }
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "string") {
    return value.includes(" ") ? JSON.stringify(value) : value;
  }
  return JSON.stringify(value);
}

function formatConsoleLine(record) {
  const extras = Object.entries(record)
    .filter(([key]) => !["ts", "level", "event", "category", "service"].includes(key))
    .map(([key, value]) => {
      const formatted = formatConsoleValue(value);
      return formatted === null ? null : `${key}=${formatted}`;
    })
    .filter(Boolean)
    .join(" ");

  return `${record.ts} ${String(record.level).toUpperCase()} ${record.event}${extras ? ` ${extras}` : ""}\n`;
}

function resolveLogFile(runtimeDir, category, datePart) {
  return path.join(runtimeDir, `${category}-${datePart}.jsonl`);
}

function createLogger(options = {}) {
  const rootDir = path.resolve(options.rootDir || __dirname);
  const runtimeDir = path.join(rootDir, "logs", "runtime");
  const stdout = options.stdout || process.stdout;
  const stderr = options.stderr || process.stderr;
  const now = options.now || (() => new Date());
  const level = normalizeLevel(options.level || process.env.LOG_LEVEL || "info");
  const service = options.service || "web-design-serve";

  function shouldLog(targetLevel) {
    return LOG_LEVELS[normalizeLevel(targetLevel)] >= LOG_LEVELS[level];
  }

  function writeFileRecord(record) {
    const datePart = record.ts.slice(0, 10);
    const filePath = resolveLogFile(runtimeDir, record.category, datePart);
    try {
      fs.mkdirSync(runtimeDir, { recursive: true });
      fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`);
    } catch (error) {
      stderr.write(
        `${new Date().toISOString()} ERROR logger.write_failed event=logger.write_failed file=${filePath} message=${JSON.stringify(error.message)}\n`
      );
    }
  }

  function emit(targetLevel, event, fields = {}, meta = {}) {
    const normalizedTargetLevel = normalizeLevel(targetLevel);
    if (!shouldLog(normalizedTargetLevel)) {
      return;
    }

    const timestamp = now().toISOString();
    const category = meta.category || (normalizedTargetLevel === "error" ? "error" : "app");
    const record = {
      ts: timestamp,
      level: normalizedTargetLevel,
      event,
      category,
      service,
      ...sanitizeFields(fields)
    };

    const line = formatConsoleLine(record);
    if (normalizedTargetLevel === "error") {
      stderr.write(line);
    } else {
      stdout.write(line);
    }
    writeFileRecord(record);
  }

  return {
    debug(event, fields, meta) {
      emit("debug", event, fields, meta);
    },
    info(event, fields, meta) {
      emit("info", event, fields, meta);
    },
    warn(event, fields, meta) {
      emit("warn", event, fields, meta);
    },
    error(event, fields, meta) {
      emit("error", event, fields, meta);
    }
  };
}

module.exports = {
  createLogger
};
