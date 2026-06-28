import { getSessionId } from './token'

// ---------------------------------------------------------------------------
// SSO host 解析
// ---------------------------------------------------------------------------

const SERVICE_NAME = 'za-open-bot'

/**
 * 根据环境变量决定 SSO host
 *
 * 使用方式（在 .env 文件中配置）：
 *   VITE_SSO_ENV=dev|sit|uat|prd
 *   VITE_SSO_REGION=intl|insure|domestic（默认 domestic）
 *
 * 不配置时回退到国内默认 https://nsso.zhongan.io
 */
export function getSsoHost() {
  const env = import.meta.env?.VITE_SSO_ENV || 'dev'
  const region = import.meta.env?.VITE_SSO_REGION || 'domestic'

  if (region === 'intl') {
    const hosts = {
      dev: 'https://za-dev-uc.in.za',
      sit: 'https://za-sit-uc.in.za',
      uat: 'https://za-uat-uc.in.za',
      prd: 'https://za-uc.in.za',
    }
    return hosts[env] || hosts.dev
  }

  if (region === 'insure') {
    const hosts = {
      dev:  'https://nsso-test.zhonganinfo.com',
      test: 'https://nsso-test.zhonganinfo.com',
      pre:  'https://nsso.zhonganinfo.com',
      prd:  'https://nsso.zhonganinfo.com',
    }
    return hosts[env] || hosts.dev
  }

  // domestic 默认
  return 'https://nsso.zhongan.io'
}

// ---------------------------------------------------------------------------
// SSO API
// ---------------------------------------------------------------------------

/**
 * 用 ticket 换 sessionId
 * POST ${ssoHost}/validate2
 */
export async function getSsoSessionIdByTicket(ticket) {
  const host = getSsoHost()
  const url = new URL(`${host}/validate2`)
  url.searchParams.set('service', SERVICE_NAME)
  url.searchParams.set('ticket', ticket)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })
  const json = await res.json()
  if (json.success === true) return json
  throw new Error(json.message || 'validate2 failed')
}

/**
 * 用 sessionId 获取用户信息
 * GET ${ssoHost}/userinfo
 */
export async function getSsoUserInfo() {
  const host = getSsoHost()
  const sessionId = getSessionId()
  const url = new URL(`${host}/userinfo`)
  url.searchParams.set('service', SERVICE_NAME)
  url.searchParams.set('encryptedSession', sessionId)

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Service-Name': SERVICE_NAME,
      'X-Usercenter-Session': sessionId,
    },
  })
  const json = await res.json()
  if (json.success === true) return json
  throw new Error(json.message || 'userinfo failed')
}

// ---------------------------------------------------------------------------
// SSO 跳转 URL 构建
// ---------------------------------------------------------------------------

/**
 * 构建跳转 SSO 的 URL
 * @param {'login'|'logout'} type
 */
export function buildSsoRedirectUrl(type = 'login') {
  const host = getSsoHost()
  // 清理 locale / ticket，防止参数累积
  const searchParams = new URLSearchParams(window.location.search)
  searchParams.delete('locale')
  searchParams.delete('ticket')
  const cleanSearch = searchParams.toString()
  const target = encodeURIComponent(
    `${location.protocol}//${location.host}${location.pathname}${cleanSearch ? '?' + cleanSearch : ''}`
  )

  if (type === 'logout') {
    return `${host}/logout?target=${target}`
  }
  return `${host}/login?service=${SERVICE_NAME}&target=${target}`
}
