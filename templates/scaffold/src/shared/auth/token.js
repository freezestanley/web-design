import Cookies from 'js-cookie'
import { getSsoSessionIdByTicket } from './sso-service'

export const SESSION_KEY = 'session_id'
export const UNSAFE_SESSION_KEY = 'unsafeSessionId'

const SESSION_OPTIONS = { sameSite: 'None', secure: true }

/**
 * 读取本地 sessionId（优先级：localStorage > secure cookie > unsafe cookie）
 */
export function getSessionId() {
  return (
    localStorage.getItem(SESSION_KEY) ||
    Cookies.get(SESSION_KEY) ||
    Cookies.get(UNSAFE_SESSION_KEY) ||
    ''
  )
}

/**
 * 将 sessionId 写入三处存储
 */
export function setSessionId(sessionId) {
  try {
    Cookies.set(SESSION_KEY, sessionId, SESSION_OPTIONS)
    Cookies.set(UNSAFE_SESSION_KEY, sessionId)
    localStorage.setItem(SESSION_KEY, sessionId)
  } catch (error) {
    console.error('[auth] setSessionId error:', error)
  }
}

/**
 * 清除所有本地 session 存储
 */
export function clearSessionId() {
  localStorage.removeItem(SESSION_KEY)
  Cookies.remove(SESSION_KEY)
  Cookies.remove(UNSAFE_SESSION_KEY)
}

/**
 * 用 ticket 换取 sessionId 并存储，同时清理 URL 中的 ticket 参数
 */
export async function exchangeTicket(ticket) {
  const res = await getSsoSessionIdByTicket(ticket)
  const sessionId = res?.result
  if (!sessionId) throw new Error('[auth] ticket exchange failed')
  setSessionId(sessionId)
  // 清理 URL 中的 ticket 参数，避免刷新重复兑换
  const url = new URL(window.location.href)
  url.searchParams.delete('ticket')
  history.replaceState({ ok: true }, document.title, url.toString())
}

/**
 * 读取当前 URL 中的 query 参数
 */
export function getUrlParams() {
  const params = {}
  new URLSearchParams(window.location.search).forEach((v, k) => {
    params[k] = v
  })
  return params
}
