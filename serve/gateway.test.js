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

function createProject(projectsDir, options = {}) {
  const versionDir = path.join(projectsDir, options.version || "v202607030001-demo");
  const appId = options.appId || "APP_DEMO_001";
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
  writeJson(path.join(versionDir, "_meta.json"), {
    appName: options.appName || "demo-app",
    appNo: appId,
    manifest: {
      proxy: {
        routes: options.routes || []
      }
    }
  });
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
    const shellResponse = await fetch(`${gateway.url}/apps/APP_PROXY/`);
    const shellHtml = await shellResponse.text();

    assert.equal(shellResponse.status, 200);
    assert.match(shellHtml, /Shared Control/);
    assert.match(shellHtml, /__plugin-dist\/plugin\.js/);
    assert.match(shellHtml, /__plugin-dist\/plugin\.css/);
    assert.match(shellHtml, /__runtime\/plugin-bridge\.js/);
    assert.match(shellHtml, /iframe/);
    assert.match(shellHtml, /\/apps\/APP_PROXY\/content\//);
    assert.match(shellHtml, /__WEB_DESIGN_GATEWAY__/);

    const diskHtml = fs.readFileSync(path.join(projectDir, "index.html"), "utf8");
    assert.equal(diskHtml, originalHtml);

    const childHtmlResponse = await fetch(`${gateway.url}/apps/APP_PROXY/content/`);
    const childHtml = await childHtmlResponse.text();
    assert.equal(childHtmlResponse.status, 200);
    assert.doesNotMatch(childHtml, /__plugin-dist\/plugin\.js/);
    assert.doesNotMatch(childHtml, /__runtime\/plugin-bridge\.js/);
    assert.match(childHtml, /\/apps\/APP_PROXY\/content\//);

    const assetResponse = await fetch(`${gateway.url}/apps/APP_PROXY/content/assets/main.js`);
    const assetText = await assetResponse.text();
    assert.equal(assetResponse.status, 200);
    assert.match(assetText, /console\.log/);

    const spaResponse = await fetch(`${gateway.url}/apps/APP_PROXY/content/dashboard/list-page`);
    const spaHtml = await spaResponse.text();
    assert.equal(spaResponse.status, 200);
    assert.match(spaHtml, /\/apps\/APP_PROXY\/content\//);
    assert.doesNotMatch(spaHtml, /Shared Control/);

    const proxyResponse = await fetch(`${gateway.url}/apps/APP_PROXY/content/orders/list?status=open`);
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
    assert.match(pluginScript, /__plugin\/submit/);
    assert.match(pluginScript, /__plugin\/options\/select-a/);
    assert.match(pluginScript, /__plugin\/options\/select-b/);

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
