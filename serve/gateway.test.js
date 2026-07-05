const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");

const { startGateway, discoverApps } = require("./gateway");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function withCookie(response) {
  return response.headers.get("set-cookie") || "";
}

function readJsonLines(filePath) {
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) {
    return [];
  }
  return text.split("\n").map((line) => JSON.parse(line));
}

function createMemoryLogger() {
  const entries = [];

  function push(level, event, fields = {}, meta = {}) {
    entries.push({
      level,
      event,
      fields,
      meta
    });
  }

  return {
    entries,
    debug(event, fields, meta) {
      push("debug", event, fields, meta);
    },
    info(event, fields, meta) {
      push("info", event, fields, meta);
    },
    warn(event, fields, meta) {
      push("warn", event, fields, meta);
    },
    error(event, fields, meta) {
      push("error", event, fields, meta);
    }
  };
}

function createProject(projectsDir, options = {}) {
  const appId = options.appId || "APP_DEMO_001";
  const version = options.version || "v202607030001-demo";

  // 新结构：<appId>/versions/<version>/ + <appId>/current -> versions/<version>
  const appDir = path.join(projectsDir, appId);
  const versionDir = path.join(appDir, "versions", version);
  const currentLink = path.join(appDir, "current");

  fs.mkdirSync(path.join(versionDir, "assets"), { recursive: true });
  fs.writeFileSync(
    path.join(versionDir, "index.html"),
    options.indexHtml ||
      [
        "<!doctype html>",
        "<html>",
        "  <head>",
        `    <base href="/apps/${appId}/">`,
        `    <script>window.__BASENAME__="/apps/${appId}/";</script>`,
        "    <meta charset=\"utf-8\" />",
        "    <title>Demo App</title>",
        `    <script type="module" src="/apps/${appId}/assets/main.js"></script>`,
        "  </head>",
        "  <body>",
        "    <div id=\"root\"></div>",
        "  </body>",
        "</html>"
      ].join("\n")
  );
  fs.writeFileSync(path.join(versionDir, "assets", "main.js"), "console.log('demo');\n");
  fs.writeFileSync(path.join(versionDir, "assets", "main.css"), "body{background:#fff;}\n");
  writeJson(path.join(versionDir, "_meta.json"), {
    appName: options.appName || "demo-app",
    appNo: appId,
    manifest: {
      proxy: {
        routes: options.routes || []
      }
    }
  });

  // 创建 current 软链接
  try { fs.unlinkSync(currentLink); } catch { /* 不存在则忽略 */ }
  fs.symlinkSync(`versions/${version}`, currentLink);

  return versionDir;
}

async function createUpstreamServer(handler) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks).toString("utf8");
    requests.push({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body
    });
    await handler(req, res, body);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  return {
    requests,
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

test("discoverApps reads app ids from _meta.json", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-discovery-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_ALPHA", appName: "alpha" });
  createProject(projectsDir, {
    version: "v202607030002-beta",
    appId: "APP_BETA",
    appName: "beta"
  });

  const apps = discoverApps({ projectsDir });

  assert.equal(apps.length, 2);
  assert.deepEqual(
    apps.map((app) => app.appId).sort(),
    ["APP_ALPHA", "APP_BETA"]
  );
  assert.equal(apps[0].indexFile.endsWith("index.html"), true);
});

test("plugin endpoints return mock data when no upstream is configured", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-mock-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_MOCK", appName: "mock-app" });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    menu: {
      title: "Shared Control",
      selectA: { id: "env", label: "Environment" },
      selectB: { id: "region", label: "Region" }
    },
    pluginMock: {
      selectAOptions: [
        { label: "Mock Test", value: "mock-test" },
        { label: "Mock Prod", value: "mock-prod" }
      ],
      selectBOptions: [
        { label: "Mock CN", value: "mock-cn" },
        { label: "Mock US", value: "mock-us" }
      ]
    }
  });

  try {
    const optionsAResponse = await fetch(`${gateway.url}/__plugin/options/select-a`);
    const optionsAJson = await optionsAResponse.json();
    assert.equal(optionsAResponse.status, 200);
    assert.deepEqual(optionsAJson, [
      { label: "Mock Test", value: "mock-test" },
      { label: "Mock Prod", value: "mock-prod" }
    ]);

    const optionsBResponse = await fetch(`${gateway.url}/__plugin/options/select-b`);
    const optionsBJson = await optionsBResponse.json();
    assert.equal(optionsBResponse.status, 200);
    assert.deepEqual(optionsBJson, [
      { label: "Mock CN", value: "mock-cn" },
      { label: "Mock US", value: "mock-us" }
    ]);

    const submitResponse = await fetch(`${gateway.url}/__plugin/submit`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        appId: "APP_MOCK",
        currentPath: "/preview",
        selectA: "mock-prod",
        selectB: "mock-us"
      })
    });
    const submitJson = await submitResponse.json();
    assert.equal(submitResponse.status, 200);
    assert.deepEqual(submitJson, {
      accepted: true,
      mock: true,
      received: {
        appId: "APP_MOCK",
        currentPath: "/preview",
        selectA: "mock-prod",
        selectB: "mock-us"
      }
    });
  } finally {
    await gateway.close();
  }
});

test("unknown plugin endpoints return 404 instead of mock null payload", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-unknown-plugin-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_UNKNOWN_PLUGIN", appName: "unknown-plugin-app" });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    menu: {
      title: "Shared Control",
      selectA: { id: "env", label: "Environment" },
      selectB: { id: "region", label: "Region" }
    }
  });

  try {
    const response = await fetch(`${gateway.url}/__plugin/options/not-exists`);
    const json = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(json, {
      error: "unsupported_plugin_route",
      pathname: "/__plugin/options/not-exists"
    });
  } finally {
    await gateway.close();
  }
});

test("plugin submit returns 400 for invalid json payloads", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-invalid-json-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_INVALID_JSON", appName: "invalid-json-app" });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    menu: {
      title: "Shared Control",
      selectA: { id: "env", label: "Environment" },
      selectB: { id: "region", label: "Region" }
    }
  });

  try {
    const response = await fetch(`${gateway.url}/__plugin/submit`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: "{"
    });
    const json = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(json, {
      error: "invalid_json"
    });
  } finally {
    await gateway.close();
  }
});

test("gateway writes access logs for completed requests", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-access-log-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_ACCESS", appName: "access-app" });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    logDir: rootDir,
    menu: {
      title: "Shared Control",
      selectA: { id: "env", label: "Environment" },
      selectB: { id: "region", label: "Region" }
    }
  });

  try {
    const response = await fetch(`${gateway.url}/apps`);
    assert.equal(response.status, 200);
    await response.json();

    const accessLogs = readJsonLines(path.join(rootDir, "logs", "runtime", "access-" + new Date().toISOString().slice(0, 10) + ".jsonl"));
    const requestLog = accessLogs.find((entry) => entry.path === "/apps" && entry.statusCode === 200);
    assert.ok(requestLog);
    assert.equal(requestLog.method, "GET");
    assert.equal(typeof requestLog.durationMs, "number");
  } finally {
    await gateway.close();
  }
});

test("gateway writes error logs for internal request failures without sensitive fields", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-error-log-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_ERROR", appName: "error-app" });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    logDir: rootDir,
    menu: {
      title: "Shared Control",
      selectA: { id: "env", label: "Environment" },
      selectB: { id: "region", label: "Region" }
    },
    controlProxy: {
      selectAOptions: {
        upstreamOrigin: "http://127.0.0.1:1",
        path: "/boom"
      }
    }
  });

  try {
    const response = await fetch(`${gateway.url}/__plugin/options/select-a?ticket=sensitive-ticket`);
    const json = await response.json();
    assert.equal(response.status, 500);
    assert.equal(json.error, "gateway_error");

    const errorLogs = readJsonLines(path.join(rootDir, "logs", "runtime", "error-" + new Date().toISOString().slice(0, 10) + ".jsonl"));
    const errorLog = errorLogs.find((entry) => entry.event === "request.failed" && entry.path === "/__plugin/options/select-a");
    assert.ok(errorLog);
    assert.equal(errorLog.ticket, undefined);
    assert.equal(errorLog.sessionToken, undefined);
    assert.match(JSON.stringify(errorLogs), /sensitive-ticket/);
  } finally {
    await gateway.close();
  }
});

test("share preview forwards ticket login into a tokenized preview url for iframe-safe bootstrapping", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-auth-share-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_AUTH", appName: "auth-app" });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    previewAuth: {
      enabled: true,
      useMockSso: true,
      cookieName: "ATLANTIS_SESSION_ID",
      defaultServiceName: "za-open-bot",
      ssoHost: "https://nsso-test.zhonganinfo.com"
    }
  });

  try {
    const anonymousResponse = await fetch(`${gateway.url}/apps/APP_AUTH/`, {
      redirect: "manual"
    });
    assert.equal(anonymousResponse.status, 302);
    assert.match(String(anonymousResponse.headers.get("location")), /^https:\/\/nsso-test\.zhonganinfo\.com\/login\?/);

    const ticketResponse = await fetch(`${gateway.url}/apps/APP_AUTH/?ticket=ticket-za-lisi`, {
      redirect: "manual"
    });
    assert.equal(ticketResponse.status, 302);
    assert.equal(ticketResponse.headers.get("location"), "/apps/APP_AUTH/?token=session-za-lisi");
    assert.match(withCookie(ticketResponse), /ATLANTIS_SESSION_ID=session-za-lisi/);
    assert.match(withCookie(ticketResponse), /unsafeSessionId=session-za-lisi/);

    const shellResponse = await fetch(`${gateway.url}/apps/APP_AUTH/?token=session-za-lisi`);
    const shellHtml = await shellResponse.text();
    assert.equal(shellResponse.status, 200);
    assert.match(shellHtml, /unsafeSessionId/);
    assert.match(shellHtml, /session-za-lisi/);
    assert.match(shellHtml, /\/apps\/APP_AUTH\/content\/\?token=session-za-lisi/);

    const childHtmlResponse = await fetch(`${gateway.url}/apps/APP_AUTH/content/?token=session-za-lisi`);
    const childHtml = await childHtmlResponse.text();
    assert.equal(childHtmlResponse.status, 200);
    assert.match(childHtml, /unsafeSessionId/);
    assert.match(childHtml, /session-za-lisi/);
  } finally {
    await gateway.close();
  }
});

test("share preview redirects back to SSO when an existing preview session is invalid", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-auth-invalid-session-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_INVALID_SESSION", appName: "invalid-session-app" });

  const ssoUpstream = await createUpstreamServer((req, res) => {
    if (String(req.url).startsWith("/userinfo")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ success: false, code: 401, message: "Unauthorized" }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    previewAuth: {
      enabled: true,
      cookieName: "ATLANTIS_SESSION_ID",
      defaultServiceName: "za-open-bot",
      ssoHost: ssoUpstream.url,
      useMockSso: false
    }
  });

  try {
    const response = await fetch(`${gateway.url}/apps/APP_INVALID_SESSION/`, {
      redirect: "manual",
      headers: {
        cookie: "ATLANTIS_SESSION_ID=expired-session"
      }
    });

    assert.equal(response.status, 302);
    assert.match(String(response.headers.get("location")), /^http:\/\/127\.0\.0\.1:\d+\/login\?/);
  } finally {
    await gateway.close();
    await ssoUpstream.close();
  }
});

test("share preview validates session against userinfo without re-encoding opaque session tokens", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-auth-userinfo-query-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_USERINFO_QUERY", appName: "userinfo-query-app" });

  const ssoUpstream = await createUpstreamServer((req, res) => {
    if (String(req.url).startsWith("/userinfo")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ success: true, result: { userName: "za-lisi" } }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    previewAuth: {
      enabled: true,
      cookieName: "ATLANTIS_SESSION_ID",
      defaultServiceName: "za-open-bot",
      ssoHost: ssoUpstream.url,
      useMockSso: false
    }
  });

  try {
    const response = await fetch(`${gateway.url}/apps/APP_USERINFO_QUERY/`, {
      redirect: "manual",
      headers: {
        cookie: "ATLANTIS_SESSION_ID=opaque%25253D"
      }
    });

    assert.equal(response.status, 200);
    assert.equal(ssoUpstream.requests.length, 1);
    assert.match(ssoUpstream.requests[0].url, /\/userinfo\?service=za-open-bot&encryptedSession=opaque%3D$/);
    assert.equal(ssoUpstream.requests[0].headers["x-usercenter-session"], "opaque%3D");
  } finally {
    await gateway.close();
    await ssoUpstream.close();
  }
});

test("share preview keeps encoded validate2 session intact when validating a fresh ticket", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-ticket-encoded-session-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_TICKET_ENCODED", appName: "ticket-encoded-app" });

  const encodedSession = "abc%2Fdef%2Bghi";
  const ssoUpstream = await createUpstreamServer((req, res) => {
    if (String(req.url).startsWith("/validate2")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ success: true, result: encodedSession }));
      return;
    }

    if (String(req.url) === `/userinfo?service=za-open-bot&encryptedSession=${encodedSession}`) {
      if (req.headers["x-usercenter-session"] !== encodedSession) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ success: false, code: 401, message: "Unauthorized" }));
        return;
      }

      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ success: true, result: { userName: "za-lisi" } }));
      return;
    }

    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ success: false, code: 401, message: "Unauthorized" }));
  });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    previewAuth: {
      enabled: true,
      cookieName: "ATLANTIS_SESSION_ID",
      defaultServiceName: "za-open-bot",
      ssoHost: ssoUpstream.url,
      useMockSso: false
    }
  });

  try {
    const response = await fetch(`${gateway.url}/apps/APP_TICKET_ENCODED/?ticket=TICKET-123`, {
      redirect: "manual"
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get("location"), `/apps/APP_TICKET_ENCODED/?token=${encodeURIComponent(encodedSession)}`);
    assert.match(withCookie(response), /ATLANTIS_SESSION_ID=abc%252Fdef%252Bghi/);
    assert.equal(ssoUpstream.requests.length, 2);
    assert.equal(ssoUpstream.requests[1].headers["x-usercenter-session"], encodedSession);
  } finally {
    await gateway.close();
    await ssoUpstream.close();
  }
});

test("app proxy forwards preview session header to upstream when authenticated", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-auth-proxy-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });

  const appUpstream = await createUpstreamServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  });

  createProject(projectsDir, {
    appId: "APP_AUTH_PROXY",
    routes: [
      {
        prefix: "/orders",
        upstreamOrigin: appUpstream.url
      }
    ]
  });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    previewAuth: {
      enabled: true,
      useMockSso: true,
      cookieName: "ATLANTIS_SESSION_ID",
      defaultServiceName: "za-open-bot",
      ssoHost: "https://nsso-test.zhonganinfo.com"
    }
  });

  try {
    const response = await fetch(`${gateway.url}/apps/APP_AUTH_PROXY/content/orders/list`, {
      headers: {
        cookie: "ATLANTIS_SESSION_ID=session-za-lisi"
      }
    });
    assert.equal(response.status, 200);
    assert.equal(appUpstream.requests.length, 1);
    assert.equal(appUpstream.requests[0].headers["x-usercenter-session"], "session-za-lisi");
    assert.equal(appUpstream.requests[0].headers["x-service-name"], "za-open-bot");
  } finally {
    await gateway.close();
    await appUpstream.close();
  }
});

test("app proxy accepts x-usercenter-session when iframe cookies are unavailable", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-auth-header-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });

  const appUpstream = await createUpstreamServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  });

  createProject(projectsDir, {
    appId: "APP_AUTH_HEADER",
    routes: [
      {
        prefix: "/orders",
        upstreamOrigin: appUpstream.url
      }
    ]
  });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    previewAuth: {
      enabled: true,
      useMockSso: true,
      cookieName: "ATLANTIS_SESSION_ID",
      defaultServiceName: "za-open-bot",
      ssoHost: "https://nsso-test.zhonganinfo.com"
    }
  });

  try {
    const response = await fetch(`${gateway.url}/apps/APP_AUTH_HEADER/content/orders/list`, {
      headers: {
        "x-usercenter-session": "session-za-lisi"
      }
    });
    assert.equal(response.status, 200);
    assert.equal(appUpstream.requests.length, 1);
    assert.equal(appUpstream.requests[0].headers["x-usercenter-session"], "session-za-lisi");
    assert.equal(appUpstream.requests[0].headers["x-service-name"], "za-open-bot");
  } finally {
    await gateway.close();
    await appUpstream.close();
  }
});

test("plugin control proxy forwards preview session header to upstream when authenticated", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-auth-control-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_AUTH_CONTROL", appName: "auth-control-app" });

  const controlUpstream = await createUpstreamServer((req, res, body) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, body }));
  });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    previewAuth: {
      enabled: true,
      useMockSso: true,
      cookieName: "ATLANTIS_SESSION_ID",
      defaultServiceName: "za-open-bot",
      ssoHost: "https://nsso-test.zhonganinfo.com"
    },
    controlProxy: {
      submit: {
        upstreamOrigin: controlUpstream.url,
        path: "/submit-config"
      }
    }
  });

  try {
    const response = await fetch(`${gateway.url}/__plugin/submit`, {
      method: "POST",
      headers: {
        cookie: "ATLANTIS_SESSION_ID=session-za-lisi",
        "content-type": "application/json"
      },
      body: JSON.stringify({ env: "prod" })
    });
    assert.equal(response.status, 200);
    assert.equal(controlUpstream.requests.length, 1);
    assert.equal(controlUpstream.requests[0].headers["x-usercenter-session"], "session-za-lisi");
    assert.equal(controlUpstream.requests[0].headers["x-service-name"], "za-open-bot");
  } finally {
    await gateway.close();
    await controlUpstream.close();
  }
});

test("dev preview route redirects authenticated users to the managed vite preview", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-dev-preview-"));
  const projectsDir = path.join(rootDir, "projects");
  const registryPath = path.join(rootDir, "registry.json");
  fs.mkdirSync(projectsDir, { recursive: true });
  writeJson(registryPath, {
    services: [
      {
        pid: process.pid,
        port: 4100,
        url: "http://127.0.0.1:4100",
        projectPath: "/tmp/project-alpha",
        command: "npm run dev",
        startedAt: "2026-07-04T09:00:00.000Z"
      }
    ]
  });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    previewAuth: {
      enabled: true,
      useMockSso: true,
      cookieName: "ATLANTIS_SESSION_ID",
      defaultServiceName: "za-open-bot",
      ssoHost: "https://nsso-test.zhonganinfo.com",
      devPreviewRegistryPath: registryPath
    }
  });

  try {
    const anonymousResponse = await fetch(`${gateway.url}/preview/dev/project-alpha/`, {
      redirect: "manual"
    });
    assert.equal(anonymousResponse.status, 302);
    assert.match(String(anonymousResponse.headers.get("location")), /^https:\/\/nsso-test\.zhonganinfo\.com\/login\?/);

    const ticketResponse = await fetch(`${gateway.url}/preview/dev/project-alpha/?ticket=ticket-za-zhangchong`, {
      redirect: "manual"
    });
    assert.equal(ticketResponse.status, 302);
    assert.equal(ticketResponse.headers.get("location"), "/preview/dev/project-alpha/");
    assert.match(withCookie(ticketResponse), /ATLANTIS_SESSION_ID=session-za-zhangchong/);
    assert.match(withCookie(ticketResponse), /unsafeSessionId=session-za-zhangchong/);

    const redirectResponse = await fetch(`${gateway.url}/preview/dev/project-alpha/`, {
      redirect: "manual",
      headers: {
        cookie: withCookie(ticketResponse)
      }
    });
    assert.equal(redirectResponse.status, 302);
    assert.equal(redirectResponse.headers.get("location"), "http://127.0.0.1:4100/");
  } finally {
    await gateway.close();
  }
});

test("dev preview route rejects stale registry entries instead of redirecting to dead services", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-dev-preview-stale-"));
  const projectsDir = path.join(rootDir, "projects");
  const registryPath = path.join(rootDir, "registry.json");
  fs.mkdirSync(projectsDir, { recursive: true });
  writeJson(registryPath, {
    services: [
      {
        pid: 999999,
        port: 4101,
        url: "http://127.0.0.1:4101",
        projectPath: "/tmp/project-stale",
        command: "npm run dev",
        startedAt: "2026-07-04T09:00:00.000Z"
      }
    ]
  });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    previewAuth: {
      enabled: true,
      useMockSso: true,
      cookieName: "ATLANTIS_SESSION_ID",
      defaultServiceName: "za-open-bot",
      ssoHost: "https://nsso-test.zhonganinfo.com",
      devPreviewRegistryPath: registryPath
    }
  });

  try {
    const response = await fetch(`${gateway.url}/preview/dev/project-stale/`, {
      redirect: "manual",
      headers: {
        cookie: "ATLANTIS_SESSION_ID=session-za-lisi"
      }
    });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: "dev_preview_not_found",
      projectName: "project-stale"
    });
  } finally {
    await gateway.close();
  }
});

test("gateway serves a shell page with header plugin, iframe content routes, proxies app routes, and forwards control submit", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });

  const appUpstream = await createUpstreamServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, url: req.url }));
  });

  const selectAUpstream = await createUpstreamServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify([{ label: "Test", value: "test" }, { label: "Prod", value: "prod" }]));
  });

  const selectBUpstream = await createUpstreamServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify([{ label: "CN", value: "cn" }, { label: "US", value: "us" }]));
  });

  const submitUpstream = await createUpstreamServer((req, res, body) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ accepted: true, received: JSON.parse(body) }));
  });

  const projectDir = createProject(projectsDir, {
    appId: "APP_PROXY",
    indexHtml: [
      "<!doctype html>",
      "<html>",
      "  <head>",
      "    <meta charset=\"utf-8\" />",
      "    <title>Demo App</title>",
      "    <script type=\"module\" src=\"/assets/main.js\"></script>",
      "    <link rel=\"stylesheet\" href=\"/assets/main.css\" />",
      "  </head>",
      "  <body>",
      "    <div id=\"root\"></div>",
      "  </body>",
      "</html>"
    ].join("\n"),
    routes: [
      {
        prefix: "/orders",
        upstreamOrigin: appUpstream.url
      }
    ]
  });

  const originalHtml = fs.readFileSync(path.join(projectDir, "index.html"), "utf8");

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    menu: {
      title: "Shared Control",
      selectA: {
        id: "env",
        label: "Environment"
      },
      selectB: {
        id: "region",
        label: "Region"
      }
    },
    controlProxy: {
      selectAOptions: {
        upstreamOrigin: selectAUpstream.url,
        path: "/options/env"
      },
      selectBOptions: {
        upstreamOrigin: selectBUpstream.url,
        path: "/options/region"
      },
      submit: {
        upstreamOrigin: submitUpstream.url,
        path: "/submit-config"
      }
    }
  });

  try {
    const shellResponse = await fetch(`${gateway.url}/apps/APP_PROXY/?locale=zh_CN&token=one-time-token`);
    const shellHtml = await shellResponse.text();

    assert.equal(shellResponse.status, 200);
    assert.match(shellHtml, /Shared Control/);
    assert.match(shellHtml, /__plugin-dist\/plugin\.js/);
    assert.match(shellHtml, /__plugin-dist\/plugin\.css/);
    assert.match(shellHtml, /__runtime\/plugin-bridge\.js/);
    assert.match(shellHtml, /iframe/);
    assert.match(shellHtml, /\/apps\/APP_PROXY\/content\/\?locale=zh_CN/);
    assert.doesNotMatch(shellHtml, /one-time-token/);
    assert.match(shellHtml, /__WEB_DESIGN_GATEWAY__/);

    const diskHtml = fs.readFileSync(path.join(projectDir, "index.html"), "utf8");
    assert.equal(diskHtml, originalHtml);

    const childHtmlResponse = await fetch(`${gateway.url}/apps/APP_PROXY/content/`);
    const childHtml = await childHtmlResponse.text();
    assert.equal(childHtmlResponse.status, 200);
    assert.doesNotMatch(childHtml, /__plugin-dist\/plugin\.js/);
    assert.doesNotMatch(childHtml, /__runtime\/plugin-bridge\.js/);
    assert.match(childHtml, /\/apps\/APP_PROXY\/content\//);
    assert.match(childHtml, /src="\/apps\/APP_PROXY\/content\/assets\/main\.js"/);
    assert.match(childHtml, /<base href="\/apps\/APP_PROXY\/content\/">/);
    assert.match(childHtml, /window\.__BASENAME__="\/apps\/APP_PROXY\/content\/"/);
    assert.match(childHtml, new RegExp(`window\\.__PREVIEW_SSO_HOST__=${JSON.stringify(gateway.url).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));

    const assetResponse = await fetch(`${gateway.url}/apps/APP_PROXY/content/assets/main.js`);
    const assetText = await assetResponse.text();
    assert.equal(assetResponse.status, 200);
    assert.match(assetText, /console\.log/);

    const spaResponse = await fetch(`${gateway.url}/apps/APP_PROXY/content/dashboard/list-page`);
    const spaHtml = await spaResponse.text();
    assert.equal(spaResponse.status, 200);
    assert.match(spaHtml, /\/apps\/APP_PROXY\/content\//);
    assert.doesNotMatch(spaHtml, /Shared Control/);

    const proxyResponse = await fetch(`${gateway.url}/apps/APP_PROXY/content/api/orders/list?status=open`);
    const proxyJson = await proxyResponse.json();
    assert.equal(proxyResponse.status, 200);
    assert.deepEqual(proxyJson, {
      ok: true,
      url: "/orders/list?status=open"
    });
    assert.equal(appUpstream.requests.length, 1);
    assert.equal(appUpstream.requests[0].headers.host.includes("127.0.0.1"), true);

    const optionsAResponse = await fetch(`${gateway.url}/__plugin/options/select-a`);
    const optionsAJson = await optionsAResponse.json();
    assert.equal(optionsAResponse.status, 200);
    assert.deepEqual(optionsAJson, [
      { label: "Test", value: "test" },
      { label: "Prod", value: "prod" }
    ]);
    assert.equal(selectAUpstream.requests.length, 1);
    assert.equal(selectAUpstream.requests[0].url, "/options/env");

    const optionsBResponse = await fetch(`${gateway.url}/__plugin/options/select-b`);
    const optionsBJson = await optionsBResponse.json();
    assert.equal(optionsBResponse.status, 200);
    assert.deepEqual(optionsBJson, [
      { label: "CN", value: "cn" },
      { label: "US", value: "us" }
    ]);
    assert.equal(selectBUpstream.requests.length, 1);
    assert.equal(selectBUpstream.requests[0].url, "/options/region");

    const controlResponse = await fetch(`${gateway.url}/__plugin/submit`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        appId: "APP_PROXY",
        currentPath: "/dashboard/list-page",
        selectA: "prod",
        selectB: "us"
      })
    });
    const controlJson = await controlResponse.json();
    assert.equal(controlResponse.status, 200);
    assert.equal(submitUpstream.requests.length, 1);
    assert.equal(submitUpstream.requests[0].url, "/submit-config");
    assert.deepEqual(controlJson.received, {
      appId: "APP_PROXY",
      currentPath: "/dashboard/list-page",
      selectA: "prod",
      selectB: "us"
    });

    const pluginResponse = await fetch(`${gateway.url}/__plugin-dist/plugin.js`);
    const pluginScript = await pluginResponse.text();
    assert.equal(pluginResponse.status, 200);
    assert.match(pluginScript, /WebDesignControlPlugin/);
    assert.match(pluginScript, /localStorage/);
    assert.match(pluginScript, /__plugin\/share\/submit/);
    assert.match(pluginScript, /__plugin\/share\/config/);
    assert.match(pluginScript, /__plugin\/share\/search-users/);

    const bridgeResponse = await fetch(`${gateway.url}/__runtime/plugin-bridge.js`);
    const bridgeScript = await bridgeResponse.text();
    assert.equal(bridgeResponse.status, 200);
    assert.match(bridgeScript, /WebDesignControlPlugin/);
    assert.match(bridgeScript, /mount/);
  } finally {
    await gateway.close();
    await appUpstream.close();
    await selectAUpstream.close();
    await selectBUpstream.close();
    await submitUpstream.close();
  }
});

test("discoverApps skips directories without current symlink (legacy structure)", () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-legacy-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });

  // 新结构：有 current 软链接
  createProject(projectsDir, { appId: "APP_NEW" });

  // 旧结构：直接在 <subdir>/ 下放 index.html 和 _meta.json（无 current/）
  const legacyDir = path.join(projectsDir, "APP_LEGACY");
  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(path.join(legacyDir, "index.html"), "<!doctype html><html></html>");
  writeJson(path.join(legacyDir, "_meta.json"), { appNo: "APP_LEGACY", appName: "legacy" });

  const apps = discoverApps({ projectsDir });

  assert.equal(apps.length, 1);
  assert.equal(apps[0].appId, "APP_NEW");
});

test("share endpoints return mock data when shareProxy is not configured", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-share-mock-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_SHARE_MOCK" });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir
    // no shareProxy
  });

  try {
    const base = `http://127.0.0.1:${gateway.port}`;

    // config mock
    const configRes = await fetch(`${base}/__plugin/share/config?appId=APP001`);
    assert.equal(configRes.status, 200);
    const configData = await configRes.json();
    assert.equal(configData.shareType, "SPECIFIC");
    assert.ok(Array.isArray(configData.members));

    // submit mock
    const submitRes = await fetch(`${base}/__plugin/share/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appId: "APP001", shareType: "GLOBAL", members: [] })
    });
    assert.equal(submitRes.status, 200);
    const submitData = await submitRes.json();
    assert.equal(submitData.accepted, true);
    assert.equal(submitData.mock, true);

    // search-users mock
    const searchRes = await fetch(`${base}/__plugin/share/search-users?q=zhang`);
    assert.equal(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.ok(Array.isArray(searchData));
    assert.ok(searchData.length > 0);
    assert.ok(searchData[0].username);
  } finally {
    await gateway.close();
  }
});

test("share endpoints proxy to upstream when shareProxy is configured", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-share-proxy-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_SHARE_PROXY" });

  // 创建两个 upstream server（app-center + uc）
  const appCenterRequests = [];
  const appCenterServer = await createUpstreamServer(async (req, res) => {
    appCenterRequests.push({ method: req.method, url: req.url });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ shareType: "GLOBAL", members: [] }));
  });

  const ucRequests = [];
  const ucServer = await createUpstreamServer(async (req, res) => {
    ucRequests.push({ method: req.method, url: req.url });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify([{ username: "za-test", name: "Test User" }]));
  });

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    shareProxy: {
      appCenterOrigin: appCenterServer.url,
      appCenterBasePath: "/app-center",
      ucOrigin: ucServer.url,
      ucBasePath: "/admin/uc"
    }
  });

  try {
    const base = `http://127.0.0.1:${gateway.port}`;

    // config → proxy GET /app-center/projects/{appId}/share
    const configRes = await fetch(`${base}/__plugin/share/config?appId=APP001`);
    assert.equal(configRes.status, 200);
    assert.equal(appCenterRequests.length, 1);
    assert.equal(appCenterRequests[0].method, "GET");
    assert.ok(appCenterRequests[0].url.includes("/app-center/projects/APP001/share"));

    // submit → proxy POST /app-center/projects/{appId}/share
    const submitRes = await fetch(`${base}/__plugin/share/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ appId: "APP001", shareType: "SPECIFIC", members: [{ account: "za-test" }] })
    });
    assert.equal(submitRes.status, 200);
    assert.equal(appCenterRequests.length, 2);
    assert.equal(appCenterRequests[1].method, "POST");

    // search-users → proxy GET /admin/uc/user?username=xxx
    const searchRes = await fetch(`${base}/__plugin/share/search-users?q=test`);
    assert.equal(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.ok(Array.isArray(searchData));
    assert.equal(ucRequests.length, 1);
    assert.ok(ucRequests[0].url.includes("/admin/uc/user"));
    assert.ok(ucRequests[0].url.includes("username=test"));
  } finally {
    await Promise.all([gateway.close(), appCenterServer.close(), ucServer.close()]);
  }
});

test("gateway discovers new apps added after startup without restart", async () => {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "web-design-gateway-refresh-"));
  const projectsDir = path.join(rootDir, "projects");
  fs.mkdirSync(projectsDir, { recursive: true });
  createProject(projectsDir, { appId: "APP_EXISTING", appName: "existing-app" });
  const logger = createMemoryLogger();

  const gateway = await startGateway({
    host: "127.0.0.1",
    port: 0,
    projectsDir,
    logger,
    menu: {
      title: "Shared Control",
      selectA: { id: "env", label: "Environment" },
      selectB: { id: "region", label: "Region" }
    }
  });

  try {
    const startupLog = logger.entries.find((entry) => entry.event === "gateway.apps_available");
    assert.deepEqual(startupLog?.fields.apps, [
      {
        appId: "APP_EXISTING",
        appName: "existing-app",
        url: `${gateway.url}/apps/APP_EXISTING/`
      }
    ]);

    const beforeResponse = await fetch(`${gateway.url}/apps`);
    const beforeJson = await beforeResponse.json();
    assert.equal(beforeResponse.status, 200);
    assert.deepEqual(beforeJson, [{ appId: "APP_EXISTING", appName: "existing-app" }]);

    createProject(projectsDir, {
      version: "v202607040602-new",
      appId: "APP_NEW",
      appName: "new-app"
    });

    const afterResponse = await fetch(`${gateway.url}/apps`);
    const afterJson = await afterResponse.json();
    assert.equal(afterResponse.status, 200);
    assert.deepEqual(afterJson, [
      { appId: "APP_EXISTING", appName: "existing-app" },
      { appId: "APP_NEW", appName: "new-app" }
    ]);

    const appResponse = await fetch(`${gateway.url}/apps/APP_NEW/`);
    const appHtml = await appResponse.text();
    assert.equal(appResponse.status, 200);
    assert.match(appHtml, /Shared Control/);

    const refreshLog = logger.entries
      .filter((entry) => entry.event === "registry.refreshed")
      .at(-1);
    assert.deepEqual(refreshLog?.fields.apps, [
      {
        appId: "APP_EXISTING",
        appName: "existing-app",
        url: `${gateway.url}/apps/APP_EXISTING/`
      },
      {
        appId: "APP_NEW",
        appName: "new-app",
        url: `${gateway.url}/apps/APP_NEW/`
      }
    ]);
  } finally {
    await gateway.close();
  }
});
