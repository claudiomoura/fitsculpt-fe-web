import Link from "next/link";
import { getServerT } from "@/lib/serverI18n";

type LibraryTabsProps = {
  active: "exercises" | "recipes" | "training" | "nutritionPlans";
  libraryType: "fitness" | "nutrition";
};

export default async function LibraryTabs({ active, libraryType }: LibraryTabsProps) {
  const { t } = await getServerT();

  const tabs =
    libraryType === "fitness"
      ? [
          { id: "exercises", href: "/app/biblioteca", label: t("library.tabs.exercises") },
          { id: "training", href: "/app/biblioteca/entrenamientos", label: t("library.tabs.training") },
        ]
      : [
          { id: "recipes", href: "/app/biblioteca/recetas", label: t("library.tabs.recipes") },
          { id: "nutritionPlans", href: "/app/dietas", label: t("nav.nutritionPlans") },
        ];

  return (
    <div className="segmented-control library-tabs" role="tablist">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`segmented-control-btn ${active === tab.id ? "active" : ""}`}
          aria-current={active === tab.id ? "page" : undefined}
          role="tab"
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
