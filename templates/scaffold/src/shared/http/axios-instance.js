import axios from 'axios'
import { getSessionId } from '../auth/token'
import { navigateToLogin } from '../auth/login'

const SERVICE_NAME = import.meta.env?.VITE_SERVICE_NAME || 'za-open-bot'

/**
 * 将 basename 与 '/api' 拼接为 API 根路径，避免双斜杠或无分隔符问题
 *
 * 规则：
 *   basename 末尾有 '/' → 直接拼 'api'
 *   basename 末尾无 '/' → 加 '/' 再拼 'api'
 *   basename 为 falsy  → 返回 undefined（axios 不注入 baseURL，使用相对路径）
 *
 * 示例：
 *   '/apps/za/demo/'  → '/apps/za/demo/api'
 *   '/apps/za/demo'   → '/apps/za/demo/api'
 *   ''  / undefined   → undefined
 */
export function buildApiBase(basename) {
  if (!basename || typeof basename !== 'string') return undefined
  return basename.endsWith('/') ? `${basename}api` : `${basename}/api`
}

/**
 * 在请求发出时（而非模块加载时）读取 __BASENAME__，
 * 避免宿主延后注入导致模块顶层求值拿到 undefined。
 *
 * 优先级：
 *   1. window.__BASENAME__（生产，clawmatic 注入）
 *   2. VITE_API_BASE_URL（开发，.env.local 配置）
 *   3. undefined（fallback，axios 使用相对路径，不注入空字符串）
 */
export function resolveApiBase() {
  if (typeof window !== 'undefined' && window.__BASENAME__) {
    return buildApiBase(window.__BASENAME__)
  }
  return import.meta.env?.VITE_API_BASE_URL || undefined
}

/** 判断 URL 是否为绝对路径（含协议或协议无关 URL） */
function isAbsoluteUrl(url) {
  return typeof url === 'string' && /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)
}

/**
 * 统一 axios 实例
 *
 * 请求拦截：自动注入 SSO 认证 header，动态计算 baseURL
 *   X-Service-Name       服务名
 *   X-Usercenter-Session 当前 sessionId
 *   X-Requested-With     XMLHttpRequest（标识 ajax）
 *
 * 响应拦截：
 *   code === 401 → 清 session + 跳 SSO 登录
 *   success === false → 控制台打印错误（业务层可自行覆盖）
 */
const httpClient = axios.create({
  timeout: 30000,
})

// 请求拦截：动态注入 baseURL + 鉴权 Header
httpClient.interceptors.request.use((config) => {
  const sessionId = getSessionId()

  // 绝对 URL 请求（如跨域调试）不注入 baseURL，避免污染 config
  if (!config.baseURL && !isAbsoluteUrl(config.url)) {
    config.baseURL = resolveApiBase()
  }

  const headers = {
    'X-Requested-With': 'XMLHttpRequest',
    'X-Service-Name': SERVICE_NAME,
  }

  // /validate2 接口在 ticket 兑换阶段尚无 sessionId，不注入
  if (!/\/validate2$/.test(config.url || '')) {
    headers['X-Usercenter-Session'] =
      sessionId && sessionId !== 'undefined' && sessionId !== 'null'
        ? sessionId
        : ''
  }

  return { ...config, headers: { ...config.headers, ...headers } }
})

// 响应拦截
httpClient.interceptors.response.use(
  (res) => {
    const { code, success, message } = res.data || {}
    if (code === 401) {
      navigateToLogin()
      return res
    }
    if (success === false) {
      console.error('[http] business error:', message)
    }
    return res
  },
  (error) => {
    if (!axios.isCancel(error)) {
      console.error('[http] request error:', error.message)
    }
    return Promise.reject(error)
  }
)

export default httpClient
export { resolveApiBase, buildApiBase }
