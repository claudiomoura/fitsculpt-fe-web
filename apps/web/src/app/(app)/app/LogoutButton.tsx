import { logoutAction } from "../../(auth)/login/actions";

export default function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button type="submit">Sair</button>
    </form>
  );
}
