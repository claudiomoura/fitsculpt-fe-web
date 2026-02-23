import TrainerPlanDetailClient from "@/components/trainer-plans/TrainerPlanDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TrainerPlanDetailPage({ params }: Props) {
  const { id } = await params;
  return <TrainerPlanDetailClient planId={id} />;
}
