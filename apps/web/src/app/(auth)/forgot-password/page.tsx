import { getServerT } from "@/lib/serverI18n";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Badge } from "@/design-system/components/Badge";
import { Icon } from "@/design-system/components/Icon";
import { forgotPasswordAction } from "./actions";
import ForgotPasswordForm from "./ForgotPasswordForm";

type SearchParams =
  | { success?: string; error?: string }
  | Promise<{ success?: string; error?: string }>;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const { t } = await getServerT();
  const sp = (await Promise.resolve(searchParams)) || {};
  const success = sp.success === "1";
  const error = sp.error === "1";
  const rateLimited = sp.error === "rate_limited";

  const hasSession = Boolean((await cookies()).get("fs_token")?.value);
  if (hasSession) redirect("/app");

  return (
    <main className="auth-card card">
      <div className="auth-header">
        <Badge variant="muted">Recuperar contraseña</Badge>
        <h1 className="section-title">¿Olvidaste tu contraseña?</h1>
        <p className="section-subtitle">
          Ingresa tu email y te enviaremos un enlace para restablecerla.
        </p>
      </div>

      {success && (
        <div className="status-card status-card--success">
          <div className="inline-actions-sm">
            <Icon name="check" />
            <strong>Correo enviado</strong>
          </div>
          <p className="muted">
            Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.
            Revisa tu bandeja de entrada y spam.
          </p>
        </div>
      )}

      {error && (
        <div className="status-card status-card--warning">
          <div className="inline-actions-sm">
            <Icon name="warning" />
            <strong>Error</strong>
          </div>
          <p className="muted">
            No se pudo procesar la solicitud. Inténtalo de nuevo.
          </p>
        </div>
      )}

      {rateLimited && (
        <div className="status-card status-card--warning">
          <div className="inline-actions-sm">
            <Icon name="warning" />
            <strong>Demasiados intentos</strong>
          </div>
          <p className="muted">
            Espera un minuto antes de solicitar otro enlace.
          </p>
        </div>
      )}

      {!success && (
        <ForgotPasswordForm
          action={forgotPasswordAction}
          labels={{
            email: t("auth.email") || "Email",
            emailHelper: t("auth.emailHelper") || "El email de tu cuenta",
            submit: "Enviar enlace",
            loading: "Enviando...",
          }}
        />
      )}

      <div className="auth-footer">
        <p className="muted">
          ¿Ya la recuerdas?{" "}
          <a href="/login" className="link">
            Iniciar sesión
          </a>
        </p>
      </div>
    </main>
  );
}
