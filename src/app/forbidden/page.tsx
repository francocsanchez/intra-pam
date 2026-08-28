import { redirect } from "next/navigation";

import { getCurrentCentralSession, getAppRole, hasAppAccess } from "@/lib/auth/central";
import { getCentralAuthConfig } from "@/lib/env";

export default async function ForbiddenPage() {
  const sessionState = await getCurrentCentralSession();

  if (sessionState.status === "authenticated") {
    const { appKey } = getCentralAuthConfig();

    if (hasAppAccess(sessionState.session, appKey)) {
      redirect("/");
    }

    const role = getAppRole(sessionState.session, appKey);

    return (
      <main className="auth-page">
        <section className="auth-panel" aria-labelledby="forbidden-title">
          <p className="auth-panel__kicker">Auth Central / Acceso restringido</p>
          <h1 id="forbidden-title">No tenes permisos para ingresar a Intra PAM.</h1>
          <p className="auth-panel__body">
            Tu sesion central esta activa, pero esta aplicacion no tiene acceso
            habilitado para tu usuario.
          </p>
          <dl className="auth-panel__details">
            <div>
              <dt>Usuario</dt>
              <dd>{sessionState.session.user.name ?? "Sin nombre"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{sessionState.session.user.email}</dd>
            </div>
            <div>
              <dt>Rol informado</dt>
              <dd>{role ?? "Sin rol para esta aplicación"}</dd>
            </div>
          </dl>
          <div className="auth-panel__actions">
            <form action="/logout" method="post">
              <button type="submit">Cerrar sesion central</button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="forbidden-title">
        <p className="auth-panel__kicker">Auth Central / Acceso restringido</p>
        <h1 id="forbidden-title">No tenes permisos para ingresar a Intra PAM.</h1>
        <p className="auth-panel__body">
          La sesion existe, pero Auth Central no autorizo el acceso a esta
          aplicacion. Si deberias verla, revisa la asignacion de acceso y el rol
          en el sistema central.
        </p>
        <div className="auth-panel__actions">
          <form action="/logout" method="post">
            <button type="submit">Cerrar sesion central</button>
          </form>
        </div>
      </section>
    </main>
  );
}
