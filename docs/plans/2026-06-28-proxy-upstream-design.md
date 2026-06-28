# 设计文档：生成应用内接口请求代理

> 状态：已实现
> 日期：2026-06-28
> 关联实现文档：`2026-06-28-proxy-upstream.md`
> 关联上游规范：`aigc-clawmatic/docs/proxy-custom-upstream.md`

---

## 一、问题背景

生成应用（AIGC 生成的 React 前端）部署在 clawmatic 平台，访问路径为 `/apps/:owner/:appName/`。应用内发起的外部接口调用面临两个约束：

1. **跨域**：浏览器直接访问外部域名被 CORS 拦截
2. **鉴权**：clawmatic 需要对所有出站请求注入用户身份 header

解决路径：所有接口请求必须通过 clawmatic 代理层转发，生成应用内禁止直接写上游域名。

---

## 二、设计决策

### 2.1 请求路径约定

```
子应用 fetch 路径              clawmatic 匹配              上游收到
{basename}/api/{prefix}/rest  →  prefix 匹配 proxy.routes  →  {upstreamOrigin}/{prefix}/rest
```

- `{basename}` 由 clawmatic 注入 `window.__BASENAME__`，值为 `/apps/:owner/:appName/`
- 子应用统一通过 `{basename}api` 作为 baseURL，不感知部署路径

### 2.2 `window.__BASENAME__` 读取时机

`router.jsx` 和 `axios-instance.js` 均依赖 `window.__BASENAME__`，统一延迟到运行时读取：

| 模块 | 读取时机 | 方式 |
|---|---|---|
| `axios-instance.js` | 每次请求拦截时 | 拦截器内调用 `resolveApiBase()` |
| `router.jsx` | React 首次渲染时（`App.jsx` 的 `useMemo`） | `createRouter()` 工厂函数，不在模块顶层执行 |

**`createBrowserRouter` 工厂函数模式**：`router.jsx` 不再导出 `router` 常量，改为导出 `createRouter()` 函数。`App.jsx` 用 `useMemo(() => createRouter(), [])` 调用，确保在 React 组件首次渲染时（bundle 已全部加载，`window.__BASENAME__` 已就绪）才创建 router 实例，且整个生命周期只创建一次。

### 2.3 上游域名不进源码仓库

- 生产：上游域名写在 `.webdesign/manifest.json` 的 `proxy.routes[].upstreamOrigin`，随发布产物发出，不在源码中
- 开发：上游域名写在 `.env.local`（`.gitignore` 保护），格式 `VITE_DEV_PROXY_<KEY>=<prefix>|<origin>`
- `vite.config.js` 只有解析逻辑，不含任何具体域名

### 2.4 `proxy.routes` 排序

前缀匹配优先级依赖数组顺序，手动维护容易出错。`renderManifest()` 在写入前自动按前缀长度倒序排序，人工写入 manifest 模板时不需要关心顺序。

### 2.5 SSE / WebSocket

Vite 开发代理已开启 `ws: true`，支持 WebSocket 协议升级。

生成应用内必须通过 `src/shared/http/http-utils.js` 提供的工具函数构造 URL，禁止手动拼接：

```javascript
import { buildSseUrl, buildWsUrl } from '../shared/http/http-utils'

// SSE
const es = new EventSource(buildSseUrl('/events/stream'))

// WebSocket
const ws = new WebSocket(buildWsUrl('/order/ws'))
```

两个函数内部均调用 `resolveApiBase()`，与 axios 走相同的路径前缀，保证开发/生产一致。

clawmatic 代理层是否支持 WebSocket 升级取决于平台规范，业务使用前需确认。

---

## 三、不在本方案范围内

| 场景 | 说明 |
|---|---|
| 业务权限校验 | 由子应用调用外部权限服务完成，clawmatic 不感知 |
| SSO 登录态 | 由现有 `src/shared/auth/*` 处理，本方案不改动 |
| `targetKey`（平台预设上游） | 与 `upstreamOrigin` 兼容共存，本方案不影响现有用法 |

---

## 四、方案边界与已知限制

1. `resolveBasename()` 在模块加载时执行，依赖 clawmatic 在 bundle 之前注入 `__BASENAME__`
2. SSE/WebSocket URL 需业务代码手动调用 `resolveApiBase()`，没有统一封装的 `buildWsUrl`（Low 优先级，按需补充）
3. `VITE_DEV_PROXY_*` 的 `|` 分隔符：value 中第一个 `|` 前为 prefix，之后全部为 origin，origin 本身不应含 `|`（标准 URL 不含此字符）
