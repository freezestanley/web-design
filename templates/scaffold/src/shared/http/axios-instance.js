import axios from 'axios'
import { getSessionId } from '../auth/token'
import { navigateToLogin } from '../auth/login'

const SERVICE_NAME = import.meta.env?.VITE_SERVICE_NAME || 'za-open-bot'

/**
 * 统一 axios 实例
 *
 * 请求拦截：自动注入 SSO 认证 header
 *   X-Service-Name       服务名
 *   X-Usercenter-Session 当前 sessionId
 *   X-Requested-With     XMLHttpRequest（标识 ajax）
 *
 * 响应拦截：
 *   code === 401 → 清 session + 跳 SSO 登录
 *   success === false → 控制台打印错误（业务层可自行覆盖）
 */
const httpClient = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || '',
  timeout: 30000,
})

// 请求拦截
httpClient.interceptors.request.use((config) => {
  const sessionId = getSessionId()
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
