"use client";

import { Activity, BriefcaseBusiness, ChartNoAxesCombined, ChevronDown, FileBarChart2, KeyRound, ListOrdered, LogOut, MonitorCog, Network, Percent, Settings2, Tags, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type NavbarProps = {
  profileUrl: string;
  user: {
    name: string | null;
    email: string;
    role: "admin" | "user" | "viewer" | null;
  } | null;
};

export function Navbar({ profileUrl, user }: NavbarProps) {
  const pathname = usePathname();
  const configurationDropdownRef = useRef<HTMLDetailsElement>(null);
  const pamDropdownRef = useRef<HTMLDetailsElement>(null);
  const profileDropdownRef = useRef<HTMLDetailsElement>(null);
  const dashboardActive = pathname === "/";
  const sellersActive = pathname.startsWith("/vendedores");
  const opportunitiesActive = pathname.startsWith("/oportunidades");
  const performanceActive = pathname.startsWith("/rendimiento");
  const summaryActive = pathname.startsWith("/resumen");
  const closingRatesActive = pathname.startsWith("/tasas-cierre");
  const digitalParticipationActive = pathname.startsWith("/participacion-digital");
  const suboriginsActive = pathname.startsWith("/suborigenes");
  const ownersActive = pathname.startsWith("/propietarios-oportunidad");
  const preLeadsActive = pathname.startsWith("/pre-leads");
  const configurationActive = sellersActive || suboriginsActive || ownersActive || preLeadsActive;
  const pamActive = summaryActive || performanceActive || closingRatesActive || digitalParticipationActive;

  useEffect(() => {
    if (configurationDropdownRef.current) {
      configurationDropdownRef.current.open = false;
    }
    if (pamDropdownRef.current) {
      pamDropdownRef.current.open = false;
    }
    if (profileDropdownRef.current) {
      profileDropdownRef.current.open = false;
    }
  }, [pathname]);

  return (
    <header className="navbar">
      <div className="navbar__start">
        <Link className="navbar__brand" href="/" aria-label="Intra PAM, inicio">
          <span className="navbar__mark">IP</span>
          <span>Intra PAM</span>
        </Link>

        <nav aria-label="Navegacion principal">
          <Link
            className="navbar__link"
            data-active={dashboardActive ? "true" : "false"}
            href="/"
            aria-current={dashboardActive ? "page" : undefined}
          >
            <ChartNoAxesCombined aria-hidden="true" />
            Dashboard
          </Link>
          <Link
            className="navbar__link"
            data-active={opportunitiesActive ? "true" : "false"}
            href="/oportunidades"
            aria-current={opportunitiesActive ? "page" : undefined}
          >
            <BriefcaseBusiness aria-hidden="true" />
            Oportunidades
          </Link>
          <details
            ref={pamDropdownRef}
            className="navbar__dropdown"
            data-active={pamActive ? "true" : "false"}
          >
            <summary className="navbar__link navbar__link--summary" aria-current={pamActive ? "page" : undefined}>
              <FileBarChart2 aria-hidden="true" />
              PAM
              <ChevronDown aria-hidden="true" className="navbar__chevron" />
            </summary>
            <div className="navbar__menu" role="menu" aria-label="PAM">
              <Link
                className="navbar__menu-link"
                data-active={summaryActive ? "true" : "false"}
                href="/resumen"
                aria-current={summaryActive ? "page" : undefined}
                role="menuitem"
              >
                <FileBarChart2 aria-hidden="true" />
                Resumen
              </Link>
              <Link
                className="navbar__menu-link"
                data-active={performanceActive ? "true" : "false"}
                href="/rendimiento"
                aria-current={performanceActive ? "page" : undefined}
                role="menuitem"
              >
                <Activity aria-hidden="true" />
                Rendimiento
              </Link>
              <Link
                className="navbar__menu-link"
                data-active={digitalParticipationActive ? "true" : "false"}
                href="/participacion-digital"
                aria-current={digitalParticipationActive ? "page" : undefined}
                role="menuitem"
              >
                <MonitorCog aria-hidden="true" />
                Participación Digital
              </Link>
              <Link
                className="navbar__menu-link"
                data-active={closingRatesActive ? "true" : "false"}
                href="/tasas-cierre"
                aria-current={closingRatesActive ? "page" : undefined}
                role="menuitem"
              >
                <Percent aria-hidden="true" />
                Tasas de cierre
              </Link>
            </div>
          </details>
          <details
            ref={configurationDropdownRef}
            className="navbar__dropdown"
            data-active={configurationActive ? "true" : "false"}
          >
            <summary className="navbar__link navbar__link--summary" aria-current={configurationActive ? "page" : undefined}>
              <Settings2 aria-hidden="true" />
              Configuración
              <ChevronDown aria-hidden="true" className="navbar__chevron" />
            </summary>
            <div className="navbar__menu" role="menu" aria-label="Configuración">
              <Link
                className="navbar__menu-link"
                data-active={sellersActive ? "true" : "false"}
                href="/vendedores"
                aria-current={sellersActive ? "page" : undefined}
                role="menuitem"
              >
                <Users aria-hidden="true" />
                Vendedores
              </Link>
              <Link
                className="navbar__menu-link"
                data-active={ownersActive ? "true" : "false"}
                href="/propietarios-oportunidad"
                aria-current={ownersActive ? "page" : undefined}
                role="menuitem"
              >
                <Tags aria-hidden="true" />
                Propietarios
              </Link>
              <Link
                className="navbar__menu-link"
                data-active={preLeadsActive ? "true" : "false"}
                href="/pre-leads"
                aria-current={preLeadsActive ? "page" : undefined}
                role="menuitem"
              >
                <ListOrdered aria-hidden="true" />
                Pre Leads
              </Link>
              <Link
                className="navbar__menu-link"
                data-active={suboriginsActive ? "true" : "false"}
                href="/suborigenes"
                aria-current={suboriginsActive ? "page" : undefined}
                role="menuitem"
              >
                <Network aria-hidden="true" />
                Suborígenes
              </Link>
            </div>
          </details>
        </nav>
      </div>

      <details ref={profileDropdownRef} className="navbar__dropdown navbar__dropdown--profile">
        <summary className="navbar__profile-trigger">
          <UserRound aria-hidden="true" />
          Mi Perfil
          <ChevronDown aria-hidden="true" className="navbar__chevron" />
        </summary>
        <div className="navbar__menu navbar__menu--profile" role="menu" aria-label="Mi perfil">
          <div className="navbar__session-copy navbar__session-copy--menu">
            <strong>{user?.name ?? "Sesion central"}</strong>
            <span>
              {user
                ? user.role
                  ? `${user.role} · ${user.email}`
                  : user.email
                : "Administra tu cuenta desde Auth Central"}
            </span>
          </div>
          <a className="navbar__menu-link" href={profileUrl} role="menuitem">
            <UserRound aria-hidden="true" />
            Ver perfil
          </a>
          <a className="navbar__menu-link" href={profileUrl} role="menuitem">
            <KeyRound aria-hidden="true" />
            Cambiar password
          </a>
          <a className="navbar__menu-link" href="/logout" role="menuitem">
            <LogOut aria-hidden="true" />
            Cerrar sesion
          </a>
        </div>
      </details>
    </header>
  );
}
