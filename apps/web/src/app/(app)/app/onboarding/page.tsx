import OnboardingClient from "./OnboardingClient";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OnboardingPage({ searchParams }: Props) {
  const resolved = await searchParams;
  const nextUrl = typeof resolved?.next === "string" ? resolved.next : undefined;
  const ai = typeof resolved?.ai === "string" ? resolved.ai : undefined;

  return <OnboardingClient nextUrl={nextUrl} ai={ai} />;
}
