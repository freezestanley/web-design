import { useAppStore } from "../../stores/app-store";

const sections = [
  "需求确认",
  "设计方案",
  "静态审计",
  "发布交付"
];

export default function HomePage() {
  const projectName = useAppStore((state) => state.projectName);

  return (
    <main className="min-h-screen bg-mist text-ink">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:px-10">
        <div className="flex max-w-3xl flex-col gap-4">
          <span className="w-fit rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">
            Web Design Scaffold
          </span>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {projectName}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-ink/72 sm:text-lg">
            A clean React scaffold for the web-design SOP. Replace this page with
            the confirmed design, route structure, motion system, and real SSO
            validation for the task.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section, index) => (
            <article
              key={section}
              className="rounded-3xl bg-white p-6 shadow-panel ring-1 ring-ink/5"
            >
              <p className="text-sm font-medium text-ink/45">0{index + 1}</p>
              <h2 className="mt-4 text-xl font-semibold">{section}</h2>
              <p className="mt-3 text-sm leading-6 text-ink/65">
                Use this slot as a starting point for real task content instead of
                placeholder marketing blocks.
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
