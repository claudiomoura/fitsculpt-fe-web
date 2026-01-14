import WorkoutsClient from "./WorkoutsClient";

export default function WorkoutsPage() {
  return (
    <section>
      <h1>Workouts</h1>
      <p style={{ marginTop: 6 }}>CRUD local, guarda no browser.</p>

      <div style={{ marginTop: 16 }}>
        <WorkoutsClient />
      </div>
    </section>
  );
}
