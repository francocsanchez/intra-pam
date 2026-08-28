import "server-only";

import { getSellerOwnerMappings } from "@/lib/asociaciones";
import { getSqlConnection } from "@/lib/sqlserver";

export const VENDEDORES_PAGE_SIZE = 50;

export type Vendedor = {
  codigo: number;
  nombre: string;
  sucursalCodigo: number | null;
  sucursalNombre: string | null;
  propietarioOportunidad: string | null;
};

export type VendedoresResult = {
  data: Vendedor[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search: string;
  };
};

type VendedorRow = {
  codigo: number;
  nombre: string | null;
  sucursalCodigo: number | null;
  sucursalNombre: string | null;
};

function normalizeSearch(search: string | undefined): string {
  return search?.trim().slice(0, 100) ?? "";
}

export async function getVendedoresActivos({
  page = 1,
  search,
}: {
  page?: number;
  search?: string;
} = {}): Promise<VendedoresResult> {
  const pool = await getSqlConnection();
  const normalizedSearch = normalizeSearch(search);

  const countResult = await pool
    .request()
    .input("search", normalizedSearch)
    .query<{ total: number }>(`
      SELECT COUNT(1) AS total
      FROM dbo.vendedor AS v
      LEFT JOIN dbo.sucursal AS s
        ON v.ven_sucur = s.suc_codigo
      WHERE v.ven_estado = 1
        AND (
          @search = ''
          OR v.ven_nombre LIKE '%' + @search + '%'
          OR CONVERT(varchar(10), v.ven_codigo) LIKE '%' + @search + '%'
          OR s.suc_nombre LIKE '%' + @search + '%'
        )
    `);

  const total = countResult.recordset[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / VENDEDORES_PAGE_SIZE));
  const normalizedPage = Math.min(Math.max(1, Math.trunc(page)), totalPages);
  const offset = (normalizedPage - 1) * VENDEDORES_PAGE_SIZE;

  const sellersResult = await pool
    .request()
    .input("search", normalizedSearch)
    .input("offset", offset)
    .input("pageSize", VENDEDORES_PAGE_SIZE)
    .query<VendedorRow>(`
      SELECT
        v.ven_codigo AS codigo,
        NULLIF(LTRIM(RTRIM(v.ven_nombre)), '') AS nombre,
        v.ven_sucur AS sucursalCodigo,
        NULLIF(LTRIM(RTRIM(s.suc_nombre)), '') AS sucursalNombre
      FROM dbo.vendedor AS v
      LEFT JOIN dbo.sucursal AS s
        ON v.ven_sucur = s.suc_codigo
      WHERE v.ven_estado = 1
        AND (
          @search = ''
          OR v.ven_nombre LIKE '%' + @search + '%'
          OR CONVERT(varchar(10), v.ven_codigo) LIKE '%' + @search + '%'
          OR s.suc_nombre LIKE '%' + @search + '%'
        )
      ORDER BY v.ven_nombre ASC, v.ven_codigo ASC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

  const ownerMappings = await getSellerOwnerMappings(
    sellersResult.recordset.map((row) => row.codigo),
  );

  return {
    data: sellersResult.recordset.map((row) => ({
      codigo: row.codigo,
      nombre: row.nombre ?? "Sin nombre",
      sucursalCodigo: row.sucursalCodigo,
      sucursalNombre: row.sucursalNombre,
      propietarioOportunidad: ownerMappings.get(row.codigo) ?? null,
    })),
    pagination: {
      page: normalizedPage,
      pageSize: VENDEDORES_PAGE_SIZE,
      total,
      totalPages,
    },
    filters: {
      search: normalizedSearch,
    },
  };
}
