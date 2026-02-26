"use client";

import { useMemo } from "react";
import { logoutAction } from "@/app/(auth)/login/actions";
import { useLanguage } from "@/context/LanguageProvider";
import type { AuthMePayload } from "@/lib/entitlements";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLink,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

type AppUserBadgeProps = {
  user: AuthMePayload | null;
};

export default function AppUserBadge({ user }: AppUserBadgeProps) {
  const { t } = useLanguage();

  const avatarUrl = user?.imageUrl ?? user?.avatarUrl ?? user?.profilePhotoUrl ?? user?.avatarDataUrl ?? null;
  const initials = useMemo(() => {
    const name = user?.name?.trim();
    if (!name) return "FS";
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [user?.name]);

  const displayName = user?.name || user?.email || t("ui.userFallback");

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
        <span className="nav-user-name">{displayName}</span>
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
