"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/app/(auth)/login/actions";
import { useLanguage } from "@/context/LanguageProvider";
import { getUserProfile } from "@/lib/profileService";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";

type ProfileSummary = {
  name?: string;
  profilePhotoUrl?: string | null;
  avatarDataUrl?: string | null;
};

export default function AppUserBadge() {
  const { t } = useLanguage();
  const router = useRouter();
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
        <DropdownMenuItem className="nav-user-link" onClick={() => router.push("/app/profile")}>
          {t("nav.profile")}
        </DropdownMenuItem>
        <DropdownMenuItem className="nav-user-link" onClick={() => router.push("/app/settings")}>
          {t("nav.settings")}
        </DropdownMenuItem>
        <DropdownMenuItem className="nav-user-link" onClick={() => router.push("/app/settings/billing")}>
          {t("nav.billing")}
        </DropdownMenuItem>
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
