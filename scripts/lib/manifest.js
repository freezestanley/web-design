const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require("./load-config");

const config = loadConfig();
const DEFAULT_PROXY_ROUTES = [
  {
    prefix: "/openapi",
    upstreamOrigin: "http://4335314-za-aigc-harness-studio.test.za.biz"
  }
];

function getManifestTemplatePath(projectPath) {
  return path.join(projectPath, config.WEBDESIGN_DIR, "manifest.json");
}

function getRootManifestPath(projectPath) {
  return path.join(projectPath, "manifest.json");
}

function replaceManifestPlaceholders(value, projectMeta) {
  if (typeof value === "string") {
    return value
      .replaceAll("<project-uid>", projectMeta.projectUid || "")
      .replaceAll("<project-name>", projectMeta.name || "")
      .replaceAll("<project summary or name>", projectMeta.summary || projectMeta.name || "")
      .replaceAll("<project.json.author or empty>", projectMeta.author || "");
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceManifestPlaceholders(item, projectMeta));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, replaceManifestPlaceholders(child, projectMeta)])
    );
  }

  return value;
}

function validateManifest(manifest) {
  if (!manifest.projectId && !manifest.name) {
    throw new Error("manifest requires projectId or name");
  }

  if (manifest.proxy && !Array.isArray(manifest.proxy.routes)) {
    throw new Error("manifest proxy.routes must be an array");
  }

  for (const route of manifest.proxy?.routes || []) {
    if (!route || typeof route.prefix !== "string" || !route.prefix) {
      throw new Error("manifest proxy route requires prefix");
    }
    // targetKey 与 upstreamOrigin 二选一，均缺才报错，共存则报错
    const hasTargetKey = typeof route.targetKey === "string" && route.targetKey;
    const hasUpstreamOrigin = typeof route.upstreamOrigin === "string" && route.upstreamOrigin;
    if (!hasTargetKey && !hasUpstreamOrigin) {
      throw new Error(`manifest proxy route "${route.prefix}" requires targetKey or upstreamOrigin`);
    }
    if (hasTargetKey && hasUpstreamOrigin) {
      throw new Error(
        `manifest proxy route "${route.prefix}" cannot have both targetKey and upstreamOrigin, choose one`
      );
    }
    // upstreamOrigin 格式校验：必须含协议、不含路径、不带尾斜杠
    if (hasUpstreamOrigin) {
      if (!/^https?:\/\/[^/]+$/.test(route.upstreamOrigin)) {
        throw new Error(
          `manifest proxy route "${route.prefix}" upstreamOrigin must be origin only (e.g. https://example.com), got: ${route.upstreamOrigin}`
        );
      }
    }
  }
}

function mergeDefaultProxyRoutes(manifest) {
  const existingRoutes = Array.isArray(manifest.proxy?.routes) ? manifest.proxy.routes : [];
  const routeMap = new Map();

  for (const route of DEFAULT_PROXY_ROUTES) {
    routeMap.set(route.prefix, route);
  }

  for (const route of existingRoutes) {
    routeMap.set(route.prefix, route);
  }

  return {
    ...manifest,
    proxy: {
      ...(manifest.proxy || {}),
      routes: [...routeMap.values()]
    }
  };
}

/**
 * 对 proxy.routes 按前缀长度倒序排序
 * 确保精确前缀（/user/profile）排在宽泛前缀（/user）之前
 */
function sortRoutesByPrefixLength(manifest) {
  if (!manifest.proxy || !Array.isArray(manifest.proxy.routes)) return manifest;
  return {
    ...manifest,
    proxy: {
      ...manifest.proxy,
      routes: [...manifest.proxy.routes].sort((a, b) => b.prefix.length - a.prefix.length)
    }
  };
}

function renderManifest(projectPath, projectMeta) {
  const templatePath = getManifestTemplatePath(projectPath);
  const rootManifestPath = getRootManifestPath(projectPath);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Missing manifest template: ${templatePath}`);
  }

  const template = JSON.parse(fs.readFileSync(templatePath, "utf8"));
  let manifest = replaceManifestPlaceholders(template, projectMeta);
  manifest = mergeDefaultProxyRoutes(manifest);
  manifest = sortRoutesByPrefixLength(manifest);
  validateManifest(manifest);
  fs.writeFileSync(rootManifestPath, JSON.stringify(manifest, null, 2));

  return {
    manifest,
    manifestPath: rootManifestPath
  };
}

module.exports = {
  getManifestTemplatePath,
  getRootManifestPath,
  mergeDefaultProxyRoutes,
  renderManifest,
  sortRoutesByPrefixLength,
  validateManifest
};
