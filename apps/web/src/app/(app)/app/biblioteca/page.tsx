import { V0LibraryShell } from "@/components/v0";
import { getServerT } from "@/lib/serverI18n";
import ExerciseLibraryClient from "./ExerciseLibraryClient";
import LibraryTabs from "./LibraryTabs";

export default async function ExerciseLibraryPage() {
  const { t } = await getServerT();

  return (
    <V0LibraryShell
      title={t("app.libraryTitle")}
      subtitle={t("app.librarySubtitle")}
      actions={<LibraryTabs active="exercises" libraryType="fitness" />}
    >
      <ExerciseLibraryClient />
    </V0LibraryShell>
  );
}
