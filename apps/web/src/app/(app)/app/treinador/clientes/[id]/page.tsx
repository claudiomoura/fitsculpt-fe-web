import { redirect } from "next/navigation";

type TreinadorClientePageProps = {
  params: Promise<{ id: string }>;
};

export default async function TreinadorClientePage({ params }: TreinadorClientePageProps) {
  const { id } = await params;
  redirect(`/app/trainer/clients/${id}`);
}
