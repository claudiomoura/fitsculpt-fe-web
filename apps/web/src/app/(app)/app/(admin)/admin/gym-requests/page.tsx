import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { readSessionRole } from "@/lib/auth/sessionRole";

export default async function AdminGymRequestsPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const token = (await cookies()).get("fs_token")?.value;
  const sessionRole = token ? readSessionRole(token) : "UNKNOWN";

  if (sessionRole !== "ADMIN") {
    notFound();
  }

  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">Gym requests</h1>
        <p className="section-subtitle">No disponible en este entorno.</p>
      </section>
    </div>
  );
}
