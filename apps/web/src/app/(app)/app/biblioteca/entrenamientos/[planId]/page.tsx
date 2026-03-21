import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ planId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toQueryString(params?: Record<string, string | string[] | undefined>) {
  if (!params) return "";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((item) => query.append(key, item));
      continue;
    }
    if (value) query.set(key, value);
  }
  const built = query.toString();
  return built ? `?${built}` : "";
}

export default async function LegacyTrainingPlanDetailRoute({ params, searchParams }: Props) {
  const { planId } = await params;
  const query = toQueryString(searchParams ? await searchParams : undefined);
  redirect(`/app/biblioteca/planes-entrenamiento/${encodeURIComponent(planId)}${query}`);
}
