import { getServerT } from "@/lib/serverI18n";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Badge } from "@/design-system/components/Badge";
import { Icon } from "@/design-system/components/Icon";
import { resetPasswordAction } from "./actions";
import ResetPasswordForm from "./ResetPasswordForm";

type SearchParams =
  | { token?: string; success?: string; error?: string }
  | Promise<{ token?: string; success?: string; error?: string }>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const { t } = await getServerT();
  const sp = (await Promise.resolve(searchParams)) || {};
  const token = sp.token || "";
  const success = sp.success === "1";
  const error = sp.error;

  const hasSession = Boolean((await cookies()).get("fs_token")?.value);
  if (hasSession) redirect("/app");

  if (success) {
    return (
      <main className="auth-card card">
        <div className="auth-header">
          <Badge variant="success">Contraseña actualizada</Badge>
          <h1 className="section-title">¡Contraseña restablecida!</h1>
        </div>
        <div className="status-card status-card--success">
          <div className="inline-actions-sm">
            <Icon name="check" />
            <strong>Tu contraseña ha sido actualizada</strong>
          </div>
          <p className="muted">
            Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
        </div>
        <div className="auth-footer">
          <a href="/login" className="btn primary fit-content">
            Iniciar sesión
          </a>
        </div>
      </main>
    );
  }

  if (error === "expired") {
    return (
      <main className="auth-card card">
        <div className="auth-header">
          <Badge variant="danger">Enlace expirado</Badge>
          <h1 className="section-title">Enlace no válido</h1>
        </div>
        <div className="status-card status-card--warning">
          <div className="inline-actions-sm">
            <Icon name="warning" />
            <strong>Este enlace ha expirado o no es válido</strong>
          </div>
          <p className="muted">
            Solicita un nuevo enlace de restablecimiento de contraseña.
          </p>
        </div>
        <div className="auth-footer">
          <a href="/forgot-password" className="btn primary fit-content">
            Solicitar nuevo enlace
          </a>
        </div>
      </main>
    );
  }

  if (error === "1") {
    return (
      <main className="auth-card card">
        <div className="auth-header">
          <Badge variant="danger">Error</Badge>
          <h1 className="section-title">Error al restablecer</h1>
        </div>
        <div className="status-card status-card--warning">
          <div className="inline-actions-sm">
            <Icon name="warning" />
            <strong>No se pudo actualizar la contraseña</strong>
          </div>
          <p className="muted">
            Inténtalo de nuevo o solicita un nuevo enlace.
          </p>
        </div>
        <div className="auth-footer">
          <a href="/forgot-password" className="btn primary fit-content">
            Solicitar nuevo enlace
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-card card">
      <div className="auth-header">
        <Badge variant="muted">Restablecer contraseña</Badge>
        <h1 className="section-title">Nueva contraseña</h1>
        <p className="section-subtitle">
          Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
        </p>
      </div>

      <ResetPasswordForm
        action={resetPasswordAction}
        token={token}
        labels={{
          password: "Nueva contraseña",
          passwordHelper: "Mínimo 8 caracteres",
          confirmPassword: "Confirmar contraseña",
          submit: "Restablecer contraseña",
          loading: "Actualizando...",
          showPassword: "Mostrar contraseña",
          hidePassword: "Ocultar contraseña",
          passwordMismatch: "Las contraseñas no coinciden",
        }}
      />

      <div className="auth-footer">
        <p className="muted">
          <a href="/login" className="link">
            Volver al login
          </a>
        </p>
      </div>
    </main>
  );
}
