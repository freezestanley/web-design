import { useEffect, useState } from 'react'
import { getUrlParams, getSessionId, setSessionId, exchangeTicket } from './token'
import { getSsoUserInfo, checkAppPermission } from './sso-service'
import { navigateToLogin } from './login'
import { useUserStore } from '../stores/user-store'

// 开发预览旁路：仅在 .env.local 中设置 VITE_SSO_BYPASS=true 时生效
// 构建时 Vite 静态替换此常量，false 分支被 tree-shake，产物中无任何旁路代码
const BYPASS = import.meta.env.VITE_SSO_BYPASS === 'true'

// 模块级单例锁，保证整个应用生命周期只初始化一次
let _initializing = false
let _initialized = false

/**
 * SSO 认证 + 应用权限校验 hook
 *
 * 流程：
 *   1. SSO 认证（ticket/token 兑换、userinfo 获取）
 *   2. 调用权限接口校验当前账号是否有权访问本应用
 *   3. 无权限时设置 forbidden 状态，由 ProtectedRoute 渲染无权限页
 *
 * 返回：
 *   isReady   {boolean} - true 表示认证+权限校验均已完成
 *   user      {object}  - SSO userinfo 中的用户信息，未登录时为 null
 *   forbidden {boolean} - true 表示已登录但无权访问本应用
 *   forbiddenReason {'offline'|'no_permission'|null} - 无权原因
 *
 * 用法：
 *   const { isReady, user, forbidden, forbiddenReason } = useAuth()
 *   if (!isReady) return <Loading />
 *   if (forbidden) return <UnauthorizedPage reason={forbiddenReason} />
 */
export function useAuth() {
  const [isReady, setIsReady] = useState(BYPASS || _initialized)
  const [forbidden, setForbidden] = useState(false)
  const [forbiddenReason, setForbiddenReason] = useState(null)
  const setUser = useUserStore((s) => s.setUser)
  const user = useUserStore((s) => s.user)

  useEffect(() => {
    if (BYPASS) {
      // bypass 模式：注入占位用户，跳过所有鉴权（含权限校验）
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
          setSessionId(token)
        } else if (ticket) {
          await exchangeTicket(ticket)
        } else if (!getSessionId()) {
          navigateToLogin()
          return
        }

        // Step 1：获取用户信息
        const data = await getSsoUserInfo()
        const userData = data?.result ?? null
        setUser(userData)

        // Step 2：权限校验（account 取 SSO userinfo 的 account 字段）
        const account = userData?.account
        if (account) {
          const { allowed, reason } = await checkAppPermission(account)
          if (!allowed) {
            setForbidden(true)
            setForbiddenReason(reason)
          }
        }
      } catch (err) {
        console.error('[auth] init error:', err)
        navigateToLogin()
        return
      } finally {
        _initialized = true
        _initializing = false
        setIsReady(true)
      }
    })()
  }, [])

  return { isReady, user, forbidden, forbiddenReason }
}
