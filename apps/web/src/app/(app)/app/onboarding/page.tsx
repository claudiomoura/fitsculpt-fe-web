import OnboardingClient from "./OnboardingClient";

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function OnboardingPage({ searchParams }: Props) {
  const nextUrl = typeof searchParams?.next === "string" ? searchParams.next : undefined;
  const ai = typeof searchParams?.ai === "string" ? searchParams.ai : undefined;

  return <OnboardingClient nextUrl={nextUrl} ai={ai} />;
}
