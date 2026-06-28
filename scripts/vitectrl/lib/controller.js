const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { readRegistry, writeRegistry, DEFAULT_REGISTRY_PATH } = require("./registry");
const { findFreePort, isProcessAlive, terminateProcess, waitForPort } = require("./process");

/**
 * 确保项目 .env.local 包含 VITE_SSO_BYPASS=true
 * 开发预览期间自动关闭 SSO，发布构建读 .env.production，不受影响
 */
function ensureDevEnvLocal(projectPath) {
  const envLocalPath = path.join(projectPath, ".env.local");
  const bypassLine = "VITE_SSO_BYPASS=true";

  let content = "";
  if (fs.existsSync(envLocalPath)) {
    content = fs.readFileSync(envLocalPath, "utf8");
    if (content.includes("VITE_SSO_BYPASS=")) return;
  }

  const separator = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  const proxyHint = [
    "",
    "# 开发期接口代理（格式：VITE_DEV_PROXY_<KEY>=<manifest prefix>|<上游 origin>）",
    "# 示例：VITE_DEV_PROXY_USER=/user|https://user-service.example.com",
  ].join("\n");

  fs.writeFileSync(
    envLocalPath,
    content + separator + bypassLine + "\n" + proxyHint + "\n",
    "utf8"
  );
}

function defaultSpawnArgs(port) {
  return ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"];
}

function sortByStartedAtAscending(services) {
  return [...services].sort((left, right) => {
    return new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime();
  });
}

async function purgeDeadServices(services) {
  return services.filter((service) => isProcessAlive(service.pid));
}

async function removeServices(services, predicate) {
  const removed = [];
  const kept = [];

  for (const service of services) {
    if (!predicate(service)) {
      kept.push(service);
      continue;
    }

    await terminateProcess(service.pid);
    removed.push(service);
  }

  return {
    services: kept,
    removed
  };
}

async function enforceMaxServices(services, maxServices) {
  if (services.length <= maxServices) {
    return {
      services,
      evicted: []
    };
  }

  const sorted = sortByStartedAtAscending(services);
  const excess = sorted.length - maxServices;
  const evicted = sorted.slice(0, excess);
  const evictedPids = new Set(evicted.map((service) => service.pid));

  for (const service of evicted) {
    await terminateProcess(service.pid);
  }

  return {
    services: services.filter((service) => !evictedPids.has(service.pid)),
    evicted
  };
}

async function loadLiveRegistry(registryPath = DEFAULT_REGISTRY_PATH) {
  const registry = readRegistry(registryPath);
  const liveServices = await purgeDeadServices(registry.services);
  writeRegistry({ services: liveServices }, registryPath);
  return {
    registryPath,
    services: liveServices
  };
}

async function getManagedPreviewStatus({ registryPath = DEFAULT_REGISTRY_PATH } = {}) {
  return loadLiveRegistry(registryPath);
}

async function cleanupManagedPreviews({
  registryPath = DEFAULT_REGISTRY_PATH,
  maxServices = 5
} = {}) {
  const current = await loadLiveRegistry(registryPath);
  const limited = await enforceMaxServices(current.services, maxServices);
  writeRegistry({ services: limited.services }, registryPath);

  return {
    registryPath,
    services: limited.services,
    evicted: limited.evicted
  };
}

async function startManagedPreview({
  registryPath = DEFAULT_REGISTRY_PATH,
  projectPath,
  command = "npm",
  buildSpawnArgs = defaultSpawnArgs,
  allocatePort = () => findFreePort("127.0.0.1"),
  waitUntilReady = ({ port, readinessTimeoutMs }) =>
    waitForPort("127.0.0.1", port, { timeoutMs: readinessTimeoutMs }),
  maxServices = 5,
  readinessTimeoutMs = 10000
}) {
  if (!projectPath) {
    throw new Error("projectPath is required");
  }

  const resolvedProjectPath = path.resolve(projectPath);
  ensureDevEnvLocal(resolvedProjectPath);
  let current = await loadLiveRegistry(registryPath);

  const replaced = await removeServices(
    current.services,
    (service) => path.resolve(service.projectPath) === resolvedProjectPath
  );
  current = {
    registryPath,
    services: replaced.services
  };

  const port = await allocatePort();
  const args = buildSpawnArgs(port);
  const child = spawn(command, args, {
    cwd: resolvedProjectPath,
    detached: true,
    stdio: "ignore"
  });
  child.unref();

  if (!child.pid) {
    throw new Error(`Failed to start dev preview for ${resolvedProjectPath}`);
  }

  try {
    await waitUntilReady({
      port,
      projectPath: resolvedProjectPath,
      pid: child.pid,
      readinessTimeoutMs
    });
  } catch (error) {
    await terminateProcess(child.pid);
    throw new Error(`Dev preview failed to become ready: ${error.message}`);
  }

  const service = {
    pid: child.pid,
    port,
    url: `http://127.0.0.1:${port}`,
    projectPath: resolvedProjectPath,
    command: [command, ...args].join(" "),
    startedAt: new Date().toISOString()
  };

  const limited = await enforceMaxServices([...current.services, service], maxServices);
  writeRegistry({ services: limited.services }, registryPath);

  return {
    registryPath,
    service,
    replaced: replaced.removed,
    evicted: limited.evicted,
    services: limited.services
  };
}

module.exports = {
  cleanupManagedPreviews,
  getManagedPreviewStatus,
  startManagedPreview
};
