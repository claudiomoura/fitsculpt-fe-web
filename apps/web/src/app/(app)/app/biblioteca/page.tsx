import { copy } from "@/lib/i18n";
import ExerciseLibraryClient from "./ExerciseLibraryClient";

export default function ExerciseLibraryPage() {
  const c = copy.es;
  return (
    <div className="page">
      <section className="card">
        <h1 className="section-title">{c.app.libraryTitle}</h1>
        <p className="section-subtitle">{c.app.librarySubtitle}</p>
      </section>
      <ExerciseLibraryClient />
    </div>
  );
}
