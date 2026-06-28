/**
 * 无权限页
 *
 * reason 来自 useAuth 的 forbiddenReason：
 *   'offline'      - 应用已下线
 *   'no_permission' - 账号不在权限范围内
 *   null           - 未知原因（兜底）
 */
export default function UnauthorizedPage({ reason }) {
  const isOffline = reason === 'offline'

  return (
    <main className="min-h-screen bg-mist text-ink">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 py-16 text-center lg:px-10">
        <span className="w-fit rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">
          {isOffline ? 'App Offline' : 'Access Restricted'}
        </span>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {isOffline ? '应用暂时下线' : '抱歉您无权限查看当前页面'}
          </h1>
          <p className="max-w-xl text-sm leading-7 text-ink/65 sm:text-base">
            {isOffline
              ? '当前应用已下线，请联系应用管理员了解详情。'
              : '您的账号暂无访问此应用的权限，请联系应用管理员申请权限。'}
          </p>
        </div>
      </section>
    </main>
  )
}
