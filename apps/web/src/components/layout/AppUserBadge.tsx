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

type AppUserBadgeProps = {
  mobileMenuOpen?: boolean;
  onMobileMenuOpen?: () => void;
};

export default function AppUserBadge({
  mobileMenuOpen = false,
  onMobileMenuOpen,
}: AppUserBadgeProps) {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 900px)").matches;
  });

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
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
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

  const badgeContent = (
    <>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="nav-avatar" src={avatarUrl} alt={t("nav.profile")} />
      ) : (
        <div className="nav-avatar nav-avatar-fallback" aria-hidden="true">
          {initials}
        </div>
      )}
      <span className="nav-user-name">
        {profile?.name || t("ui.userFallback")}
      </span>
    </>
  );

  if (isMobileViewport && onMobileMenuOpen) {
    return (
      <button
        type="button"
        className="ui-button ui-button--ghost nav-user"
        aria-expanded={mobileMenuOpen}
        aria-controls="app-nav-drawer"
        aria-label={t("ui.menu")}
        onClick={onMobileMenuOpen}
      >
        {badgeContent}
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="nav-user">
        {badgeContent}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="nav-user-dropdown">
        <DropdownMenuLink href="/app/profile" className="nav-user-link">
          {t("nav.profile")}
        </DropdownMenuLink>
        <DropdownMenuLink href="/app/settings" className="nav-user-link">
          {t("nav.settings")}
        </DropdownMenuLink>
        <DropdownMenuLink
          href="/app/settings/billing"
          className="nav-user-link"
        >
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
