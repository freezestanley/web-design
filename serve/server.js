#!/usr/bin/env node

const path = require("node:path");

const { startGateway } = require("./gateway");
const { loadServeConfig } = require("./serve-config");

async function main() {
  const config = loadServeConfig({ cwd: __dirname });
  const configBaseDir = path.dirname(config.__configPath);

  const gateway = await startGateway({
    ...config,
    projectsDir: path.resolve(configBaseDir, config.projectsDir || "./projects")
  });

  process.stdout.write(`${gateway.url}\n`);

  const shutdown = async () => {
    await gateway.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
