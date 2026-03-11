import Link from "next/link";
import type { V0NavItem } from "./v0-nav.types";

type V0DesktopSidebarProps = {
  items: V0NavItem[];
  moreItems?: V0NavItem[];
  brand?: string;
};

export function V0DesktopSidebar({
  items,
  moreItems = [],
  brand = "Fit Sculpt",
}: V0DesktopSidebarProps) {
  return (
    <aside className="hidden h-full w-full max-w-[260px] flex-col rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-xl backdrop-blur md:flex">
      <div className="mb-6 px-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/80">
          {brand}
        </p>
      </div>

      <nav aria-label="Desktop navigation" className="flex flex-col gap-1">
        {items.map((item) => (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className={[
              "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
              item.active
                ? "bg-cyan-400/20 text-white"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            {item.icon ? (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-100 group-hover:bg-white/10">
                {item.icon}
              </span>
            ) : null}
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {moreItems.length ? (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            Más
          </p>
          <nav aria-label="More navigation" className="flex flex-col gap-1">
            {moreItems.map((item) => (
              <Link
                key={`more-${item.href}-${item.label}`}
                href={item.href}
                className={[
                  "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                  item.active
                    ? "bg-cyan-400/20 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </aside>
  );
}
