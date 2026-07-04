#!/usr/bin/env node

const path = require("node:path");

const { startGateway } = require("./gateway");
const { createLogger } = require("./logger");
const { loadServeConfig } = require("./serve-config");

async function main() {
  const config = loadServeConfig({ cwd: __dirname });
  const configBaseDir = path.dirname(config.__configPath);
  const logger = createLogger({
    rootDir: __dirname,
    level: process.env.LOG_LEVEL,
    service: "web-design-serve-gateway"
  });

  const gateway = await startGateway({
    ...config,
    projectsDir: path.resolve(configBaseDir, config.projectsDir || "./projects"),
    logger
  });

  logger.info("process.ready", {
    url: gateway.url
  });
  process.stdout.write(`${gateway.url}\n`);

  const shutdown = async () => {
    logger.info("process.shutdown_requested", {
      signal: "SIGTERM_OR_SIGINT"
    });
    await gateway.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  const logger = createLogger({
    rootDir: __dirname,
    level: process.env.LOG_LEVEL,
    service: "web-design-serve-gateway"
  });
  logger.error("process.start_failed", {
    error
  });
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
