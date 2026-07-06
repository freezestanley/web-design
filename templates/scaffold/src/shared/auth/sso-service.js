import { getSessionId } from './token'
import httpClient from '../http/axios-instance'

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
  // gateway devMode 时注入真实 SSO host，优先于构建时的 VITE_SSO_ENV
  if (typeof window !== 'undefined' && window.__PREVIEW_SSO_HOST__) {
    return window.__PREVIEW_SSO_HOST__
  }

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
  const domesticHosts = {
    dev:  'https://nsso-test.zhonganinfo.com',
    test: 'https://nsso-test.zhonganinfo.com',
    pre:  'https://nsso.zhonganinfo.com',
    prd:  'https://nsso.zhonganinfo.com',
  }
  return domesticHosts[env] || 'https://nsso.zhongan.io'
}

// ---------------------------------------------------------------------------
// SSO API
// ---------------------------------------------------------------------------

/**
 * 用 ticket 换 sessionId
 * GET ${ssoHost}/validate2?service=za-open-bot&ticket=xxx
 *
 * 注：/validate2 路径命中拦截器豁免规则，不注入 X-Usercenter-Session
 */
export async function getSsoSessionIdByTicket(ticket) {
  const host = getSsoHost()
  const res = await httpClient.get(`${host}/validate2`, {
    params: { service: SERVICE_NAME, ticket },
  })
  const json = res.data || {}
  if (json.success === true) return json
  throw new Error(json.message || 'validate2 failed')
}

/**
 * 用 sessionId 获取用户信息
 * GET ${ssoHost}/userinfo?service=za-open-bot&encryptedSession=xxx
 *
 * X-Usercenter-Session 由拦截器统一注入
 */
export async function getSsoUserInfo() {
  const host = getSsoHost()
  const sessionId = getSessionId()
  const res = await httpClient.get(`${host}/userinfo`, {
    params: { service: SERVICE_NAME, encryptedSession: sessionId },
  })
  const json = res.data || {}
  if (json.success === true) return json
  throw new Error(json.message || 'userinfo failed')
}

// ---------------------------------------------------------------------------
// 应用权限校验
// ---------------------------------------------------------------------------

/**
 * 查询当前账号是否有权限访问当前应用
 *
 * 接口：GET /openapi/app-projects/{projectNo}/permission?account={account}
 * 域名：http://4335314-za-aigc-harness-studio.test.za.biz（通过 clawmatic 代理转发）
 * 代理前缀：/openapi（见 .webdesign/manifest.json proxy.routes）
 *
 * 返回：
 *   { appStatus: 'ONLINE'|'OFFLINE', hasPermission: boolean }
 *
 * 调用方判断优先级（由本函数统一处理）：
 *   1. appStatus === 'OFFLINE' → 应用已下线，无权访问
 *   2. hasPermission === false → 账号不在权限范围内
 *   两者均满足才允许访问
 *
 * @param {string} account  当前登录账号，从 SSO userinfo 取 account 字段
 * @returns {Promise<{ allowed: boolean, reason: 'offline'|'no_permission'|null }>}
 */
export async function checkAppPermission(account) {
  // window.__PROJECT_NO__ 由 clawmatic 注入，值为当前应用的 projectNo
  const projectNo =
    typeof window !== 'undefined' ? window.__PROJECT_NO__ : undefined

  if (!projectNo) {
    // 本地开发未注入时直接放行，不阻断开发流程
    console.warn('[auth] window.__PROJECT_NO__ 未注入，跳过权限校验（仅本地开发）')
    return { allowed: true, reason: null }
  }

  // 走 httpClient，baseURL 和 X-Usercenter-Session 由拦截器统一注入
  const { default: httpClient } = await import('../http/axios-instance')
  const res = await httpClient.get(
    `/openapi/app-projects/${encodeURIComponent(projectNo)}/permission`,
    { params: { account } }
  )

  const json = res.data || {}
  if (!json.success) {
    throw new Error(json.message || 'permission check error')
  }

  const { appStatus, hasPermission } = json.data || {}

  if (appStatus === 'OFFLINE') {
    return { allowed: false, reason: 'offline' }
  }
  if (!hasPermission) {
    return { allowed: false, reason: 'no_permission' }
  }
  return { allowed: true, reason: null }
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
