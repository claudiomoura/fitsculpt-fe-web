import type { ReactNode } from "react";

type V0ScreenShellProps = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function V0ScreenShell({
  title,
  subtitle,
  actions,
  children,
}: V0ScreenShellProps) {
  return (
    <div className="min-h-[calc(100vh-64px)] w-full">
      {/* Fundo “v0-ish” */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
      <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6 md:py-8">
        {/* “Card” principal */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur md:p-8">
          {title ? (
            <header className="mb-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-2 text-sm text-white/70 md:text-base">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              {actions ? <div className="shrink-0">{actions}</div> : null}
            </header>
          ) : null}

          {/* Conteúdo real (lógica existente) */}
          <div className="space-y-6">{children}</div>
        </section>
      </div>
    </div>
  );
}
