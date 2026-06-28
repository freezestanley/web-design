import { resolveApiBase } from './axios-instance'

/**
 * 构造走 clawmatic 代理的 SSE URL。
 *
 * 用法：
 *   const es = new EventSource(buildSseUrl('/events/stream'))
 *   // 开发期 → http://127.0.0.1:5173/api/events/stream（走 Vite proxy）
 *   // 生产期 → /apps/za/demo/api/events/stream（走 clawmatic 代理）
 *
 * @param {string} path  以 / 开头的接口路径，如 '/events/stream'
 * @returns {string}
 */
export function buildSseUrl(path) {
  const base = resolveApiBase()
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * 构造走 clawmatic 代理的 WebSocket URL。
 * 将 http/https 协议替换为 ws/wss。
 *
 * 用法：
 *   const ws = new WebSocket(buildWsUrl('/order/ws'))
 *   // 开发期 → ws://127.0.0.1:5173/api/order/ws（走 Vite proxy ws: true）
 *   // 生产期 → wss://host/apps/za/demo/api/order/ws（走 clawmatic 代理，需确认平台支持 WS）
 *
 * @param {string} path  以 / 开头的接口路径，如 '/order/ws'
 * @returns {string}
 */
export function buildWsUrl(path) {
  const base = resolveApiBase()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  // 相对路径（无协议）：拼上当前页面的 ws 协议 + host
  if (!base || base.startsWith('/')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}${base}${normalizedPath}`
  }

  // 绝对路径（含协议）：http → ws，https → wss
  return `${base}${normalizedPath}`.replace(/^http/, 'ws')
}
