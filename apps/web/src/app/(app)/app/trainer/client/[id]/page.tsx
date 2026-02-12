import { redirect } from "next/navigation";

type TrainerClientLegacyPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TrainerClientLegacyPage({ params }: TrainerClientLegacyPageProps) {
  const { id } = await params;
  redirect(`/app/trainer/clients/${id}`);
}
