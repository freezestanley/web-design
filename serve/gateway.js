const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const { isProcessAlive } = require("../scripts/vitectrl/lib/process");

const { buildPlugin, needsBuild } = require("./plugins/web-design-control-plugin/scripts/build-plugin");
const { createLogger } = require("./logger");

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
const DEFAULT_PREVIEW_AUTH = {
  enabled: false,
  cookieName: "ATLANTIS_SESSION_ID",
  clientSessionCookieName: "session_id",
  clientUnsafeSessionCookieName: "unsafeSessionId",
  defaultServiceName: "za-open-bot",
  ssoHost: "",
  useMockSso: false,
  apigAppCode: "",
  devPreviewRegistryPath: path.resolve(ROOT_DIR, "..", "scripts", "vitectrl", "registry.json")
};
const MOCK_TICKETS = {
  "ticket-za-zhangchong": "session-za-zhangchong",
  "ticket-za-lisi": "session-za-lisi"
};

function normalizePreviewAuth(options) {
  return {
    ...DEFAULT_PREVIEW_AUTH,
    ...(options.previewAuth || {})
  };
}

function discoverApps({ projectsDir }) {
  if (!projectsDir || !fs.existsSync(projectsDir)) {
    return [];
  }

  return fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const appDir = path.join(projectsDir, entry.name);
      const currentLink = path.join(appDir, "current");
      const metaFile = path.join(currentLink, "_meta.json");
      const indexFile = path.join(currentLink, "index.html");

      // 跳过无 current/ 的目录（旧结构或非 app 目录）
      let currentStat;
      try {
        currentStat = fs.lstatSync(currentLink);
      } catch {
        return null;
      }
      if (!currentStat.isSymbolicLink() && !currentStat.isDirectory()) {
        return null;
      }

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

      // rootDir 指向 current（软链接），fs 自动跟随解析实际版本目录
      const rootDir = currentLink;

      return {
        appId,
        appName: meta.appName || appId,
        rootDir,
        indexFile,
        proxyRoutes,
        projectNo: meta.manifest?.projectId || meta.projectNo || "",
        manifest: meta.manifest || {}
      };
    })
    .filter(Boolean);
}

function buildAppAccessList(baseUrl, apps = []) {
  if (!baseUrl) {
    return [];
  }

  return apps.map((app) => ({
    appId: app.appId,
    appName: app.appName,
    url: `${baseUrl}/apps/${encodeURIComponent(app.appId)}/`
  }));
}

function readProjectsSignature(projectsDir) {
  if (!projectsDir || !fs.existsSync(projectsDir)) {
    return "missing";
  }

  const entries = fs
    .readdirSync(projectsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const currentLink = path.join(projectsDir, entry.name, "current");
      try {
        // 读软链接本身的 mtime（lstatSync 不跟随软链接）
        // 软链接每次被 renameSync 替换时 mtime 更新，触发 discoverApps 刷新
        const linkStat = fs.lstatSync(currentLink);
        return `${entry.name}:${linkStat.mtimeMs}`;
      } catch {
        // 无 current 的目录（旧结构）：用目录本身 mtime
        return `${entry.name}:${fs.statSync(path.join(projectsDir, entry.name)).mtimeMs}`;
      }
    })
    .sort();

  // 签名包含目录名集合本身：新子目录出现时名称列表必然变化，
  // 不再依赖根目录 mtime（macOS 秒级精度会导致同秒创建不触发刷新）
  return entries.join("|");
}

function createAppRegistry(projectsDir, logger, resolveGatewayUrl) {
  let signature = null;
  let snapshot = {
    apps: [],
    appMap: new Map()
  };

  return {
    getSnapshot() {
      const nextSignature = readProjectsSignature(projectsDir);
      if (nextSignature === signature) {
        return snapshot;
      }

      try {
        const apps = discoverApps({ projectsDir });
        snapshot = {
          apps,
          appMap: new Map(apps.map((app) => [app.appId, app]))
        };
        signature = nextSignature;
        const baseUrl = typeof resolveGatewayUrl === "function" ? resolveGatewayUrl() : "";
        logger.info("registry.refreshed", {
          projectsDir,
          appCount: apps.length,
          apps: buildAppAccessList(baseUrl, apps)
        });
      } catch {
        if (signature === null) {
          snapshot = {
            apps: [],
            appMap: new Map()
          };
          signature = nextSignature;
        }
      }

      return snapshot;
    }
  };
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

function sendText(response, statusCode, body, contentType = "text/plain; charset=utf-8", extraHeaders = {}) {
  response.writeHead(statusCode, {
    "content-type": contentType,
    "content-length": Buffer.byteLength(body),
    ...extraHeaders
  });
  response.end(body);
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  sendText(response, statusCode, JSON.stringify(payload), "application/json; charset=utf-8", extraHeaders);
}

function sendFile(response, filePath, extraHeaders = {}) {
  response.writeHead(200, {
    "content-type": getContentType(filePath),
    ...extraHeaders
  });
  fs.createReadStream(filePath).pipe(response);
}

function sendRedirect(response, location, extraHeaders = {}) {
  response.writeHead(302, {
    location,
    ...extraHeaders
  });
  response.end();
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

function parseCookieHeader(cookieHeader = "") {
  return String(cookieHeader || "")
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce((accumulator, entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex === -1) {
        return accumulator;
      }
      accumulator[entry.slice(0, separatorIndex).trim()] = entry.slice(separatorIndex + 1).trim();
      return accumulator;
    }, {});
}

function hasPercentEncodedOctets(value = "") {
  return /%[0-9A-Fa-f]{2}/.test(String(value || ""));
}

function normalizeSessionValue(rawValue = "") {
  let normalized = String(rawValue || "").trim();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!hasPercentEncodedOctets(normalized)) {
      break;
    }

    try {
      const decoded = decodeURIComponent(normalized);
      if (decoded === normalized) {
        break;
      }
      if (!hasPercentEncodedOctets(decoded)) {
        break;
      }
      normalized = decoded;
    } catch {
      break;
    }
  }

  return normalized;
}

function buildUserinfoSessionValue(sessionToken = "") {
  const normalized = normalizeSessionValue(sessionToken);
  if (!normalized) {
    return "";
  }
  return hasPercentEncodedOctets(normalized) ? normalized : encodeURIComponent(normalized);
}

function normalizeTokenValue(rawValue = "") {
  if (!rawValue) {
    return "";
  }

  let normalized = String(rawValue).trim();
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    normalized = String(rawValue).trim();
  }
  return normalized.replace(/ /g, "+");
}

function getRequestContext(requestUrl) {
  return {
    token: requestUrl.searchParams.get("token") || "",
    ticket: requestUrl.searchParams.get("ticket") || "",
    serviceName: requestUrl.searchParams.get("serviceName") || requestUrl.searchParams.get("servicename") || ""
  };
}

function buildTokenForwardPath(requestUrl, sessionToken) {
  const nextUrl = new URL(requestUrl.toString());
  nextUrl.searchParams.delete("ticket");
  nextUrl.searchParams.set("token", sessionToken);
  return `${nextUrl.pathname}${nextUrl.search}`;
}

/**
 * 从请求头推断 serve 自身的 origin（含协议），用于注入 __PREVIEW_SSO_HOST__。
 *
 * 优先级：
 *   1. X-Forwarded-Proto + Host（反向代理/生产环境）
 *   2. X-Forwarded-Host（CDN 场景）
 *   3. Host 直接判断（本地 127/localhost → http，其余 → https）
 *
 * 这样本地是 http://127.0.0.1:4173，生产是 https://your-domain.com，
 * 不需要任何硬编码。
 */
function resolveServeOrigin(request) {
  const host = request.headers["x-forwarded-host"] || request.headers.host || "127.0.0.1";
  const proto = request.headers["x-forwarded-proto"] ||
    (/^(127\.|localhost)/.test(host.split(":")[0]) ? "http" : "https");
  return `${proto}://${host}`;
}

function sanitizeCurrentPath(requestUrl) {
  const nextUrl = new URL(requestUrl.toString());
  nextUrl.searchParams.delete("ticket");
  nextUrl.searchParams.delete("token");
  nextUrl.searchParams.delete("locale");
  return `${nextUrl.pathname}${nextUrl.search}`;
}

function resolveSsoHost(previewAuth, request) {
  if (previewAuth.ssoHost) {
    return previewAuth.ssoHost;
  }

  const hostname = String(request.headers.host || "").split(":")[0];

  // 本地开发
  if (!hostname || hostname === "127.0.0.1" || hostname === "localhost" || hostname === "0.0.0.0") {
    return "https://nsso-test.zhonganinfo.com";
  }

  // 生产环境：prd 域名 或 aigc.zhonganonline.com
  if (
    hostname.includes(".prd.") ||
    hostname === "aigc.zhonganonline.com" ||
    hostname === "ai.zhonganonline.com"
  ) {
    return "https://nsso.zhonganinfo.com";
  }

  // test / pre / sit / uat 等非生产环境
  return "https://nsso-test.zhonganinfo.com";
}

function buildSsoLoginUrl(previewAuth, request, requestUrl) {
  const serviceName = getRequestContext(requestUrl).serviceName || previewAuth.defaultServiceName;
  const target = encodeURIComponent(`${requestUrl.origin}${sanitizeCurrentPath(requestUrl)}`);
  return `${resolveSsoHost(previewAuth, request)}/login?service=${serviceName}&target=${target}`;
}

async function exchangeTicketForSession(previewAuth, request, requestUrl) {
  const ticket = normalizeTokenValue(getRequestContext(requestUrl).ticket);
  if (!ticket) {
    return "";
  }

  if (previewAuth.useMockSso) {
    return MOCK_TICKETS[ticket] || "";
  }

  const serviceName = getRequestContext(requestUrl).serviceName || previewAuth.defaultServiceName;
  const ssoHost = resolveSsoHost(previewAuth, request);
  const upstreamUrl = `${ssoHost}/validate2?service=${encodeURIComponent(serviceName)}&ticket=${encodeURIComponent(ticket)}`;
  const validate2Headers = {
    Accept: "application/json",
    "X-Service-Name": serviceName,
    "X-Platform-Type": "web",
    "X-Requested-With": "XMLHttpRequest"
  };
  if (previewAuth.apigAppCode) {
    validate2Headers["X-Apig-AppCode"] = previewAuth.apigAppCode;
  }
  const upstreamResponse = await fetch(upstreamUrl, { headers: validate2Headers });
  if (!upstreamResponse.ok) {
    return "";
  }

  const payload = await upstreamResponse.json();
  // 直接返回原始 result（保留 %2B 等编码），供 userinfo 原样透传
  return payload?.success && payload?.result ? String(payload.result) : "";
}

async function resolvePreviewSession(previewAuth, request, requestUrl) {
  const cookies = parseCookieHeader(request.headers.cookie || "");
  const requestContext = getRequestContext(requestUrl);
  const cookieSession =
    cookies[previewAuth.cookieName] ||
    cookies[previewAuth.clientSessionCookieName] ||
    cookies[previewAuth.clientUnsafeSessionCookieName] ||
    "";
  if (cookieSession) {
    return {
      sessionToken: normalizeSessionValue(cookieSession),
      shouldSetCookies: false,
      shouldRedirectToCleanUrl: false,
      redirectLocation: "",
      authSource: "cookie"
    };
  }

  const headerSession = normalizeSessionValue(request.headers["x-usercenter-session"] || "");
  if (headerSession) {
    return {
      sessionToken: headerSession,
      shouldSetCookies: false,
      shouldRedirectToCleanUrl: false,
      redirectLocation: "",
      authSource: "header"
    };
  }

  if (requestContext.token) {
    return {
      sessionToken: normalizeSessionValue(requestContext.token),
      shouldSetCookies: true,
      shouldRedirectToCleanUrl: false,
      redirectLocation: "",
      authSource: "token"
    };
  }

  if (requestContext.ticket) {
    const sessionToken = await exchangeTicketForSession(previewAuth, request, requestUrl);
    return {
      sessionToken,
      shouldSetCookies: Boolean(sessionToken),
      shouldRedirectToCleanUrl: Boolean(sessionToken),
      redirectLocation: sessionToken ? buildTokenForwardPath(requestUrl, sessionToken) : "",
      authSource: "ticket"
    };
  }

  return {
    sessionToken: "",
    shouldSetCookies: false,
    shouldRedirectToCleanUrl: false,
    redirectLocation: "",
    authSource: "none"
  };
}

function buildPreviewSessionCookies(previewAuth, sessionToken) {
  if (!sessionToken) {
    return [];
  }

  return [
    `${previewAuth.cookieName}=${encodeURIComponent(sessionToken)}; Path=/; HttpOnly; SameSite=Lax`,
    `${previewAuth.clientSessionCookieName}=${encodeURIComponent(sessionToken)}; Path=/; SameSite=Lax`,
    `${previewAuth.clientUnsafeSessionCookieName}=${encodeURIComponent(sessionToken)}; Path=/; SameSite=Lax`
  ];
}

function buildPreviewSessionHeaders(previewAuth, sessionToken) {
  const cookies = buildPreviewSessionCookies(previewAuth, sessionToken);
  return cookies.length ? { "set-cookie": cookies } : {};
}

function buildPreviewSessionClearCookies(previewAuth) {
  return [
    `${previewAuth.cookieName}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`,
    `${previewAuth.clientSessionCookieName}=; Path=/; Max-Age=0; SameSite=Lax`,
    `${previewAuth.clientUnsafeSessionCookieName}=; Path=/; Max-Age=0; SameSite=Lax`
  ];
}

function buildPreviewSessionClearHeaders(previewAuth) {
  return { "set-cookie": buildPreviewSessionClearCookies(previewAuth) };
}

async function validatePreviewSession(previewAuth, request, sessionToken) {
  if (!previewAuth.enabled || !sessionToken || previewAuth.useMockSso) {
    return true;
  }

  const serviceName = previewAuth.defaultServiceName;
  const userinfoSession = buildUserinfoSessionValue(sessionToken);
  const ssoHost = resolveSsoHost(previewAuth, request);
  const userinfoUrl = `${ssoHost}/userinfo?service=${encodeURIComponent(serviceName)}&encryptedSession=${userinfoSession}`;

  try {
    const userinfoHeaders = {
      Accept: "application/json",
      "X-Service-Name": serviceName,
      "X-Usercenter-Session": userinfoSession,
      "X-Platform-Type": "web",
      "X-Requested-With": "XMLHttpRequest"
    };
    if (previewAuth.apigAppCode) {
      userinfoHeaders["X-Apig-AppCode"] = previewAuth.apigAppCode;
    }
    const response = await fetch(userinfoUrl, { headers: userinfoHeaders });

    if (!response.ok) {
      return false;
    }

    const payload = await response.json();
    return payload?.success === true;
  } catch {
    return false;
  }
}

function buildPreviewBootstrapScript(app, sessionToken) {
  if (!sessionToken) {
    return "";
  }

  return [
    "<script>",
    "(function(){",
    `var token=${JSON.stringify(sessionToken)};`,
    `var projectNo=${JSON.stringify(app.projectNo || app.appId)};`,
    "try { localStorage.setItem('session_id', token); } catch (error) {}",
    "document.cookie='session_id=' + encodeURIComponent(token) + '; path=/; SameSite=Lax';",
    "document.cookie='unsafeSessionId=' + encodeURIComponent(token) + '; path=/; SameSite=Lax';",
    "window.__PROJECT_NO__ = projectNo;",
    "})();",
    "</script>"
  ].join("");
}

function buildContentBaseInjection(appId, ssoHost) {
  const basename = `/apps/${appId}/content/`;
  const normalizedSsoHost = String(ssoHost || "");
  return [
    `<base href="${basename}">`,
    "<script>",
    `window.__BASENAME__=${JSON.stringify(basename)};`,
    `window.__PREVIEW_SSO_HOST__=${JSON.stringify(normalizedSsoHost)};`,
    "(function(){",
    "var previewSsoHost = window.__PREVIEW_SSO_HOST__ || '';",
    "if (!previewSsoHost) return;",
    "var ssoHostPattern = /^https:\\/\\/(nsso(?:-test)?\\.zhonganinfo\\.com|nsso\\.zhongan\\.io)(?=\\/|$)/i;",
    "function rewriteUrl(input) {",
    "  if (typeof input !== 'string') return input;",
    "  var m = ssoHostPattern.exec(input);",
    "  if (!m) return input;",
    "  var rewritten = input.replace(ssoHostPattern, previewSsoHost);",
    "  // 把原始 SSO host 附在 _sso 参数里，供 gateway 代理时还原目标",
    "  var sep = rewritten.indexOf('?') >= 0 ? '&' : '?';",
    "  return rewritten + sep + '_sso=' + encodeURIComponent(m[0]);",
    "}",
    "var originalFetch = window.fetch;",
    "if (typeof originalFetch === 'function') {",
    "  window.fetch = function(input, init) {",
    "    if (typeof input === 'string') return originalFetch.call(this, rewriteUrl(input), init);",
    "    if (input && typeof input.url === 'string') return originalFetch.call(this, new Request(rewriteUrl(input.url), input), init);",
    "    return originalFetch.call(this, input, init);",
    "  };",
    "}",
    "var xhrProto = window.XMLHttpRequest && window.XMLHttpRequest.prototype;",
    "if (xhrProto && typeof xhrProto.open === 'function') {",
    "  var originalOpen = xhrProto.open;",
    "  xhrProto.open = function(method, url) {",
    "    var args = Array.prototype.slice.call(arguments);",
    "    args[1] = rewriteUrl(url);",
    "    return originalOpen.apply(this, args);",
    "  };",
    "}",
    "})();",
    "</script>"
  ].join("\n  ");
}

function injectPreviewBootstrap(html, app, sessionToken) {
  const bootstrap = buildPreviewBootstrapScript(app, sessionToken);
  if (!bootstrap) {
    return html;
  }

  if (html.includes("</head>")) {
    return html.replace("</head>", `  ${bootstrap}\n  </head>`);
  }
  return `${bootstrap}${html}`;
}

function findDevPreviewRoute(pathname) {
  const match = pathname.match(/^\/preview\/dev\/([^/]+)(\/.*)?$/);
  if (!match) {
    return null;
  }
  return {
    projectName: match[1],
    relativePath: match[2] || "/"
  };
}

function readManagedPreviewService(registryPath, projectName) {
  if (!registryPath || !fs.existsSync(registryPath)) {
    return null;
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const services = Array.isArray(registry.services) ? registry.services : [];
  return (
    services.find(
      (service) => path.basename(service.projectPath || "") === projectName && isProcessAlive(service.pid)
    ) || null
  );
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

function buildShellContentSrc(appId, requestUrl, sessionToken) {
  const searchParams = new URLSearchParams(requestUrl.searchParams);
  searchParams.delete("ticket");
  if (!sessionToken) {
    searchParams.delete("token");
  }

  const search = searchParams.toString();
  return `/apps/${appId}/content/${search ? `?${search}` : ""}`;
}

function renderShellPage(runtimeConfig, app, sessionToken, requestUrl) {
  const iframeSrc = buildShellContentSrc(app.appId, requestUrl, sessionToken);
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
    "      .wd-shell__header { padding: 16px; background: #efefef; border-bottom: 1px solid #e0e0e0; }",
    "      .wd-shell__content { min-height: 0; }",
    "      .wd-shell__frame { width: 100%; height: 100%; border: 0; background: #fff; display: block; }",
    "    </style>",
    `    ${configScript}`,
    `    ${buildPreviewBootstrapScript(app, sessionToken)}`,
    '    <link rel="stylesheet" href="/__plugin-dist/plugin.css" />',
    "  </head>",
    "  <body>",
    '    <main class="wd-shell">',
    '      <header class="wd-shell__header">',
    '        <div id="__webdesign_shell_plugin"></div>',
    "      </header>",
    '      <section class="wd-shell__content">',
    `        <iframe class="wd-shell__frame" src="${iframeSrc}" title="${app.appName}"></iframe>`,
    "      </section>",
    "    </main>",
    '    <script defer src="/__plugin-dist/plugin.js"></script>',
    '    <script defer src="/__runtime/plugin-bridge.js"></script>',
    "  </body>",
    "</html>"
  ].join("\n");
}

function rewriteContentHtml(html, app, sessionToken, ssoHost) {
  const appId = app.appId;
  const sourcePrefix = `/apps/${appId}/`;
  const targetPrefix = `/apps/${appId}/content/`;
  const assetPrefix = `${targetPrefix}assets/`;
  const rewrittenHtml = html
    .split(sourcePrefix)
    .join(targetPrefix)
    .replace(/(["'(])\/assets\//g, `$1${assetPrefix}`);
  const contentBaseInjection = buildContentBaseInjection(appId, ssoHost);
  const htmlWithBase = rewrittenHtml.includes("</head>")
    ? rewrittenHtml.replace("</head>", `  ${contentBaseInjection}\n  </head>`)
    : `${contentBaseInjection}\n${rewrittenHtml}`;
  return injectPreviewBootstrap(htmlWithBase, app, sessionToken);
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

function normalizeProxyRelativePath(relativePath) {
  if (relativePath === "/api") {
    return "/";
  }
  if (relativePath.startsWith("/api/")) {
    return relativePath.slice(4) || "/";
  }
  return relativePath;
}

function resolveProxyMatch(app, relativePath) {
  const normalizedRelativePath = normalizeProxyRelativePath(relativePath);
  const route = app.proxyRoutes.find(
    (candidate) =>
      normalizedRelativePath === candidate.prefix || normalizedRelativePath.startsWith(`${candidate.prefix}/`)
  );

  if (!route) {
    return null;
  }

  return {
    route,
    targetPath: `${normalizedRelativePath}${normalizedRelativePath === "/" ? "" : ""}`
  };
}

async function proxyToUpstream({
  request,
  response,
  upstreamOrigin,
  targetPath,
  sessionToken,
  serviceName,
  logger,
  requestId,
  pathName,
  rawBody
}) {
  const startedAt = Date.now();
  const body = rawBody !== undefined ? rawBody : await readBody(request);
  const upstreamUrl = new URL(targetPath, upstreamOrigin);
  const headers = { ...request.headers };
  delete headers.host;
  if (!body.length) {
    delete headers["content-length"];
  }
  if (rawBody !== undefined) {
    headers["content-length"] = String(rawBody.length);
  }
  if (sessionToken && !headers["x-usercenter-session"]) {
    headers["x-usercenter-session"] = sessionToken;
  }
  if (serviceName && !headers["x-service-name"]) {
    headers["x-service-name"] = serviceName;
  }

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: body.length ? body : undefined
    });
  } catch (error) {
    logger.error("proxy.failed", {
      requestId,
      method: request.method,
      path: pathName,
      upstreamOrigin,
      targetPath,
      durationMs: Date.now() - startedAt,
      error
    });
    throw error;
  }

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
  logger.info("proxy.completed", {
    requestId,
    method: request.method,
    path: pathName,
    upstreamOrigin,
    targetPath,
    statusCode: upstreamResponse.status,
    durationMs: Date.now() - startedAt
  });
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

function getShareRouteType(pathname) {
  if (pathname === "/__plugin/share/config")        return "config";
  if (pathname === "/__plugin/share/submit")        return "submit";
  if (pathname === "/__plugin/share/search-users")  return "search-users";
  return null;
}

function buildShareMockPayload(routeType, requestPayload, searchParams) {
  if (routeType === "config") {
    return { shareType: "SPECIFIC", members: [] };
  }
  if (routeType === "submit") {
    return { accepted: true, mock: true, received: requestPayload };
  }
  if (routeType === "search-users") {
    var q = searchParams.get("q") || "";
    return [{ username: "mock-" + (q || "user"), name: "Mock " + (q || "User") }];
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

function createHandler(options, logger) {
  const runtimeConfig = buildRuntimeConfig(options);
  const appRegistry = createAppRegistry(options.projectsDir, logger, options.gatewayUrlResolver);
  const previewAuth = normalizePreviewAuth(options);

  return async function handler(request, response) {
    const requestUrl = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
    const requestId = request.headers["x-request-id"] || crypto.randomUUID();
    const startedAt = Date.now();
    let routeType = "unknown";
    let appId = "";

    response.on("finish", () => {
      logger.info(
        "request.completed",
        {
          requestId,
          method: request.method,
          path: requestUrl.pathname,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
          routeType,
          appId: appId || undefined
        },
        { category: "access" }
      );
    });

    try {
      const devPreviewRoute = findDevPreviewRoute(requestUrl.pathname);
      if (devPreviewRoute) {
        routeType = "dev-preview";
        if (!previewAuth.enabled) {
          return sendJson(response, 404, { error: "preview_auth_disabled" });
        }

        const authState = await resolvePreviewSession(previewAuth, request, requestUrl);
        logger.info("auth.session_resolved", {
          requestId,
          path: requestUrl.pathname,
          authSource: authState.authSource,
          result: authState.sessionToken ? "present" : "missing"
        });
        const sessionValid = await validatePreviewSession(previewAuth, request, authState.sessionToken);
        if (authState.sessionToken && !sessionValid) {
          logger.warn("auth.session_invalid", {
            requestId,
            path: requestUrl.pathname,
            authSource: authState.authSource
          });
          return sendRedirect(
            response,
            buildSsoLoginUrl(previewAuth, request, requestUrl),
            buildPreviewSessionClearHeaders(previewAuth)
          );
        }
        if (!authState.sessionToken) {
          logger.info("auth.session_missing", {
            requestId,
            path: requestUrl.pathname,
            authSource: authState.authSource
          });
          return sendRedirect(response, buildSsoLoginUrl(previewAuth, request, requestUrl));
        }
        if (authState.shouldRedirectToCleanUrl) {
          return sendRedirect(
            response,
            sanitizeCurrentPath(requestUrl),
            buildPreviewSessionHeaders(previewAuth, authState.sessionToken)
          );
        }

        const service = readManagedPreviewService(previewAuth.devPreviewRegistryPath, devPreviewRoute.projectName);
        if (!service) {
          return sendJson(response, 404, { error: "dev_preview_not_found", projectName: devPreviewRoute.projectName });
        }

        const targetUrl = new URL(devPreviewRoute.relativePath, service.url.endsWith("/") ? service.url : `${service.url}/`);
        return sendRedirect(
          response,
          `${targetUrl.origin}${targetUrl.pathname}${requestUrl.search}`,
          buildPreviewSessionHeaders(previewAuth, authState.sessionToken)
        );
      }

      if (requestUrl.pathname === "/apps") {
        routeType = "apps-index";
        const { apps } = appRegistry.getSnapshot();
        return sendJson(
          response,
          200,
          apps.map((app) => ({
            appId: app.appId,
            appName: app.appName
          }))
        );
      }

      // SSO 代理路由：前端 rewriteUrl 把 SSO 域 rewrite 到 serve，
      // serve 再代理到真实 SSO，避免浏览器 CORS 问题
      if (
        requestUrl.pathname === "/validate2" || requestUrl.pathname === "/userinfo"
      ) {
        routeType = "sso-proxy";
        // 优先用前端 rewriteUrl 附带的原始 SSO host（_sso 参数），
        // 避免 gateway resolveSsoHost 与前端 getSsoHost() 指向不同系统导致 ticket 跨系统兑换失败
        const ssoFromParam = requestUrl.searchParams.get("_sso") || "";
        const ssoHost = ssoFromParam || resolveSsoHost(previewAuth, request);
        // 转发时去掉 _sso 参数，不透传给上游
        const forwardUrl = new URL(requestUrl.pathname + requestUrl.search, ssoHost);
        forwardUrl.searchParams.delete("_sso");
        const targetUrl = forwardUrl;
        const proxyHeaders = {
          Accept: "application/json",
          "X-Service-Name": previewAuth.defaultServiceName,
          "X-Platform-Type": "web",
          "X-Requested-With": "XMLHttpRequest"
        };
        // 优先用配置的 apigAppCode，否则透传客户端携带的 x-apig-appcode
        const apigAppCode = previewAuth.apigAppCode || request.headers["x-apig-appcode"] || "";
        if (apigAppCode) {
          proxyHeaders["X-Apig-AppCode"] = apigAppCode;
        }
        // userinfo 需要带 X-Usercenter-Session
        const sessionHeader = request.headers["x-usercenter-session"] || "";
        if (sessionHeader) {
          proxyHeaders["X-Usercenter-Session"] = sessionHeader;
        }
        const proxyRes = await fetch(targetUrl.toString(), { headers: proxyHeaders });
        const body = await proxyRes.text();
        const corsHeaders = {
          "access-control-allow-origin": request.headers.origin || "*",
          "access-control-allow-credentials": "true",
          "content-type": proxyRes.headers.get("content-type") || "application/json"
        };
        return sendText(response, proxyRes.status, body, corsHeaders["content-type"], corsHeaders);
      }

      if (RUNTIME_ASSETS[requestUrl.pathname]) {
        routeType = "runtime-asset";
        return sendFile(response, RUNTIME_ASSETS[requestUrl.pathname]);
      }

      if (requestUrl.pathname.startsWith("/__plugin-dist/")) {
        routeType = "plugin-dist";
        ensurePluginBuilt();
        const distFile = path.join(PLUGIN_DIR, "dist", requestUrl.pathname.replace("/__plugin-dist/", ""));
        if (fs.existsSync(distFile)) {
          return sendFile(response, distFile);
        }
        return sendJson(response, 404, { error: "dist_asset_not_found" });
      }

      if (requestUrl.pathname.startsWith("/__plugin/share/")) {
        routeType = "plugin-share";
        const shareRouteType = getShareRouteType(requestUrl.pathname);
        if (!shareRouteType) {
          return sendJson(response, 404, { error: "unsupported_share_route", pathname: requestUrl.pathname });
        }
        const isSubmit = shareRouteType === "submit";
        if (isSubmit && request.method !== "POST") {
          return sendJson(response, 405, { error: "method_not_allowed" });
        }
        if (!isSubmit && request.method !== "GET") {
          return sendJson(response, 405, { error: "method_not_allowed" });
        }

        const shareProxy = options.shareProxy || {};
        const hasAppCenter = shareProxy.appCenterOrigin;
        const hasUc = shareProxy.ucOrigin;

        // search-users → UC 代理
        if (shareRouteType === "search-users") {
          if (!hasUc) {
            return sendJson(response, 200, buildShareMockPayload("search-users", null, requestUrl.searchParams));
          }
          const q = requestUrl.searchParams.get("q") || "";
          const ucBase = shareProxy.ucBasePath || "/admin/uc";
          // 优先取 header，兜底从 cookie 读（浏览器插件只带 cookie 不带 header）
          const ucCookies = parseCookieHeader(request.headers.cookie || "");
          const ucSessionToken =
            request.headers["x-usercenter-session"] ||
            buildUserinfoSessionValue(
              ucCookies[previewAuth.cookieName] ||
              ucCookies[previewAuth.clientSessionCookieName] ||
              ucCookies[previewAuth.clientUnsafeSessionCookieName] ||
              ""
            );
          // 仿照 SSO 代理：构造干净的请求头，不透传浏览器噪音
          const ucProxyHeaders = {
            "Accept": "application/json",
            "X-Service-Name": previewAuth.defaultServiceName,
            "X-Platform-Type": "web",
            "X-Requested-With": "XMLHttpRequest"
          };
          if (ucSessionToken) {
            ucProxyHeaders["X-Usercenter-Session"] = ucSessionToken;
          }
          const apigAppCode = shareProxy.apigAppCode || request.headers["x-apig-appcode"] || "";
          if (apigAppCode) {
            ucProxyHeaders["X-Apig-AppCode"] = apigAppCode;
          }
          const ucUrl = new URL(`${ucBase}/user?username=${encodeURIComponent(q)}`, shareProxy.ucOrigin);
          const startedAt2 = Date.now();
          let ucRes;
          try {
            ucRes = await fetch(ucUrl.toString(), { headers: ucProxyHeaders });
          } catch (err) {
            logger.error("proxy.failed", { requestId, path: requestUrl.pathname, upstreamOrigin: shareProxy.ucOrigin, error: err });
            return sendJson(response, 502, { error: "uc_proxy_failed" });
          }
          const ucBody = await ucRes.text();
          logger.info("proxy.completed", { requestId, method: "GET", path: requestUrl.pathname, upstreamOrigin: shareProxy.ucOrigin, targetPath: ucUrl.pathname + ucUrl.search, statusCode: ucRes.status, durationMs: Date.now() - startedAt2 });
          return sendText(response, ucRes.status, ucBody, ucRes.headers.get("content-type") || "application/json");
        }

        // config + submit → app-center 代理
        if (!hasAppCenter) {
          const payload = isSubmit ? await parseJsonBody(request) : null;
          return sendJson(response, 200, buildShareMockPayload(shareRouteType, payload, requestUrl.searchParams));
        }

        const appCenterBase = shareProxy.appCenterBasePath || "/app-center";
        if (shareRouteType === "config") {
          const qAppId = requestUrl.searchParams.get("appId") || "";
          return proxyToUpstream({
            request, response,
            upstreamOrigin: shareProxy.appCenterOrigin,
            targetPath: `${appCenterBase}/projects/${encodeURIComponent(qAppId)}/share`,
            sessionToken: request.headers["x-usercenter-session"] || "",
            serviceName: "",
            logger, requestId,
            pathName: requestUrl.pathname
          });
        }

        // submit
        const submitBody = await parseJsonBody(request);
        if (!submitBody) {
          return sendJson(response, 400, { error: "invalid_json" });
        }
        const submitAppId = submitBody.appId || "";
        return proxyToUpstream({
          request, response,
          upstreamOrigin: shareProxy.appCenterOrigin,
          targetPath: `${appCenterBase}/projects/${encodeURIComponent(submitAppId)}/share`,
          sessionToken: request.headers["x-usercenter-session"] || "",
          serviceName: "",
          logger, requestId,
          pathName: requestUrl.pathname,
          rawBody: Buffer.from(JSON.stringify(submitBody))
        });
      }

      if (requestUrl.pathname.startsWith("/__plugin/") || requestUrl.pathname.startsWith("/__control/")) {
        routeType = "plugin-control";
        let controlAuthState = null;
        if (previewAuth.enabled) {
          controlAuthState = await resolvePreviewSession(previewAuth, request, requestUrl);
          logger.info("auth.session_resolved", {
            requestId,
            path: requestUrl.pathname,
            authSource: controlAuthState.authSource,
            result: controlAuthState.sessionToken ? "present" : "missing"
          });
          const sessionValid = await validatePreviewSession(previewAuth, request, controlAuthState.sessionToken);
          if (controlAuthState.sessionToken && !sessionValid) {
            logger.warn("auth.session_invalid", {
              requestId,
              path: requestUrl.pathname,
              authSource: controlAuthState.authSource
            });
            return sendJson(response, 401, { error: "unauthorized" }, buildPreviewSessionClearHeaders(previewAuth));
          }
          if (!controlAuthState.sessionToken) {
            logger.info("auth.session_missing", {
              requestId,
              path: requestUrl.pathname,
              authSource: controlAuthState.authSource
            });
            return sendJson(response, 401, { error: "unauthorized" });
          }
          if (controlAuthState.shouldRedirectToCleanUrl) {
            return sendJson(response, 401, { error: "ticket_login_required" }, buildPreviewSessionHeaders(previewAuth, controlAuthState.sessionToken));
          }
        }
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

        return await proxyToUpstream({
          request,
          response,
          upstreamOrigin: controlTarget.upstreamOrigin,
          targetPath: `${controlTarget.path || "/"}${requestUrl.search}`,
          sessionToken: controlAuthState?.sessionToken || "",
          serviceName: previewAuth.defaultServiceName,
          logger,
          requestId,
          pathName: requestUrl.pathname
        });
      }

      const { appMap } = appRegistry.getSnapshot();
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
      appId = app.appId;
      routeType = `app-${appMatch.mode}`;
      let authState = null;
      const proxyMatch = appMatch.mode === "content" ? resolveProxyMatch(app, appMatch.relativePath) : null;
      const proxyRoute = proxyMatch?.route || null;
      const requiresPreviewHtmlAuth =
        previewAuth.enabled &&
        (appMatch.mode === "shell" ||
          (appMatch.mode === "content" &&
            (appMatch.relativePath === "/" || shouldServeSpaFallback(appMatch.relativePath) || proxyRoute)));
      if (requiresPreviewHtmlAuth) {
        authState = await resolvePreviewSession(previewAuth, request, requestUrl);
        logger.info("auth.session_resolved", {
          requestId,
          path: requestUrl.pathname,
          authSource: authState.authSource,
          result: authState.sessionToken ? "present" : "missing"
        });
        const sessionValid = await validatePreviewSession(previewAuth, request, authState.sessionToken);
        if (authState.sessionToken && !sessionValid) {
          logger.warn("auth.session_invalid", {
            requestId,
            path: requestUrl.pathname,
            authSource: authState.authSource,
            appId: app.appId
          });
          if (proxyRoute) {
            return sendJson(response, 401, { error: "unauthorized" }, buildPreviewSessionClearHeaders(previewAuth));
          }
          return sendRedirect(
            response,
            buildSsoLoginUrl(previewAuth, request, requestUrl),
            buildPreviewSessionClearHeaders(previewAuth)
          );
        }
        if (!authState.sessionToken) {
          logger.info("auth.session_missing", {
            requestId,
            path: requestUrl.pathname,
            authSource: authState.authSource,
            appId: app.appId
          });
          if (proxyRoute) {
            return sendJson(response, 401, { error: "unauthorized" });
          }
          return sendRedirect(response, buildSsoLoginUrl(previewAuth, request, requestUrl));
        }
        if (authState.shouldRedirectToCleanUrl) {
          return sendRedirect(
            response,
            authState.redirectLocation || sanitizeCurrentPath(requestUrl),
            buildPreviewSessionHeaders(previewAuth, authState.sessionToken)
          );
        }
      }
      if (appMatch.mode === "shell") {
        return sendText(
          response,
          200,
          renderShellPage(runtimeConfig, app, authState?.sessionToken || "", requestUrl),
          "text/html; charset=utf-8",
          buildPreviewSessionHeaders(previewAuth, authState?.sessionToken || "")
        );
      }

      if (proxyRoute) {
        return await proxyToUpstream({
          request,
          response,
          upstreamOrigin: proxyRoute.upstreamOrigin,
          targetPath: `${proxyMatch.targetPath}${requestUrl.search}`,
          sessionToken: authState?.sessionToken || "",
          serviceName: previewAuth.defaultServiceName,
          logger,
          requestId,
          pathName: requestUrl.pathname
        });
      }

      const targetFile = safeJoin(app.rootDir, appMatch.relativePath);
      if (targetFile && fs.existsSync(targetFile) && fs.statSync(targetFile).isFile()) {
        return sendFile(response, targetFile);
      }

      if (appMatch.relativePath === "/" || shouldServeSpaFallback(appMatch.relativePath)) {
        ensurePluginBuilt();
        const html = fs.readFileSync(app.indexFile, "utf8");
        return sendText(
          response,
          200,
          rewriteContentHtml(html, app, authState?.sessionToken || "", resolveServeOrigin(request)),
          "text/html; charset=utf-8",
          buildPreviewSessionHeaders(previewAuth, authState?.sessionToken || "")
        );
      }

      return sendJson(response, 404, { error: "asset_not_found" });
    } catch (error) {
      logger.error("request.failed", {
        requestId,
        method: request.method,
        path: requestUrl.pathname,
        routeType,
        appId: appId || undefined,
        error
      });
      return sendJson(response, 500, {
        error: "gateway_error",
        message: error.message
      });
    }
  };
}

async function startGateway(options) {
  ensurePluginBuilt();
  const logger =
    options.logger ||
    createLogger({
      rootDir: options.logDir || ROOT_DIR,
      level: options.logLevel,
      service: "web-design-serve-gateway"
    });
  let server = null;
  const gatewayUrlResolver = () => {
    const address = server?.address();
    if (!address) {
      return "";
    }
    return `http://${address.address}:${address.port}`;
  };
  server = http.createServer(
    createHandler({
      ...options,
      gatewayUrlResolver
    }, logger)
  );
  await new Promise((resolve) => server.listen(options.port || 0, options.host || "127.0.0.1", resolve));
  const address = server.address();
  const gatewayUrl = `http://${address.address}:${address.port}`;
  const apps = discoverApps({ projectsDir: options.projectsDir });
  logger.info("gateway.started", {
    host: address.address,
    port: address.port,
    projectsDir: options.projectsDir
  });
  logger.info("gateway.apps_available", {
    appCount: apps.length,
    apps: buildAppAccessList(gatewayUrl, apps)
  });
  return {
    host: address.address,
    port: address.port,
    url: gatewayUrl,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => {
          if (error) {
            return reject(error);
          }
          logger.info("gateway.stopped", {
            host: address.address,
            port: address.port
          });
          return resolve();
        })
      )
  };
}

module.exports = {
  discoverApps,
  startGateway
};
