/**
 * SSO 认证 + 应用权限校验公共模块
 *
 * 完整流程：
 *   1. 应用启动 → useAuth() hook 自动执行初始化
 *   2. URL 有 ?token=  → 直接写入 sessionId
 *   3. URL 有 ?ticket= → 调 /validate2 兑换 sessionId
 *   4. 均无且无本地 session → 跳转 SSO 登录页
 *   5. 有 session → 调 /userinfo 获取用户信息 → 存入 store
 *   6. 调权限接口校验当前账号是否有权访问本应用
 *      - appStatus === 'OFFLINE'  → forbidden, reason: 'offline'
 *      - hasPermission === false  → forbidden, reason: 'no_permission'
 *      - 均通过                   → 正常渲染
 *
 * 依赖注入（由 clawmatic 在 index.html 中注入）：
 *   window.__BASENAME__    - 应用部署路径，如 /apps/za/my-app/
 *   window.__PROJECT_NO__  - 应用 projectNo，如 PROJvsckxrdidyscu
 *   window.__USER_ACCOUNT__ - 当前登录账号（备用，优先从 SSO userinfo 取）
 *
 * 对外暴露：
 *   useAuth()              - React hook，返回 { isReady, user, forbidden, forbiddenReason }
 *   checkAppPermission()   - 权限校验函数（通常由 useAuth 内部调用）
 *   navigateToLogin()      - 跳转登录
 *   navigateToLogout()     - 主动登出
 *   getSessionId()         - 读取当前 sessionId
 */

export { useAuth } from './use-auth'
export { checkAppPermission } from './sso-service'
export { navigateToLogin, navigateToLogout } from './login'
export { getSessionId } from './token'
