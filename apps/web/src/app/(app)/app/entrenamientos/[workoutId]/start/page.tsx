import { redirect } from "next/navigation";

export default async function WorkoutStartAliasPage(props: { params: Promise<{ workoutId: string }> }) {
  const { workoutId } = await props.params;
  redirect(`/app/training/${encodeURIComponent(workoutId)}/start`);
}
