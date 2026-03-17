import GymJoinRequestsManager from "@/components/admin/GymJoinRequestsManager";
import TrainerAdminNoGymPanel from "@/components/trainer/TrainerAdminNoGymPanel";

export default async function AdminGymRequestsPage() {
  return (
    <div className="page form-stack">
      <section className="card form-stack">
        <h1 className="section-title">Gym join requests</h1>
        <p className="section-subtitle">Approve or reject pending requests and inspect members by gym.</p>
        <GymJoinRequestsManager />
      </section>

      <TrainerAdminNoGymPanel />
    </div>
  );
}
