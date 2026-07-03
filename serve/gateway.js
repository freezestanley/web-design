const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const { buildPlugin, needsBuild } = require("./plugins/web-design-control-plugin/scripts/build-plugin");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

const ROOT_DIR = __dirname;
const PLUGIN_DIR = path.join(ROOT_DIR, "plugins", "web-design-control-plugin");
const RUNTIME_ASSETS = {
  "/__runtime/plugin-bridge.js": path.join(PLUGIN_DIR, "runtime", "plugin-bridge.js")
};

function discoverApps({ projectsDir }) {
  if (!projectsDir || !fs.existsSync(projectsDir)) {
    return [];
  }

  return fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const rootDir = path.join(projectsDir, entry.name);
      const metaFile = path.join(rootDir, "_meta.json");
      const indexFile = path.join(rootDir, "index.html");

      if (!fs.existsSync(metaFile) || !fs.existsSync(indexFile)) {
        return null;
      }

      const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
      const appId = meta.appNo || meta.appId || entry.name;
      const proxyRoutes = Array.isArray(meta.manifest?.proxy?.routes)
        ? [...meta.manifest.proxy.routes]
            .filter((route) => route && route.prefix && route.upstreamOrigin)
            .sort((left, right) => right.prefix.length - left.prefix.length)
        : [];

      return {
        appId,
        appName: meta.appName || appId,
        rootDir,
        indexFile,
        proxyRoutes
      };
    })
    .filter(Boolean);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function sendText(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "content-type": contentType,
    "content-length": Buffer.byteLength(body)
  });
  response.end(body);
}

function sendJson(response, statusCode, payload) {
  sendText(response, statusCode, JSON.stringify(payload), "application/json; charset=utf-8");
}

function sendFile(response, filePath) {
  response.writeHead(200, {
    "content-type": getContentType(filePath)
  });
  fs.createReadStream(filePath).pipe(response);
}

function safeJoin(rootDir, relativePath) {
  const targetPath = path.resolve(rootDir, `.${relativePath}`);
  if (!targetPath.startsWith(path.resolve(rootDir))) {
    return null;
  }
  return targetPath;
}

function shouldServeSpaFallback(relativePath) {
  return !path.posix.extname(relativePath);
}

function buildRuntimeConfig(options) {
  return {
    title: options.menu?.title || "Shared Control",
    mode: "header",
    mountTargetId: "__webdesign_shell_plugin",
    labels: {
      selectA: options.menu?.selectA?.label || "Select A",
      selectB: options.menu?.selectB?.label || "Select B",
      submit: options.menu?.submitLabel || "Submit"
    },
    endpoints: {
      selectAOptions: "/__plugin/options/select-a",
      selectBOptions: "/__plugin/options/select-b",
      submit: "/__plugin/submit"
    }
  };
}

function renderShellPage(runtimeConfig, app) {
  const configScript = `<script>window.__WEB_DESIGN_GATEWAY__=${JSON.stringify({
    appId: app.appId,
    runtimeConfig
  })};</script>`;
  return [
    "<!doctype html>",
    '<html lang="zh-CN">',
    "  <head>",
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `    <title>${app.appName}</title>`,
    "    <style>",
    "      html, body { margin: 0; height: 100%; }",
    "      body { font-family: ui-sans-serif, system-ui, sans-serif; background: #e2e8f0; }",
    "      .wd-shell { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100vh; }",
    "      .wd-shell__header { padding: 16px; background: linear-gradient(180deg, #0f172a, #1e293b); }",
    "      .wd-shell__content { min-height: 0; }",
    "      .wd-shell__frame { width: 100%; height: 100%; border: 0; background: #fff; display: block; }",
    "    </style>",
    `    ${configScript}`,
    '    <link rel="stylesheet" href="/__plugin-dist/plugin.css" />',
    "  </head>",
    "  <body>",
    '    <main class="wd-shell">',
    '      <header class="wd-shell__header">',
    '        <div id="__webdesign_shell_plugin"></div>',
    "      </header>",
    '      <section class="wd-shell__content">',
    `        <iframe class="wd-shell__frame" src="/apps/${app.appId}/content/" title="${app.appName}"></iframe>`,
    "      </section>",
    "    </main>",
    '    <script defer src="/__plugin-dist/plugin.js"></script>',
    '    <script defer src="/__runtime/plugin-bridge.js"></script>',
    "  </body>",
    "</html>"
  ].join("\n");
}

function rewriteContentHtml(html, appId) {
  const sourcePrefix = `/apps/${appId}/`;
  const targetPrefix = `/apps/${appId}/content/`;
  return html.split(sourcePrefix).join(targetPrefix);
}

function findAppRoute(appMap, pathname) {
  const contentMatch = pathname.match(/^\/apps\/([^/]+)\/content(\/.*)?$/);
  if (contentMatch) {
    return {
      mode: "content",
      app: appMap.get(contentMatch[1]) || null,
      appId: contentMatch[1],
      relativePath: contentMatch[2] || "/"
    };
  }

  const shellMatch = pathname.match(/^\/apps\/([^/]+)\/?$/);
  if (shellMatch) {
    return {
      mode: "shell",
      app: appMap.get(shellMatch[1]) || null,
      appId: shellMatch[1],
      relativePath: "/"
    };
  }

  const match = pathname.match(/^\/apps\/([^/]+)(\/.*)?$/);
  if (!match) {
    return null;
  }

  return {
    mode: "unknown",
    app: appMap.get(match[1]) || null,
    appId: match[1],
    relativePath: match[2] || "/"
  };
}

function findProxyRoute(app, relativePath) {
  return app.proxyRoutes.find((route) => relativePath === route.prefix || relativePath.startsWith(`${route.prefix}/`));
}

async function proxyToUpstream({ request, response, upstreamOrigin, targetPath }) {
  const body = await readBody(request);
  const upstreamUrl = new URL(targetPath, upstreamOrigin);
  const headers = { ...request.headers };
  delete headers.host;
  if (!body.length) {
    delete headers["content-length"];
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: body.length ? body : undefined
  });

  const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
  const responseHeaders = {};
  upstreamResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "content-length" && key.toLowerCase() !== "transfer-encoding") {
      responseHeaders[key] = value;
    }
  });
  responseHeaders["content-length"] = responseBody.length;

  response.writeHead(upstreamResponse.status, responseHeaders);
  response.end(responseBody);
}

function getControlTarget(controlProxy, pathname) {
  if (pathname === "/__plugin/options/select-a" || pathname === "/__control/options/select-a") {
    return controlProxy?.selectAOptions || null;
  }
  if (pathname === "/__plugin/options/select-b" || pathname === "/__control/options/select-b") {
    return controlProxy?.selectBOptions || null;
  }
  if (pathname === "/__plugin/submit" || pathname === "/__control/submit") {
    return controlProxy?.submit || null;
  }
  return null;
}

function buildMockPayload(options, pathname, requestPayload) {
  const pluginMock = options.pluginMock || {};

  if (pathname === "/__plugin/options/select-a" || pathname === "/__control/options/select-a") {
    return pluginMock.selectAOptions || [
      { label: "Mock Test", value: "mock-test" },
      { label: "Mock Prod", value: "mock-prod" }
    ];
  }

  if (pathname === "/__plugin/options/select-b" || pathname === "/__control/options/select-b") {
    return pluginMock.selectBOptions || [
      { label: "Mock CN", value: "mock-cn" },
      { label: "Mock US", value: "mock-us" }
    ];
  }

  if (pathname === "/__plugin/submit" || pathname === "/__control/submit") {
    return {
      accepted: true,
      mock: true,
      ...(pluginMock.submitResponse || {}),
      received: requestPayload
    };
  }

  return null;
}

async function parseJsonBody(request) {
  const raw = (await readBody(request)).toString("utf8");
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function ensurePluginBuilt() {
  if (needsBuild(PLUGIN_DIR)) {
    buildPlugin({ rootDir: PLUGIN_DIR });
  }
}

function createHandler(options) {
  const runtimeConfig = buildRuntimeConfig(options);
  const apps = discoverApps({ projectsDir: options.projectsDir });
  const appMap = new Map(apps.map((app) => [app.appId, app]));

  return async function handler(request, response) {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);

    try {
      if (requestUrl.pathname === "/apps") {
        return sendJson(
          response,
          200,
          apps.map((app) => ({
            appId: app.appId,
            appName: app.appName
          }))
        );
      }

      if (RUNTIME_ASSETS[requestUrl.pathname]) {
        return sendFile(response, RUNTIME_ASSETS[requestUrl.pathname]);
      }

      if (requestUrl.pathname.startsWith("/__plugin-dist/")) {
        ensurePluginBuilt();
        const distFile = path.join(PLUGIN_DIR, "dist", requestUrl.pathname.replace("/__plugin-dist/", ""));
        if (fs.existsSync(distFile)) {
          return sendFile(response, distFile);
        }
        return sendJson(response, 404, { error: "dist_asset_not_found" });
      }

      if (requestUrl.pathname.startsWith("/__plugin/") || requestUrl.pathname.startsWith("/__control/")) {
        const controlTarget = getControlTarget(options.controlProxy, requestUrl.pathname);
        const isSubmitRoute = requestUrl.pathname === "/__plugin/submit" || requestUrl.pathname === "/__control/submit";
        if (!controlTarget && buildMockPayload(options, requestUrl.pathname, null) === null) {
          return sendJson(response, 404, {
            error: "unsupported_plugin_route",
            pathname: requestUrl.pathname
          });
        }
        if (!isSubmitRoute && request.method !== "GET") {
          return sendJson(response, 405, { error: "method_not_allowed" });
        }
        if (isSubmitRoute && request.method !== "POST") {
          return sendJson(response, 405, { error: "method_not_allowed" });
        }
        if (!controlTarget?.upstreamOrigin) {
          const requestPayload = isSubmitRoute ? await parseJsonBody(request) : null;
          if (isSubmitRoute && requestPayload === null) {
            return sendJson(response, 400, { error: "invalid_json" });
          }
          return sendJson(response, 200, buildMockPayload(options, requestUrl.pathname, requestPayload));
        }

        return proxyToUpstream({
          request,
          response,
          upstreamOrigin: controlTarget.upstreamOrigin,
          targetPath: `${controlTarget.path || "/"}${requestUrl.search}`
        });
      }

      const appMatch = findAppRoute(appMap, requestUrl.pathname);
      if (!appMatch) {
        return sendJson(response, 404, { error: "not_found" });
      }
      if (!appMatch.app) {
        return sendJson(response, 404, { error: "app_not_found", appId: appMatch.appId });
      }
      if (appMatch.mode === "unknown") {
        return sendJson(response, 404, { error: "route_not_supported" });
      }

      const app = appMatch.app;
      if (appMatch.mode === "shell") {
        return sendText(response, 200, renderShellPage(runtimeConfig, app), "text/html; charset=utf-8");
      }

      const proxyRoute = findProxyRoute(app, appMatch.relativePath);
      if (proxyRoute) {
        return proxyToUpstream({
          request,
          response,
          upstreamOrigin: proxyRoute.upstreamOrigin,
          targetPath: `${appMatch.relativePath}${requestUrl.search}`
        });
      }

      const targetFile = safeJoin(app.rootDir, appMatch.relativePath);
      if (targetFile && fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
        return sendFile(response, targetFile);
      }

      if (appMatch.relativePath === "/" || shouldServeSpaFallback(appMatch.relativePath)) {
        ensurePluginBuilt();
        const html = fs.readFileSync(app.indexFile, "utf8");
        return sendText(response, 200, rewriteContentHtml(html, app.appId), "text/html; charset=utf-8");
      }

      return sendJson(response, 404, { error: "asset_not_found" });
    } catch (error) {
      return sendJson(response, 500, {
        error: "gateway_error",
        message: error.message
      });
    }
  };
}

async function startGateway(options) {
  ensurePluginBuilt();
  const server = http.createServer(createHandler(options));
  await new Promise((resolve) => server.listen(options.port || 0, options.host || "127.0.0.1", resolve));
  const address = server.address();
  return {
    host: address.address,
    port: address.port,
    url: `http://${address.address}:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

module.exports = {
  discoverApps,
  startGateway
};
