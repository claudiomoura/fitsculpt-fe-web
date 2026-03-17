import { redirect } from "next/navigation";

export default async function WorkoutDetailAliasPage(props: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = await props.params;
  redirect(`/app/training/${encodeURIComponent(workoutId)}`);
}
