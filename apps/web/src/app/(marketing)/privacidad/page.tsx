import { cookies } from "next/headers";
import { LegalPageShell } from "@/components/marketing/LegalPageShell";
import { resolveLocale } from "@/lib/i18n";

export default async function PrivacyPage() {
  const locale = resolveLocale((await cookies()).get("fs-locale")?.value ?? null);
  const localeNote =
    locale === "es" ? undefined : "Este documento legal se mantiene en espanol como version operativa principal por ahora.";

  return (
    <LegalPageShell
      title="Politica de Privacidad"
      effectiveDate="2026-05-06"
      localeNote={localeNote}
      sections={[
        {
          title: "1. Datos que procesa FitSculpt",
          body: (
            <ul>
              <li>Datos de cuenta: correo, idioma y configuracion basica.</li>
              <li>Datos de uso: eventos funcionales para mejorar rendimiento y experiencia.</li>
              <li>Datos de coaching: registros de entrenamiento, nutricion, peso, notas y check-ins.</li>
              <li>Contexto corporal: metricas y entradas de body scan que el usuario decida cargar.</li>
              <li>Senales pasivas opcionales: actividad desde Health Connect en Android, solo si el usuario habilita permisos.</li>
            </ul>
          ),
        },
        {
          title: "2. Finalidades",
          body: (
            <ul>
              <li>Personalizar planes de entrenamiento y nutricion dentro de la app.</li>
              <li>Generar revisiones semanales y recomendaciones de ajuste.</li>
              <li>Mantener seguridad de cuenta, continuidad del servicio y soporte.</li>
              <li>Medir fiabilidad y calidad del producto de forma agregada.</li>
            </ul>
          ),
        },
        {
          title: "3. Base de control del usuario",
          body: (
            <p>
              El usuario controla que datos registra y puede retirar permisos opcionales (por ejemplo, Health Connect) desde su dispositivo.
              Tambien puede solicitar exportacion o eliminacion de cuenta mediante soporte.
            </p>
          ),
        },
        {
          title: "4. Conservacion y eliminacion",
          body: (
            <p>
              Conservamos datos mientras la cuenta este activa o sea necesario para operar el servicio, resolver incidencias y cumplir obligaciones legales.
              Ante una solicitud valida de eliminacion, se elimina o anonimiza la informacion segun corresponda.
            </p>
          ),
        },
        {
          title: "5. Comparticion",
          body: (
            <p>
              FitSculpt no vende datos personales. Podemos usar proveedores tecnicos para hosting, analitica y soporte bajo obligaciones de confidencialidad.
              Solo compartimos informacion cuando sea necesario para operar el servicio o cumplir la ley.
            </p>
          ),
        },
        {
          title: "6. Contacto y solicitudes",
          body: (
            <p>
              Para consultas de privacidad, acceso, rectificacion o eliminacion: <a href="mailto:privacy@fitsculpt.app">privacy@fitsculpt.app</a>.
              Si no puedes entrar a tu cuenta, incluye el correo asociado para validar la solicitud.
            </p>
          ),
        },
      ]}
    />
  );
}
