import { redirect } from "next/navigation";

type Props = {
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

export default async function LegacyNutritionRoute({ searchParams }: Props) {
  const params = searchParams ? await searchParams : undefined;
  redirect(`/app/nutricion${toQueryString(params)}`);
}
