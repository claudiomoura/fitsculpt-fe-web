"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/app/(app)/app/LogoutButton";
import { copy } from "@/lib/i18n";
import AppUserBadge from "./AppUserBadge";

type NavLink = {
  href: string;
  label: string;
};

export default function AppNavBar() {
  const c = copy.es;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { role?: string };
        if (active) setIsAdmin(data.role === "ADMIN");
      } catch {
        // Ignore.
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const navLinks: NavLink[] = [
    { href: "/app", label: c.nav.dashboard },
    { href: "/app/workouts", label: c.nav.workouts },
    { href: "/app/nutricion", label: c.nav.nutrition },
    { href: "/app/entrenamiento", label: c.nav.trainingPlan },
    { href: "/app/seguimiento", label: c.nav.tracking },
    { href: "/app/macros", label: c.nav.macros },
    { href: "/app/biblioteca", label: c.nav.library },
    ...(isAdmin ? [{ href: "/app/admin", label: c.nav.admin }] : []),
    { href: "/app/profile", label: c.nav.profile },
    { href: "/app/settings", label: c.nav.settings },
  ];

  const closeMenu = () => setOpen(false);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/app") return pathname === "/app";
    return pathname.startsWith(href);
  };

  return (
    <header className="site-header">
      <div className="nav-inner">
        <div className="nav-brand-row">
          <Link href="/" className="nav-brand">
            {c.appName}
          </Link>
          <button
            type="button"
            className="nav-toggle"
            aria-expanded={open}
            aria-controls="app-nav-drawer"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? "Cerrar" : "Menú"}
          </button>
        </div>

        <nav className="nav-links" aria-label="Navegación principal">
          {navLinks.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="nav-actions">
          <AppUserBadge />
          <LogoutButton />
        </div>
      </div>

      <div
        className={`nav-drawer-backdrop ${open ? "is-open" : ""}`}
        role="presentation"
        onClick={closeMenu}
      />
      <aside
        id="app-nav-drawer"
        className={`nav-drawer ${open ? "is-open" : ""}`}
        aria-hidden={!open}
      >
        <div className="nav-drawer-header">
          <span>{c.appName}</span>
          <button type="button" className="nav-toggle" onClick={closeMenu}>
            Cerrar
          </button>
        </div>
        <div className="nav-drawer-links">
          {navLinks.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-drawer-link ${active ? "is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="nav-drawer-actions">
          <AppUserBadge />
          <LogoutButton />
        </div>
      </aside>
    </header>
  );
}
