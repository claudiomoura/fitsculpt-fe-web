"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { logoutAction } from "@/app/(auth)/login/actions";
import { useLanguage } from "@/context/LanguageProvider";
import { getUserProfile } from "@/lib/profileService";

type ProfileSummary = {
  name?: string;
  profilePhotoUrl?: string | null;
  avatarDataUrl?: string | null;
};

type MenuPosition = {
  top: number;
  left: number;
};

const MENU_OFFSET = 8;
const VIEWPORT_PADDING = 12;

export default function AppUserBadge() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const data = await getUserProfile();
        if (active) {
          setProfile({
            name: data.name,
            profilePhotoUrl: data.profilePhotoUrl,
            avatarDataUrl: data.avatarDataUrl,
          });
        }
      } catch {
        // Ignore fetch errors.
      }
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = menu.offsetWidth;
      const menuHeight = menu.offsetHeight;

      let left = rect.right - menuWidth;
      if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
      if (left + menuWidth > window.innerWidth - VIEWPORT_PADDING) {
        left = window.innerWidth - VIEWPORT_PADDING - menuWidth;
      }

      let top = rect.bottom + MENU_OFFSET;
      const fitsBelow = top + menuHeight <= window.innerHeight - VIEWPORT_PADDING;
      const above = rect.top - MENU_OFFSET - menuHeight;
      if (!fitsBelow && above >= VIEWPORT_PADDING) {
        top = above;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  const avatarUrl = profile?.profilePhotoUrl ?? profile?.avatarDataUrl ?? null;
  const initials = useMemo(() => {
    const name = profile?.name?.trim();
    if (!name) return "FS";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [profile?.name]);

  const menu = open ? (
    <div
      ref={menuRef}
      className="nav-user-dropdown"
      role="menu"
      style={{ position: "fixed", top: position.top, left: position.left }}
    >
      <Link href="/app/profile" className="nav-user-link" role="menuitem" onClick={() => setOpen(false)}>
        {t("nav.profile")}
      </Link>
      <Link href="/app/settings" className="nav-user-link" role="menuitem" onClick={() => setOpen(false)}>
        {t("nav.settings")}
      </Link>
      <div className="nav-user-divider" role="presentation" />
      <form action={logoutAction} className="nav-user-logout">
        <button type="submit" className="nav-user-link">
          {t("nav.logout")}
        </button>
      </form>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="nav-user"
        aria-label={profile?.name || t("ui.userFallback")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {avatarUrl ? (
          <img className="nav-avatar" src={avatarUrl} alt={t("nav.profile")} />
        ) : (
          <div className="nav-avatar nav-avatar-fallback" aria-hidden="true">
            {initials}
          </div>
        )}
        <span className="nav-user-name">{profile?.name || t("ui.userFallback")}</span>
      </button>
      {typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </>
  );
}
