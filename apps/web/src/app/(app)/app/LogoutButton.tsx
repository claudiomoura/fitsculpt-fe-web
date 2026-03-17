"use client";

import { logoutAction } from "../../(auth)/login/actions";
import { useLanguage } from "@/context/LanguageProvider";

type LogoutButtonProps = {
  className?: string;
  label?: string;
};

export default function LogoutButton({ className, label }: LogoutButtonProps) {
  const { t } = useLanguage();
  return (
    <form action={logoutAction}>
      <button type="submit" className={className ?? "btn secondary"}>
        {label ?? t("nav.logout")}
      </button>
    </form>
  );
}
