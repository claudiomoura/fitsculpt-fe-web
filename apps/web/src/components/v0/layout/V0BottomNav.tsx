import Link from "next/link";
import type { V0NavItem } from "./v0-nav.types";

type V0BottomNavProps = {
  items: V0NavItem[];
};

export function V0BottomNav({ items }: V0BottomNavProps) {
  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] gap-1">
        {items.map((item) => (
          <li key={`${item.href}-${item.label}`}>
            <Link
              href={item.href}
              className={[
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-center text-xs",
                item.active
                  ? "bg-cyan-400/20 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              {item.icon ? <span aria-hidden="true" className="text-sm">{item.icon}</span> : null}
              <span className="truncate font-medium">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
