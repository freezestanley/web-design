const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const scaffoldRoot = path.resolve(__dirname, "..", "templates", "scaffold");

test("scaffold package includes router, zustand, tailwind and zip-pack", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(scaffoldRoot, "package.json"), "utf8"));

  assert.equal(typeof pkg.dependencies.axios, "string");
  assert.equal(typeof pkg.dependencies["js-cookie"], "string");
  assert.equal(typeof pkg.dependencies["react-router-dom"], "string");
  assert.equal(typeof pkg.dependencies.zustand, "string");
  assert.equal(typeof pkg.devDependencies.tailwindcss, "string");
  assert.equal(typeof pkg.devDependencies["@adjfut/vite-plugin-zip-pack"], "string");
  assert.match(pkg.scripts.build, /^vite build$/);
});

test("scaffold contains regular app structure files", () => {
  const requiredFiles = [
    "postcss.config.js",
    "tailwind.config.js",
    "src/app/App.jsx",
    "src/app/router.jsx",
    "src/app/providers.jsx",
    "src/pages/home/index.jsx",
    "src/pages/unauthorized/index.jsx",
    "src/shared/auth/index.js",
    "src/shared/auth/login.js",
    "src/shared/auth/sso-service.js",
    "src/shared/auth/token.js",
    "src/shared/auth/use-auth.js",
    "src/shared/http/axios-instance.js",
    "src/shared/stores/user-store.js",
    "src/stores/app-store.js",
    "src/styles/main.css"
  ];

  for (const file of requiredFiles) {
    assert.equal(fs.existsSync(path.join(scaffoldRoot, file)), true, file);
  }
});

test("vite config wires react and zip pack", () => {
  const viteConfig = fs.readFileSync(path.join(scaffoldRoot, "vite.config.js"), "utf8");

  assert.match(viteConfig, /import zipPack from "@adjfut\/vite-plugin-zip-pack";/);
  assert.match(viteConfig, /plugins:\s*\[\s*react\(\),\s*zipPack\(/);
});


test("scaffold router uses protected root route with useAuth guard wiring", () => {
  const routerConfig = fs.readFileSync(path.join(scaffoldRoot, "src/app/router.jsx"), "utf8");

  assert.match(routerConfig, /import \{ createBrowserRouter, Outlet \} from ['"]react-router-dom['"]/);
  assert.match(routerConfig, /import \{ useAuth \} from ['"]\.\.\/shared\/auth['"]/);
  assert.match(routerConfig, /function ProtectedRoute\(\)/);
  assert.match(routerConfig, /const \{ isReady \} = useAuth\(\)/);
  assert.match(routerConfig, /return <Outlet \/>/);
  assert.match(routerConfig, /element:\s*<ProtectedRoute \/>/);
  assert.match(routerConfig, /children:\s*\[/);
  assert.match(routerConfig, /path:\s*['"]\/['"]/);
});

test("scaffold auth index exposes the current SSO helpers", () => {
  const authIndex = fs.readFileSync(
    path.join(scaffoldRoot, "src/shared/auth/index.js"),
    "utf8"
  );

  assert.match(authIndex, /export \{ useAuth \} from ['"]\.\/use-auth['"]/);
  assert.match(authIndex, /export \{ navigateToLogin, navigateToLogout \} from ['"]\.\/login['"]/);
  assert.match(authIndex, /export \{ getSessionId \} from ['"]\.\/token['"]/);
});

test("scaffold home page copy preserves auth and router wiring by default", () => {
  const homePage = fs.readFileSync(path.join(scaffoldRoot, "src/pages/home/index.jsx"), "utf8");

  assert.match(homePage, /Keep the scaffold auth, router, and HTTP wiring intact/i);
  assert.match(homePage, /explicitly requires a public page/i);
  assert.doesNotMatch(homePage, /replace this page with[^]*route structure[^]*real SSO/i);
});

test("axios-instance exports dedupeApiPrefix", () => {
  const src = fs.readFileSync(
    path.join(scaffoldRoot, "src/shared/http/axios-instance.js"),
    "utf8"
  );
  // 函数声明处导出，不允许重复的具名 re-export
  assert.match(src, /export function dedupeApiPrefix/);
  assert.doesNotMatch(src, /export \{[^}]*dedupeApiPrefix[^}]*\}/);
});

test("dedupeApiPrefix strips leading /api when baseURL ends with /api", () => {
  const src = fs.readFileSync(
    path.join(scaffoldRoot, "src/shared/http/axios-instance.js"),
    "utf8"
  );

  // 函数体必须包含对 baseURL.endsWith('/api') 的判断
  assert.match(src, /baseURL.*endsWith.*['"]\/api['"]/);
  // 函数体必须包含对 url.startsWith('/api') 的判断
  assert.match(src, /url.*startsWith.*['"]\/api['"]/);
  // 函数体必须有剥除前 4 个字符的语句（'/api'.length === 4）
  assert.match(src, /url\.slice\(4\)/);
});

test("axios request interceptor calls dedupeApiPrefix before sending", () => {
  const src = fs.readFileSync(
    path.join(scaffoldRoot, "src/shared/http/axios-instance.js"),
    "utf8"
  );

  // 拦截器内必须调用 dedupeApiPrefix，且结果赋回 config.url
  assert.match(src, /config\.url\s*=\s*dedupeApiPrefix\s*\(/);
  // 调用必须在 interceptors.request.use 回调内
  const interceptorBlock = src.slice(src.indexOf("interceptors.request.use"));
  assert.match(interceptorBlock, /dedupeApiPrefix/);
});
