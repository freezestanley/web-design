/**
 * SSO 认证公共模块
 *
 * 完整流程：
 *   1. 应用启动 → useAuth() hook 自动执行初始化
 *   2. URL 有 ?token=  → 直接写入 sessionId
 *   3. URL 有 ?ticket= → 调 /validate2 兑换 sessionId
 *   4. 均无且无本地 session → 跳转 SSO 登录页
 *   5. 有 session → 调 /userinfo 获取用户信息 → 存入 store
 *
 * 对外暴露：
 *   useAuth()         - React hook，返回 { isReady, user }
 *   navigateToLogin() - 跳转登录
 *   navigateToLogout()- 主动登出
 *   getSessionId()    - 读取当前 sessionId
 */

export { useAuth } from './use-auth'
export { navigateToLogin, navigateToLogout } from './login'
export { getSessionId } from './token'
