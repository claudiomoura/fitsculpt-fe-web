import { ErrorBlock } from "@/design-system";
import { getServerT } from "@/lib/serverI18n";
import WorkoutSessionClient from "./workoutSessionClient";

export default async function WorkoutSessionPage(props: { params: Promise<{ workoutId: string }> }) {
  const { t } = await getServerT();
  const { workoutId } = await props.params;

  if (!workoutId) {
    return <ErrorBlock title={t("workoutDetail.notFound")} description={t("workoutDetail.notFound")} />;
  }

  return <WorkoutSessionClient workoutId={workoutId} />;
}
