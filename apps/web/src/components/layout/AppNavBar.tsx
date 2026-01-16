"use client";

import { useState } from "react";
import Link from "next/link";
import LogoutButton from "@/app/(app)/app/LogoutButton";
import { copy } from "@/lib/i18n";
import AppUserBadge from "./AppUserBadge";

type NavLink = {
  href: string;
  label: string;
};

export default function AppNavBar() {
  const c = copy.es;
  const [open, setOpen] = useState(false);

  const navLinks: NavLink[] = [
    { href: "/app", label: c.nav.dashboard },
    { href: "/app/workouts", label: c.nav.workouts },
    { href: "/app/nutricion", label: c.nav.nutrition },
    { href: "/app/entrenamiento", label: c.nav.trainingPlan },
    { href: "/app/seguimiento", label: c.nav.tracking },
    { href: "/app/macros", label: c.nav.macros },
    { href: "/app/profile", label: c.nav.profile },
    { href: "/app/settings", label: c.nav.settings },
  ];

  const closeMenu = () => setOpen(false);

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
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link">
              {item.label}
            </Link>
          ))}
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
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="nav-drawer-link" onClick={closeMenu}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="nav-drawer-actions">
          <AppUserBadge />
          <LogoutButton />
        </div>
      </aside>
    </header>
  );
}
