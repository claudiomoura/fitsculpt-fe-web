import { cookies } from "next/headers";
import { LegalPageShell } from "@/components/marketing/LegalPageShell";
import { resolveLocale } from "@/lib/i18n";

export default async function TermsPage() {
  const locale = resolveLocale((await cookies()).get("fs-locale")?.value ?? null);
  const localeNote =
    locale === "es" ? undefined : "Este documento legal se mantiene en espanol como version operativa principal por ahora.";

  return (
    <LegalPageShell
      title="Terminos del Servicio"
      effectiveDate="2026-05-06"
      localeNote={localeNote}
      sections={[
        {
          title: "1. Alcance del servicio",
          body: (
            <p>
              FitSculpt es una app de coaching digital para entrenamiento y nutricion. El contenido y las recomendaciones son de apoyo informativo y no sustituyen
              consejo medico profesional.
            </p>
          ),
        },
        {
          title: "2. Cuenta y acceso",
          body: (
            <ul>
              <li>Debes proporcionar datos de registro validos y mantener tus credenciales seguras.</li>
              <li>Eres responsable de la actividad realizada desde tu cuenta.</li>
              <li>Podemos suspender acceso por uso fraudulento, abuso tecnico o incumplimiento de estos terminos.</li>
            </ul>
          ),
        },
        {
          title: "3. Uso adecuado",
          body: (
            <ul>
              <li>No intentar romper, extraer o degradar la plataforma.</li>
              <li>No usar la app para actividades ilegales ni para publicar contenido ofensivo o danino.</li>
              <li>No revender ni sublicenciar el acceso sin autorizacion.</li>
            </ul>
          ),
        },
        {
          title: "4. Salud y responsabilidad",
          body: (
            <p>
              Antes de iniciar cambios relevantes en entrenamiento o nutricion, considera consultar con profesionales de salud. Debes adaptar la carga y alimentacion
              a tus condiciones personales. FitSculpt no garantiza resultados identicos entre usuarios.
            </p>
          ),
        },
        {
          title: "5. Propiedad intelectual",
          body: (
            <p>
              La marca, interfaz, contenido y tecnologia de FitSculpt estan protegidos por derechos de propiedad intelectual. Se concede una licencia limitada de uso
              personal mientras la cuenta este activa y en cumplimiento de estos terminos.
            </p>
          ),
        },
        {
          title: "6. Cambios del servicio y terminos",
          body: (
            <p>
              Podemos actualizar funciones, precios o terminos por motivos operativos, legales o de producto. Publicaremos la version vigente en esta pagina con fecha
              de actualizacion.
            </p>
          ),
        },
      ]}
    />
  );
}
