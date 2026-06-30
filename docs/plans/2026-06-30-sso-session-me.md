# SSO 循环刷新修复方案：前端改用 /api/session/me

## 问题

部署到 aigc-clawmatic 后页面不停刷新。

**根因：Cookie 名不匹配**

| 角色 | Cookie 名 |
|---|---|
| aigc-clawmatic 写入（HttpOnly） | `ATLANTIS_SESSION_ID` |
| 前端 `token.js` 读取 | `session_id` / `unsafeSessionId` |

前端永远读不到服务端写的 session，循环如下：

```
用户访问 /apps/PROJ.../order-list?ticket=xxx
  → aigc-clawmatic 服务端用 ticket 换 sessionToken
  → Set-Cookie: ATLANTIS_SESSION_ID=xxx（HttpOnly，前端 JS 不可读）
  → redirect 到去掉 ticket 的干净 URL
  → 前端加载，use-auth 执行
  → getSessionId() 读 session_id → 空
  → navigateToLogin() 跳 SSO
  → SSO 带新 ticket 回来
  → 回到第一步，死循环
```

## 方案

**只改 `use-auth.js`**：把前端自己做的 SSO 握手（ticket → validate2 → userinfo）替换为一次 `/api/session/me` 查询。

aigc-clawmatic 服务端的 `onRequest` hook 已经完成了所有 SSO 握手，`/api/session/me` 直接返回认证状态，前端不需要重复握手。

### 数据流对比

**改前（错误）：**
```
前端 → GET https://nsso.zhongan.io/validate2   （跨域，浏览器拦截）
     → catch → navigateToLogin() → 死循环
```

**改后：**
```
前端 → GET /api/session/me（同源，aigc-clawmatic 顶层路由）
     → { authenticated: true, userInfo: {...} }
     → setUser(userInfo) → 渲染页面
```

### 子应用 API 接口鉴权不受影响

子应用业务接口走 `/apps/:appNo/api/*`，由 aigc-clawmatic 代理层注入 `X-Usercenter-Session`（取自服务端 session），与前端是否存了 `session_id` 无关。

## 改动

### `templates/scaffold/src/shared/auth/use-auth.js`

```js
import { useEffect, useState } from 'react'
import { navigateToLogin } from './login'
import { useUserStore } from '../stores/user-store'
import { checkAppPermission } from './sso-service'
import httpClient from '../http/axios-instance'

// 开发预览旁路：仅在 .env.local 中设置 VITE_SSO_BYPASS=true 时生效
const BYPASS = import.meta.env.VITE_SSO_BYPASS === 'true'

// 模块级单例锁，保证整个应用生命周期只初始化一次
let _initializing = false
let _initialized = false

export function useAuth() {
  const [isReady, setIsReady] = useState(BYPASS || _initialized)
  const [forbidden, setForbidden] = useState(false)
  const [forbiddenReason, setForbiddenReason] = useState(null)
  const setUser = useUserStore((s) => s.setUser)
  const user = useUserStore((s) => s.user)

  useEffect(() => {
    if (BYPASS) {
      setUser({ name: 'Dev Preview', account: 'dev' })
      setIsReady(true)
      return
    }

    if (_initialized) {
      setIsReady(true)
      return
    }

    if (_initializing) return
    _initializing = true

    ;(async () => {
      try {
        // 服务端已完成 SSO 握手，直接查询当前会话状态
        // baseURL: '' 覆盖 resolveApiBase()，打到顶层 /api/session/me
        // 而非子应用代理路径 /apps/:appNo/api/session/me
        const res = await httpClient.get('/api/session/me', { baseURL: '' })
        const { authenticated, userInfo } = res.data || {}

        if (!authenticated) {
          navigateToLogin()
          return
        }

        setUser(userInfo)

        // 权限校验
        const account = userInfo?.userName || userInfo?.username
        if (account) {
          const { allowed, reason } = await checkAppPermission(account)
          if (!allowed) {
            setForbidden(true)
            setForbiddenReason(reason)
          }
        }
      } catch (err) {
        console.error('[auth] init error:', err)
        navigateToLogin()
        return
      } finally {
        _initialized = true
        _initializing = false
        setIsReady(true)
      }
    })()
  }, [])

  return { isReady, user, forbidden, forbiddenReason }
}
```

### 不改的文件

| 文件 | 原因 |
|---|---|
| `token.js` | BYPASS 模式和本地开发仍需要 `getSessionId` |
| `sso-service.js` | `checkAppPermission` 权限校验逻辑保留 |
| `login.js` | `navigateToLogin` 逻辑不变 |
| `axios-instance.js` | 生产环境 `X-Usercenter-Session` 由服务端覆盖，前端注入空值无害 |
| aigc-clawmatic 任何文件 | 服务端已具备完整能力，无需改动 |

## 关键细节

### `{ baseURL: '' }` 的作用

`axios-instance.js` 的请求拦截器会把 `baseURL` 设为 `window.__BASENAME__ + /api`（如 `/apps/PROJ.../api`）。
`/api/session/me` 是 aigc-clawmatic 的顶层路由，不应走子应用代理。
传 `{ baseURL: '' }` 覆盖注入，让请求打到 `/api/session/me` 而非 `/apps/PROJ.../api/session/me`。

### 本地开发

`controller.js` 的 `ensureDevEnvLocal` 自动写入 `VITE_SSO_BYPASS=true`，BYPASS 分支注入占位用户，不走 `/api/session/me`，本地开发不受影响。

### `/api/session/me` 响应结构

由 aigc-clawmatic `session.js` 提供：

```json
{
  "userAccount": "za-xxx",
  "authenticated": true,
  "userInfo": {
    "userName": "za-xxx",
    "username": "za-xxx",
    "displayName": "张三"
  },
  "serviceName": "za-open-bot"
}
```

## 待确认的风险点

1. **`finally` 里 `_initialized = true` 在 `navigateToLogin()` return 后仍执行**：`navigateToLogin()` 是同步跳转（`window.location.href = ...`），页面立即卸载，`finally` 虽然执行但无副作用。可接受。

2. **`checkAppPermission` 抛异常时走 `catch → navigateToLogin()`**：权限接口挂掉时会跳登录，体验不佳。后续可优化为降级放行或展示错误页，当前与原逻辑一致，不新增问题。

3. **React StrictMode 双调用**：`_initializing` 模块级单例在第一次调用后置 `true`，第二次 `useEffect` 执行时命中 `if (_initializing) return`，安全。
