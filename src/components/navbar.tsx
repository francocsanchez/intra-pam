"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  const sellersActive = pathname.startsWith("/vendedores");

  return (
    <header className="navbar">
      <Link className="navbar__brand" href="/" aria-label="Intra PAM, inicio">
        <span className="navbar__mark">IP</span>
        <span>Intra PAM</span>
      </Link>

      <nav aria-label="Navegacion principal">
        <Link
          className="navbar__link"
          data-active={sellersActive ? "true" : "false"}
          href="/vendedores"
          aria-current={sellersActive ? "page" : undefined}
        >
          <Users aria-hidden="true" />
          Vendedores
        </Link>
      </nav>
    </header>
  );
}
