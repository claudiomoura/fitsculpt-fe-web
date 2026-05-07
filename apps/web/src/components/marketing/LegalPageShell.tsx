import type { ReactNode } from "react";

type LegalSection = {
  title: string;
  body: ReactNode;
};

export function LegalPageShell({
  title,
  effectiveDate,
  localeNote,
  sections,
}: {
  title: string;
  effectiveDate: string;
  localeNote?: string;
  sections: LegalSection[];
}) {
  return (
    <main className="legal-page">
      <div className="legal-page__container">
        <header className="legal-page__header">
          <h1>{title}</h1>
          <p>Fecha de vigencia: {effectiveDate}</p>
          {localeNote ? <small>{localeNote}</small> : null}
        </header>

        <div className="legal-page__content">
          {sections.map((section) => (
            <section key={section.title} className="legal-page__section" aria-label={section.title}>
              <h2>{section.title}</h2>
              <div>{section.body}</div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
