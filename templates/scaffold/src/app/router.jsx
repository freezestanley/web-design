import { createBrowserRouter, Outlet } from 'react-router-dom'
import { useAuth } from '../shared/auth'
import UnauthorizedPage from '../pages/unauthorized'

/**
 * 路由守卫
 *
 * - 认证+权限校验完成前：显示全屏 loading
 * - 初始化失败会在 useAuth 内部跳转 SSO 登录，此处无需额外处理
 * - forbidden：已登录但无权访问本应用，渲染无权限页
 * - 通过：渲染子路由
 */
function ProtectedRoute() {
  const { isReady, forbidden, forbiddenReason } = useAuth()

  if (!isReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-mist">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
      </div>
    )
  }

  if (forbidden) {
    return <UnauthorizedPage reason={forbiddenReason} />
  }

  return <Outlet />
}

/**
 * clawmatic 部署时通过 index.html 注入 window.__BASENAME__，
 * 值为 /apps/:owner/:appName/（含尾斜杠）。
 *
 * React Router 的 basename 不含尾斜杠，需统一处理：
 *   '/apps/za/demo/' → '/apps/za/demo'
 *   undefined        → '/'（本地开发 fallback）
 *
 * 注意：不在模块顶层求值，改为工厂函数，由 App.jsx 在挂载时调用，
 * 确保 window.__BASENAME__ 已被宿主注入（内联同步脚本，先于 bundle 执行）。
 */
export function resolveBasename() {
  if (typeof window !== 'undefined' && window.__BASENAME__) {
    return window.__BASENAME__.replace(/\/$/, '') || '/'
  }
  return import.meta.env?.VITE_ROUTER_BASENAME || '/'
}

/**
 * 路由工厂函数，由 App.jsx 调用一次。
 * 不在模块顶层 createBrowserRouter，避免模块加载时 __BASENAME__ 尚未注入。
 */
export function createRouter() {
  return createBrowserRouter(
    [
      {
        // 所有需要登录的路由挂在这里
        element: <ProtectedRoute />,
        children: [
          {
            path: '/',
            element: <div>hi shanghai</div>,
          },
          // 在此添加更多受保护的路由
        ],
      },
    ],
    { basename: resolveBasename() }
  )
}
