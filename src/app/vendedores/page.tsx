import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { OwnerAssignmentSelect } from "@/components/owner-assignment-select";
import { getOpportunityOwners } from "@/lib/oportunidades";
import { getVendedoresActivos } from "@/lib/vendedores";

type VendedoresPageProps = {
  searchParams: Promise<{
    page?: string | string[];
    q?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function pageHref(page: number, search: string): string {
  const params = new URLSearchParams();

  if (search) {
    params.set("q", search);
  }

  params.set("page", String(page));
  return `/vendedores?${params.toString()}`;
}

export default async function VendedoresPage({
  searchParams,
}: VendedoresPageProps) {
  await connection();
  const params = await searchParams;
  const requestedPage = Number(firstValue(params.page)) || 1;
  const search = firstValue(params.q);
  const [result, owners] = await Promise.all([
    getVendedoresActivos({ page: requestedPage, search }),
    getOpportunityOwners(),
  ]);

  const { page, pageSize, total, totalPages } = result.pagination;
  const firstRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, total);

  return (
    <main className="sellers-page">
      <section className="sellers-toolbar" aria-labelledby="sellers-title">
        <div>
          <p className="section-kicker">SQL Server / Registros activos</p>
          <h1 id="sellers-title">Vendedores</h1>
        </div>

        <form className="search-form" action="/vendedores" method="get">
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="seller-search">
            Buscar vendedores
          </label>
          <input
            id="seller-search"
            name="q"
            type="search"
            defaultValue={result.filters.search}
            placeholder="Buscar por codigo, nombre o sucursal"
            maxLength={100}
          />
          <button type="submit">Buscar</button>
        </form>
      </section>

      <section className="seller-table-shell" aria-label="Listado de vendedores">
        <div className="table-scroll">
          <table className="seller-table">
            <thead>
              <tr>
                <th scope="col">Codigo</th>
                <th scope="col">Vendedor</th>
                <th scope="col">Sucursal</th>
                <th scope="col">Propietario de oportunidad</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((seller) => (
                <tr key={seller.codigo}>
                  <td className="seller-code">{seller.codigo}</td>
                  <td className="seller-name">{seller.nombre}</td>
                  <td>
                    <span className="branch-name">
                      {seller.sucursalNombre ?? "Sin sucursal asociada"}
                    </span>
                    {seller.sucursalNombre && seller.sucursalCodigo !== null && (
                      <span className="branch-code">
                        #{seller.sucursalCodigo}
                      </span>
                    )}
                  </td>
                  <td>
                    <OwnerAssignmentSelect
                      sellerCode={seller.codigo}
                      currentOwner={seller.propietarioOportunidad}
                      owners={owners}
                    />
                  </td>
                  <td>
                    <span className="active-state">
                      <span aria-hidden="true" />
                      Activo
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {result.data.length === 0 && (
          <div className="empty-state">
            No hay vendedores activos que coincidan con la busqueda.
          </div>
        )}

        <footer className="table-footer">
          <p>
            {firstRecord}-{lastRecord} de {total} registros
          </p>
          <div className="pagination" aria-label="Paginacion de vendedores">
            {page > 1 ? (
              <Link href={pageHref(page - 1, result.filters.search)}>
                <ChevronLeft aria-hidden="true" />
                Anterior
              </Link>
            ) : (
              <span aria-disabled="true">
                <ChevronLeft aria-hidden="true" />
                Anterior
              </span>
            )}
            <span className="pagination__count">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link href={pageHref(page + 1, result.filters.search)}>
                Siguiente
                <ChevronRight aria-hidden="true" />
              </Link>
            ) : (
              <span aria-disabled="true">
                Siguiente
                <ChevronRight aria-hidden="true" />
              </span>
            )}
          </div>
        </footer>
      </section>
    </main>
  );
}
