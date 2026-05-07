import { cookies } from "next/headers";
import { LegalPageShell } from "@/components/marketing/LegalPageShell";
import { resolveLocale } from "@/lib/i18n";

export default async function RefundsPage() {
  const locale = resolveLocale((await cookies()).get("fs-locale")?.value ?? null);
  const localeNote =
    locale === "es" ? undefined : "Este documento legal se mantiene en espanol como version operativa principal por ahora.";

  return (
    <LegalPageShell
      title="Politica de Facturacion y Reembolsos"
      effectiveDate="2026-05-06"
      localeNote={localeNote}
      sections={[
        {
          title: "1. Modelo de suscripcion",
          body: (
            <p>
              FitSculpt opera con planes mensuales. El acceso premium se activa al confirmar el pago en la plataforma de cobro correspondiente (web o tienda de apps).
            </p>
          ),
        },
        {
          title: "2. Renovaciones y cancelacion",
          body: (
            <ul>
              <li>Las suscripciones se renuevan automaticamente salvo cancelacion previa al siguiente ciclo.</li>
              <li>La cancelacion detiene cobros futuros, pero no revierte automaticamente periodos ya facturados.</li>
              <li>Gestiona tu cancelacion desde el panel de facturacion o la tienda donde contrataste el plan.</li>
            </ul>
          ),
        },
        {
          title: "3. Criterios de reembolso",
          body: (
            <ul>
              <li>Las compras hechas en App Store o Google Play se rigen por sus politicas de reembolso.</li>
              <li>Para compras directas en web, revisamos solicitudes caso por caso cuando existan cobros duplicados o fallos tecnicos comprobables.</li>
              <li>No se conceden reembolsos por falta de uso parcial del periodo ya activo, salvo exigencia legal aplicable.</li>
            </ul>
          ),
        },
        {
          title: "4. Como solicitar soporte de cobro",
          body: (
            <p>
              Escribe a <a href="mailto:billing@fitsculpt.app">billing@fitsculpt.app</a> con tu correo de cuenta, fecha del cobro y referencia de transaccion.
              Respondemos en orden de llegada con estado y siguientes pasos.
            </p>
          ),
        },
        {
          title: "5. Cambios de precio",
          body: (
            <p>
              FitSculpt puede actualizar precios por mercado o plataforma. Los cambios se comunican antes de su aplicacion conforme a los requisitos del canal de pago.
            </p>
          ),
        },
      ]}
    />
  );
}
