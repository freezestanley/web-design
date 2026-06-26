export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen bg-mist text-ink">
      <section className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 py-16 text-center lg:px-10">
        <span className="w-fit rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">
          Access Restricted
        </span>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            抱歉您无权限查看当前页面
          </h1>
          <p className="max-w-xl text-sm leading-7 text-ink/65 sm:text-base">
            当前页面需要通过用户 SSO 鉴权验证。请确认访问身份后重新进入，或在项目中替换模板里的占位鉴权逻辑。
          </p>
        </div>
      </section>
    </main>
  );
}
