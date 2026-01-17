"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LogoutButton from "@/app/(app)/app/LogoutButton";
import { copy } from "@/lib/i18n";
import { getUserProfile } from "@/lib/profileService";

type ProfileSummary = {
  name?: string;
  profilePhotoUrl?: string | null;
  avatarDataUrl?: string | null;
};

export default function AppUserBadge() {
  const c = copy.es;
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const avatarUrl = profile?.profilePhotoUrl ?? profile?.avatarDataUrl ?? null;
  const initials = profile?.name
    ? profile.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "FS";

  return (
    <div className="nav-user-menu" ref={menuRef}>
      <button
        type="button"
        className="nav-user"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {avatarUrl ? (
          <img className="nav-avatar" src={avatarUrl} alt="Avatar de perfil" />
        ) : (
          <div className="nav-avatar nav-avatar-fallback" aria-hidden="true">
            {initials}
          </div>
        )}
        <span className="nav-user-name">{profile?.name || "FitSculpt"}</span>
      </button>

      <div className={`nav-user-dropdown ${open ? "is-open" : ""}`} role="menu">
        <Link href="/app/profile" role="menuitem" className="nav-user-link" onClick={() => setOpen(false)}>
          {c.nav.profile}
        </Link>
        <Link href="/app/settings" role="menuitem" className="nav-user-link" onClick={() => setOpen(false)}>
          {c.nav.settings}
        </Link>
        <div className="nav-user-divider" role="presentation" />
        <div className="nav-user-logout">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
