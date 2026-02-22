import { redirect } from "next/navigation";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toQueryString(params?: Record<string, string | string[] | undefined>) {
  if (!params) return "";
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) query.append(key, item);
      });
      return;
    }

    if (value) {
      query.set(key, value);
    }
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export default async function WorkoutsPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : undefined;
  redirect(`/app/entrenamiento${toQueryString(params)}`);
}
