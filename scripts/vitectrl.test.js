const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  startManagedPreview,
  getManagedPreviewStatus,
  cleanupManagedPreviews
} = require("./vitectrl/lib/controller");
const { buildPreviewGatewayUrl } = require("./vitectrl/dev-preview");

let nextFakePort = 4100;

function createFakeServerScript(dirPath) {
  const scriptPath = path.join(dirPath, "fake-dev-server.cjs");
  fs.writeFileSync(
    scriptPath,
    [
      "const fs = require('node:fs');",
      "const readyFile = process.argv[3];",
      "fs.writeFileSync(readyFile, process.argv[2]);",
      "const hold = setInterval(() => {}, 1000);",
      "function shutdown() {",
      "  clearInterval(hold);",
      "  process.exit(0);",
      "}",
      "process.on('SIGTERM', shutdown);",
      "process.on('SIGINT', shutdown);"
    ].join("\n")
  );
  return scriptPath;
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

async function waitForPidExit(pid, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isPidAlive(pid)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

async function terminateRecords(registryPath) {
  if (!fs.existsSync(registryPath)) {
    return;
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  for (const service of registry.services || []) {
    if (isPidAlive(service.pid)) {
      try {
        process.kill(service.pid, "SIGKILL");
      } catch (error) {
        // Ignore already-exited processes during test cleanup.
      }
    }
  }
}

function createOptions(rootDir, registryPath, projectPath) {
  const serverScript = createFakeServerScript(rootDir);
  const readyFile = path.join(rootDir, `${path.basename(projectPath)}.ready`);

  return {
    registryPath,
    projectPath,
    command: process.execPath,
    buildSpawnArgs: (port) => {
      fs.rmSync(readyFile, { force: true });
      return [serverScript, String(port), readyFile];
    },
    allocatePort: async () => {
      const port = nextFakePort;
      nextFakePort += 1;
      return port;
    },
    waitUntilReady: async () => {
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline) {
        if (fs.existsSync(readyFile)) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      throw new Error(`Timed out waiting for ${readyFile}`);
    },
    maxServices: 5,
    readinessTimeoutMs: 2000
  };
}

test("same-project restart replaces the older managed service", async (t) => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-vitectrl-"));
  const registryPath = path.join(rootDir, "registry.json");
  const projectPath = path.join(rootDir, "project-a");
  fs.mkdirSync(projectPath, { recursive: true });

  t.after(async () => {
    await terminateRecords(registryPath);
  });

  const first = await startManagedPreview(createOptions(rootDir, registryPath, projectPath));
  const second = await startManagedPreview(createOptions(rootDir, registryPath, projectPath));

  assert.notEqual(first.service.pid, second.service.pid);
  assert.equal(isPidAlive(first.service.pid), false);

  const status = await getManagedPreviewStatus({ registryPath });
  assert.equal(status.services.length, 1);
  assert.equal(status.services[0].pid, second.service.pid);
  assert.equal(status.services[0].projectPath, projectPath);
});

test("starting a sixth managed service evicts the oldest one", async (t) => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-vitectrl-"));
  const registryPath = path.join(rootDir, "registry.json");
  const started = [];

  t.after(async () => {
    await terminateRecords(registryPath);
  });

  for (let index = 0; index < 6; index += 1) {
    const projectPath = path.join(rootDir, `project-${index}`);
    fs.mkdirSync(projectPath, { recursive: true });
    const result = await startManagedPreview(createOptions(rootDir, registryPath, projectPath));
    started.push(result.service);
  }

  const status = await getManagedPreviewStatus({ registryPath });
  assert.equal(status.services.length, 5);
  assert.equal(isPidAlive(started[0].pid), false);
  assert.deepEqual(
    status.services.map((service) => service.projectPath).sort(),
    started.slice(1).map((service) => service.projectPath).sort()
  );
});

test("cleanup removes dead processes from the registry", async (t) => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-vitectrl-"));
  const registryPath = path.join(rootDir, "registry.json");
  const projectPath = path.join(rootDir, "project-a");
  fs.mkdirSync(projectPath, { recursive: true });

  t.after(async () => {
    await terminateRecords(registryPath);
  });

  const started = await startManagedPreview(createOptions(rootDir, registryPath, projectPath));
  process.kill(started.service.pid, "SIGKILL");
  await waitForPidExit(started.service.pid);

  const cleaned = await cleanupManagedPreviews({ registryPath, maxServices: 5 });
  assert.equal(cleaned.services.length, 0);

  const status = await getManagedPreviewStatus({ registryPath });
  assert.equal(status.services.length, 0);
});

test("startManagedPreview can persist bypass=false and overwrite stale true", async (t) => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-vitectrl-"));
  const registryPath = path.join(rootDir, "registry.json");
  const projectPath = path.join(rootDir, "project-bypass");
  fs.mkdirSync(projectPath, { recursive: true });
  fs.writeFileSync(
    path.join(projectPath, ".env.local"),
    "VITE_SSO_BYPASS=true\nEXISTING_KEY=1\n",
    "utf8"
  );

  t.after(async () => {
    await terminateRecords(registryPath);
  });

  await startManagedPreview({
    ...createOptions(rootDir, registryPath, projectPath),
    bypassAuth: false
  });

  const envLocal = fs.readFileSync(path.join(projectPath, ".env.local"), "utf8");
  assert.match(envLocal, /VITE_SSO_BYPASS=false/);
  assert.doesNotMatch(envLocal, /VITE_SSO_BYPASS=true/);
  assert.match(envLocal, /EXISTING_KEY=1/);
});

test("buildPreviewGatewayUrl respects configured gateway origin", () => {
  const projectPath = "/tmp/project-cli";
  assert.equal(
    buildPreviewGatewayUrl(projectPath, "http://preview.example.com:7788"),
    "http://preview.example.com:7788/preview/dev/project-cli/"
  );
});
