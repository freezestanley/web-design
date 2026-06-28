import { clearSessionId } from './token'
import { buildSsoRedirectUrl } from './sso-service'

/**
 * 跳转到 SSO 登录页（普通登录，SSO 可自动登录）
 */
export function navigateToLogin() {
  clearSessionId()
  window.location.href = buildSsoRedirectUrl('login')
}

/**
 * 主动登出：清除本地 session，跳转 SSO logout（强制重新认证）
 */
export function navigateToLogout() {
  clearSessionId()
  window.location.href = buildSsoRedirectUrl('logout')
}
