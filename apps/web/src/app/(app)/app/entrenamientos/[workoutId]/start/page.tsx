import WorkoutSessionClient from "./workoutSessionClient";
import { getServerT } from "@/lib/serverI18n";

export default async function WorkoutSessionPage(props: { params: Promise<{ workoutId: string }> }) {
  const { t } = await getServerT();
  const { workoutId } = await props.params;
  if (!workoutId) {
    return (
      <div className="page">
        <section className="card" style={{ maxWidth: 960, margin: "0 auto" }}>
          <p className="muted">{t("workoutDetail.notFound")}</p>
        </section>
      </div>
    );
  }
  return (
    <div className="page">
      <WorkoutSessionClient workoutId={workoutId} />
    </div>
  );
}
