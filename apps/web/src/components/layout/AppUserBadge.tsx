"use client";

import { useEffect, useState } from "react";

type ProfileSummary = {
  name?: string;
  avatarDataUrl?: string | null;
};

export default function AppUserBadge() {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as ProfileSummary | null;
        if (active && data) {
          setProfile(data);
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

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("")
    : "FS";

  return (
    <div className="nav-user" aria-label="Usuario activo">
      {profile?.avatarDataUrl ? (
        <img className="nav-avatar" src={profile.avatarDataUrl} alt="Avatar de perfil" />
      ) : (
        <div className="nav-avatar nav-avatar-fallback" aria-hidden="true">
          {initials}
        </div>
      )}
      <span className="nav-user-name">{profile?.name || "FitSculpt"}</span>
    </div>
  );
}
