import { redirect } from "next/navigation";

type TreinadorCatchAllPageProps = {
  params: Promise<{ slug: string[] }>;
};

const TRAINER_SEGMENT_ALIASES: Record<string, string> = {
  clientes: "clients",
  exercicios: "exercises",
  novo: "new",
  planos: "plans",
  solicitacoes: "requests",
};

export default async function TreinadorCatchAllPage({ params }: TreinadorCatchAllPageProps) {
  const { slug } = await params;
  const canonicalSegments = slug.map((segment) => TRAINER_SEGMENT_ALIASES[segment] ?? segment);

  redirect(`/app/trainer/${canonicalSegments.join("/")}`);
}
