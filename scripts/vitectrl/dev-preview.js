#!/usr/bin/env node

const path = require("node:path");
const {
  cleanupManagedPreviews,
  getManagedPreviewStatus,
  startManagedPreview
} = require("./lib/controller");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--registry" || arg === "--max-services" || arg === "--bypass") {
      options[arg.slice(2)] = argv[index + 1] || "";
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  return {
    command: positional[0],
    projectPath: positional[1],
    options
  };
}

function buildPreviewGatewayUrl(projectPath, previewGatewayOrigin = process.env.WEB_DESIGN_PREVIEW_GATEWAY_ORIGIN || "http://127.0.0.1:4173") {
  return `${previewGatewayOrigin}/preview/dev/${path.basename(path.resolve(projectPath))}/`;
}

async function main() {
  const { command, projectPath, options } = parseArgs(process.argv.slice(2));
  const registryPath = options.registry
    ? path.resolve(options.registry)
    : undefined;
  const maxServices = options["max-services"] ? Number(options["max-services"]) : 5;
  const bypassAuth = options.bypass === "" ? true : options.bypass !== "false";

  if (!command) {
    fail("Usage: node scripts/vitectrl/dev-preview.js <start|status|cleanup> [project-path] [--registry path] [--max-services 5]");
  }

  switch (command) {
    case "start": {
      if (!projectPath) {
        fail("start requires <project-path>");
      }
      const result = await startManagedPreview({
        registryPath,
        projectPath: path.resolve(projectPath),
        bypassAuth,
        maxServices
      });
      process.stdout.write(
        `${JSON.stringify(
          {
            ...result,
            previewGatewayUrl: buildPreviewGatewayUrl(projectPath)
          },
          null,
          2
        )}\n`
      );
      return;
    }
    case "status": {
      const result = await getManagedPreviewStatus({ registryPath });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
    case "cleanup": {
      const result = await cleanupManagedPreviews({ registryPath, maxServices });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
    default:
      fail(`Unknown command: ${command}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    fail(error.message);
  });
}

module.exports = {
  buildPreviewGatewayUrl,
  parseArgs
};
