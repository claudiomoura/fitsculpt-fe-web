"use client";

import { useEffect, useMemo, useState } from "react";
import { logoutAction } from "@/app/(auth)/login/actions";
import { useLanguage } from "@/context/LanguageProvider";
import { getUserProfile } from "@/lib/profileService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLink,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

type ProfileSummary = {
  name?: string;
  profilePhotoUrl?: string | null;
  avatarDataUrl?: string | null;
};

export default function AppUserBadge() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="nav-user">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="nav-avatar" src={avatarUrl} alt={t("nav.profile")} />
        ) : (
          <div className="nav-avatar nav-avatar-fallback" aria-hidden="true">
            {initials}
          </div>
        )}
        <span className="nav-user-name">{profile?.name || t("ui.userFallback")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="nav-user-dropdown">
        <DropdownMenuLink href="/app/profile" className="nav-user-link">
          {t("nav.profile")}
        </DropdownMenuLink>
        <DropdownMenuLink href="/app/settings" className="nav-user-link">
          {t("nav.settings")}
        </DropdownMenuLink>
        <DropdownMenuLink href="/app/settings/billing" className="nav-user-link">
          {t("nav.billing")}
        </DropdownMenuLink>
        <DropdownMenuSeparator />
        <form action={logoutAction} className="nav-user-logout">
          <button type="submit" className="nav-user-link ui-dropdown-item">
            {t("nav.logout")}
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
