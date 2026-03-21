import { redirect } from "next/navigation";

function buildSearch(searchParams: Record<string, string | string[] | undefined> | undefined) {
  const params = new URLSearchParams();
  if (!searchParams) return params.toString();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === "string") {
      params.set(key, value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => params.append(key, entry));
    }
  });

  return params.toString();
}

export default async function DietPlansLegacyPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = buildSearch(await props.searchParams);
  redirect(`/app/biblioteca/planes-nutricion${search ? `?${search}` : ""}`);
}
