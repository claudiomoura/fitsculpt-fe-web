"use client";

import { logoutAction } from "../../(auth)/login/actions";
import { useLanguage } from "@/context/LanguageProvider";

export default function LogoutButton() {
  const { t } = useLanguage();
  return (
    <form action={logoutAction}>
      <button type="submit" className="btn secondary">
        {t("nav.logout")}
      </button>
    </form>
  );
}
