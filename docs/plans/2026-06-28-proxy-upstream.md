# 实现文档：生成应用内接口请求代理

> 状态：已实现
> 日期：2026-06-28
> 设计文档：`2026-06-28-proxy-upstream-design.md`

---

## 修改文件清单

| 文件 | 改动内容 |
|---|---|
| `scripts/lib/manifest.js` | `validateManifest` 支持 `upstreamOrigin`，禁止共存，补格式校验；新增 `sortRoutesByPrefixLength`；发布前自动排序 |
| `templates/scaffold/src/shared/http/axios-instance.js` | `buildApiBase` 归一化（falsy 返回 undefined）；`resolveApiBase` 延迟求值；拦截器跳过绝对 URL；导出 `buildApiBase`、`resolveApiBase` |
| `templates/scaffold/src/shared/http/http-utils.js` | 新增，提供 `buildSseUrl`、`buildWsUrl` |
| `templates/scaffold/src/app/router.jsx` | `createBrowserRouter` 改为工厂函数 `createRouter()`，不在模块顶层执行 |
| `templates/scaffold/src/app/App.jsx` | 改用 `useMemo(() => createRouter(), [])` |
| `templates/scaffold/vite.config.js` | `buildDevProxy` 从 `VITE_DEV_PROXY_*` 解析，`indexOf` 拆分，补 origin 格式校验，开启 `ws: true` |
| `templates/scaffold/.env.example` | 补充 `VITE_ROUTER_BASENAME`、`VITE_DEV_PROXY_*` 字段说明及 KEY 命名规则 |
| `templates/scaffold/.webdesign/manifest.json` | 补 `schemaVersion: "1.0"`；`proxy.routes` 初始为 `[]` |
| `scripts/vitectrl/lib/controller.js` | `ensureDevEnvLocal` 追加 `VITE_DEV_PROXY_*` 使用说明注释 |

---

## 一、manifest.js

### validateManifest 变更

```javascript
// 改前：targetKey 必填
if (typeof route.targetKey !== "string" || !route.targetKey) {
  throw new Error("manifest proxy route requires targetKey");
}

// 改后：targetKey 与 upstreamOrigin 二选一
const hasTargetKey = typeof route.targetKey === "string" && route.targetKey;
const hasUpstreamOrigin = typeof route.upstreamOrigin === "string" && route.upstreamOrigin;
if (!hasTargetKey && !hasUpstreamOrigin) {
  throw new Error(`manifest proxy route "${route.prefix}" requires targetKey or upstreamOrigin`);
}
// upstreamOrigin 格式校验
if (hasUpstreamOrigin && !/^https?:\/\/[^/]+$/.test(route.upstreamOrigin)) {
  throw new Error(`... upstreamOrigin must be origin only ...`);
}
```

### 新增 sortRoutesByPrefixLength

```javascript
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
```

`renderManifest` 在 `replaceManifestPlaceholders` 之后、`validateManifest` 之前调用此函数，确保 prefix 已是真实字符串。

---

## 二、axios-instance.js

```javascript
// falsy basename 返回 undefined，避免注入空字符串影响 axios 行为
export function buildApiBase(basename) {
  if (!basename || typeof basename !== 'string') return undefined
  return basename.endsWith('/') ? `${basename}api` : `${basename}/api`
}

// fallback 返回 undefined（不注入空字符串）
export function resolveApiBase() {
  if (typeof window !== 'undefined' && window.__BASENAME__) {
    return buildApiBase(window.__BASENAME__)
  }
  return import.meta.env?.VITE_API_BASE_URL || undefined
}

function isAbsoluteUrl(url) {
  return typeof url === 'string' && /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)
}

// httpClient 不预设 baseURL
const httpClient = axios.create({ timeout: 30000 })

httpClient.interceptors.request.use((config) => {
  // 绝对 URL 请求跳过，避免污染 config.baseURL
  if (!config.baseURL && !isAbsoluteUrl(config.url)) {
    config.baseURL = resolveApiBase()
  }
  // ... 鉴权 header
})
```

---

## 三、router.jsx + App.jsx

`createBrowserRouter` 不在模块顶层执行，改为工厂函数，由 `App.jsx` 在组件挂载时调用：

```javascript
// router.jsx
export function resolveBasename() {
  if (typeof window !== 'undefined' && window.__BASENAME__) {
    return window.__BASENAME__.replace(/\/$/, '') || '/'
  }
  return import.meta.env?.VITE_ROUTER_BASENAME || '/'
}

export function createRouter() {
  return createBrowserRouter([...], { basename: resolveBasename() })
}
```

```javascript
// App.jsx
import { useMemo } from "react"
import { createRouter } from "./router"

export default function App() {
  // bundle 已全部加载，window.__BASENAME__ 已就绪
  const router = useMemo(() => createRouter(), [])
  return <RouterProvider router={router} />
}
```

---

## 三-B、http-utils.js（新增）

SSE / WebSocket 必须通过此文件的工具函数构造 URL，不允许手动拼接：

```javascript
import { buildSseUrl, buildWsUrl } from '../shared/http/http-utils'

const es = new EventSource(buildSseUrl('/events/stream'))
const ws = new WebSocket(buildWsUrl('/order/ws'))
```

`buildWsUrl` 处理相对路径（无协议）和绝对路径（含协议）两种情况：
- 相对路径：拼 `ws(s)://location.host + base + path`
- 绝对路径：`http → ws`，`https → wss`

---

## 四、vite.config.js

```javascript
function buildDevProxy(env) {
  const proxy = {};
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith("VITE_DEV_PROXY_")) continue;
    // indexOf 防御 origin 含 '|' 的极端情况
    const separatorIndex = value.indexOf("|");
    if (separatorIndex === -1) { console.warn(...); continue; }
    const prefix = value.slice(0, separatorIndex);
    const target = value.slice(separatorIndex + 1);
    if (!prefix || !target) { console.warn(...); continue; }
    // origin 格式二次校验
    if (!/^https?:\/\/[^/]+$/.test(target)) { console.warn(...); continue; }
    proxy[`/api${prefix}`] = {
      target,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ""),
      ws: true,
    };
  }
  return proxy;
}
```

---

## 五、manifest.json 配置规范

### proxy.routes 字段

| 字段 | 类型 | 约束 |
|---|---|---|
| `prefix` | string | 必填，以 `/` 开头 |
| `targetKey` | string | 与 `upstreamOrigin` 二选一 |
| `upstreamOrigin` | string | 与 `targetKey` 二选一；格式：`https://host`，不含路径，不带尾斜杠 |
| `methods` | string[] | 可选，默认 `["GET"]` |

### 多上游示例

```json
{
  "schemaVersion": "1.0",
  "projectId": "my-app",
  "name": "My App",
  "entry": "dist/index.html",
  "owner": "za-xxx",
  "proxy": {
    "routes": [
      { "prefix": "/permission", "upstreamOrigin": "https://permission-service.example.com" },
      { "prefix": "/user/profile", "upstreamOrigin": "https://profile-service.example.com" },
      { "prefix": "/user",         "upstreamOrigin": "https://user-service.example.com" },
      { "prefix": "/order",        "upstreamOrigin": "https://order-service.example.com", "methods": ["GET", "POST"] }
    ]
  }
}
```

`proxy.routes` 数组顺序不影响结果，`renderManifest` 发布时自动按前缀长度排序。

### 无外部接口时

`proxy.routes` 保持空数组即可，clawmatic 不要求必须有路由条目：

```json
{ "proxy": { "routes": [] } }
```

---

## 六、开发期配置（.env.local）

由 `dev-preview.js start` 自动写入骨架，开发者填写上游域名：

```bash
VITE_SSO_BYPASS=true

# 开发期接口代理（格式：VITE_DEV_PROXY_<KEY>=<manifest prefix>|<上游 origin>）
# 示例：VITE_DEV_PROXY_USER=/user|https://user-service.example.com
VITE_DEV_PROXY_USER=/user|https://user-service.example.com
VITE_DEV_PROXY_ORDER=/order|https://order-service.example.com
```

开发期请求路径与生产期一致（均剥 `/api` 前缀），无环境差异。

---

## 七、skill 生成阶段操作规范

Step 2（页面任务确认）收集 API 接口信息时，需额外收集：

| 信息 | 写入位置 |
|---|---|
| 接口路径列表 | 推算 `proxy.routes[].prefix` |
| 各接口对应上游 origin | `proxy.routes[].upstreamOrigin` |
| 是否需要外部权限校验 | 若是：加 `/permission` 路由 + `access.mode: "public_login"` |

生成时按上游域名分组，同域名取最短公共前缀，不需要手动排序。

---

## 八、禁令

| 禁止 | 原因 |
|---|---|
| 代码里硬写 `https://xxx.example.com/...` | 跨域 + 泄露内网地址 + 绕过鉴权 |
| 上游域名写入 `vite.config.js` | 随 `project.zip` 发布泄露，改用 `.env.local` |
| 模块顶层求值 `window.__BASENAME__` 作为 baseURL | 注入时机可能晚于模块加载 |
| `upstreamOrigin` 带路径或尾斜杠 | URL 拼接结果错误（`https://svc.com//user/list`） |
| 手动调整 `proxy.routes` 数组顺序 | 排序由 `renderManifest` 保证 |
| 手动拼接 SSE/WebSocket URL | 必须用 `buildSseUrl` / `buildWsUrl`，保证路径前缀与代理一致 |
| `VITE_DEV_PROXY_*` 的 KEY 含连字符 | 部分 shell 无法导出含连字符的变量名，KEY 只允许大写字母、数字、下划线 |
