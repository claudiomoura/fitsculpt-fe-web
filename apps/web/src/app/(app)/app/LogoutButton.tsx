import { logoutAction } from "../../(auth)/login/actions";
import { copy } from "@/lib/i18n";

export default function LogoutButton() {
  const c = copy.es;
  return (
    <form action={logoutAction}>
      <button type="submit" className="btn secondary">
        {c.nav.logout}
      </button>
    </form>
  );
}
