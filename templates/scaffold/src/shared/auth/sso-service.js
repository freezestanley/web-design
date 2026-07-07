import { getSessionId } from './token'
import httpClient from '../http/axios-instance'

// ---------------------------------------------------------------------------
// SSO host 解析
// ---------------------------------------------------------------------------

const SERVICE_NAME = 'za-open-bot'

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

/**
 * 从 hostname 推导环境标识
 * 优先级：本地 > pre > prd 白名单 > test 特征 > fallback test
 */
export function getEnvFromHost(hostname = '') {
  if (!hostname || LOCAL_HOSTNAMES.has(hostname) || hostname.includes('localhost')) {
    return 'dev'
  }
  if (hostname.includes('pre')) return 'pre'
  if (
    hostname === 'aigc-lingxi-platform.prd.za.biz' ||
    hostname === 'aigc.zhonganonline.com' ||
    hostname === 'ai.zhonganonline.com' ||
    hostname === 'clawmatic.zhonganonline.com' ||
    hostname === 'za-uat-uc.in.za' ||
    hostname === 'za-uc.in.za'
  ) {
    return 'prd'
  }
  if (/^\d/.test(hostname) || hostname.includes('.test.za.biz') || hostname.includes('test')) {
    return 'test'
  }
  return 'test'
}

/**
 * 根据当前页面 hostname 决定 SSO host
 *
 * 优先级：
 *   1. window.__PREVIEW_SSO_HOST__（gateway 强制覆盖后门）
 *   2. 当前页面 hostname 推导（浏览器环境）
 *   3. VITE_SSO_ENV 构建时配置（SSR / Node 环境 fallback）
 *
 * region 仍走 VITE_SSO_REGION（intl/insure/domestic），默认 domestic
 */
export function getSsoHost(){
  const hosts = {
      dev:  'https://nsso-test.zhonganinfo.com',
      test: 'https://nsso-test.zhonganinfo.com',
      pre:  'https://nsso.zhonganinfo.com',
      prd:  'https://nsso.zhonganinfo.com',
    }
  return hosts[getEnvFromHost(window.location.hostname)] || hosts.prd
}
// export function getSsoHost() {
//   // gateway devMode 强制覆盖，优先级最高
//   if (typeof window !== 'undefined' && window.__PREVIEW_SSO_HOST__) {
//     return window.__PREVIEW_SSO_HOST__
//   }

//   const env =
//     typeof window !== 'undefined'
//       ? getEnvFromHost(window.location.hostname)
//       : (import.meta.env?.VITE_SSO_ENV || 'dev')

//   const region = import.meta.env?.VITE_SSO_REGION || 'domestic'

//   if (region === 'intl') {
//     const hosts = {
//       dev: 'https://za-dev-uc.in.za',
//       sit: 'https://za-sit-uc.in.za',
//       uat: 'https://za-uat-uc.in.za',
//       prd: 'https://za-uc.in.za',
//     }
//     return hosts[env] || hosts.dev
//   }

//   if (region === 'insure') {
//     const hosts = {
//       dev:  'https://nsso-test.zhonganinfo.com',
//       test: 'https://nsso-test.zhonganinfo.com',
//       pre:  'https://nsso.zhonganinfo.com',
//       prd:  'https://nsso.zhonganinfo.com',
//     }
//     return hosts[env] || hosts.dev
//   }

//   // domestic 默认
//   const domesticHosts = {
//     dev:  'https://nsso-test.zhonganinfo.com',
//     test: 'https://nsso-test.zhonganinfo.com',
//     pre:  'https://nsso.zhonganinfo.com',
//     prd:  'https://nsso.zhonganinfo.com',
//   }
//   return domesticHosts[env] || 'https://nsso.zhongan.io'
// }

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
