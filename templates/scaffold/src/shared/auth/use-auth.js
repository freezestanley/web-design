import { useEffect, useState } from 'react'
import { getUrlParams, getSessionId, setSessionId, exchangeTicket } from './token'
import { getSsoUserInfo } from './sso-service'
import { navigateToLogin } from './login'
import { useUserStore } from '../stores/user-store'

// 开发预览旁路：仅在 .env.local 中设置 VITE_SSO_BYPASS=true 时生效
// 构建时 Vite 静态替换此常量，false 分支被 tree-shake，产物中无任何旁路代码
const BYPASS = import.meta.env.VITE_SSO_BYPASS === 'true'

// 模块级单例锁，保证整个应用生命周期只初始化一次
let _initializing = false
let _initialized = false

/**
 * SSO 认证初始化 hook
 *
 * 返回：
 *   isReady {boolean} - true 表示认证流程已完成（成功或已跳转登录）
 *   user    {object}  - SSO userinfo 接口返回的用户信息，未登录时为 null
 *
 * 用法：
 *   const { isReady, user } = useAuth()
 *   if (!isReady) return <Loading />
 */
export function useAuth() {
  const [isReady, setIsReady] = useState(BYPASS || _initialized)
  const setUser = useUserStore((s) => s.setUser)
  const user = useUserStore((s) => s.user)

  useEffect(() => {
    if (BYPASS) {
      // bypass 模式：注入占位用户，跳过所有 SSO 请求
      setUser({ name: 'Dev Preview', account: 'dev' })
      setIsReady(true)
      return
    }

    if (_initialized) {
      setIsReady(true)
      return
    }

    if (_initializing) return

    _initializing = true

    ;(async () => {
      try {
        const { ticket, token } = getUrlParams()

        if (token) {
          // 直接传入 sessionId（内嵌/跳转场景）
          setSessionId(token)
        } else if (ticket) {
          // 标准 SSO 回调，用 ticket 换 sessionId
          await exchangeTicket(ticket)
        } else if (!getSessionId()) {
          // 既无 token/ticket，本地也无 session，跳登录
          navigateToLogin()
          return
        }

        // 拉取用户信息
        const data = await getSsoUserInfo()
        setUser(data?.result ?? null)
      } catch (err) {
        console.error('[auth] init error:', err)
        // 认证异常，清除并重新登录
        navigateToLogin()
        return
      } finally {
        _initialized = true
        _initializing = false
        setIsReady(true)
      }
    })()
  }, [])

  return { isReady, user }
}
