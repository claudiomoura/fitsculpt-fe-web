import Link from "next/link";
import { getServerT } from "@/lib/serverI18n";

type LibraryTabsProps = {
  active: "exercises" | "recipes" | "training";
};

export default async function LibraryTabs({ active }: LibraryTabsProps) {
  const { t } = await getServerT();
  return (
    <div className="segmented-control library-tabs" role="tablist">
      <Link
        href="/app/biblioteca"
        className={`segmented-control-btn ${active === "exercises" ? "active" : ""}`}
        aria-current={active === "exercises" ? "page" : undefined}
        role="tab"
      >
        {t("library.tabs.exercises")}
      </Link>
      <Link
        href="/app/biblioteca/recetas"
        className={`segmented-control-btn ${active === "recipes" ? "active" : ""}`}
        aria-current={active === "recipes" ? "page" : undefined}
        role="tab"
      >
        {t("library.tabs.recipes")}
      </Link>
      <Link
        href="/app/biblioteca/entrenamientos"
        className={`segmented-control-btn ${active === "training" ? "active" : ""}`}
        aria-current={active === "training" ? "page" : undefined}
        role="tab"
      >
        {t("library.tabs.training")}
      </Link>
    </div>
  );
}
