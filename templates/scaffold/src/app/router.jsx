import { createBrowserRouter, Outlet } from 'react-router-dom'
import { useAuth } from '../shared/auth'
import HomePage from '../pages/home'

/**
 * 路由守卫
 *
 * - 认证初始化完成前：显示全屏 loading
 * - 初始化失败会在 useAuth 内部跳转 SSO 登录，此处无需额外处理
 * - 初始化成功：渲染子路由
 */
function ProtectedRoute() {
  const { isReady } = useAuth()

  if (!isReady) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-mist">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
      </div>
    )
  }

  return <Outlet />
}

export const router = createBrowserRouter([
  {
    // 所有需要登录的路由挂在这里
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      // 在此添加更多受保护的路由
    ],
  },
])
