import "server-only";

import { getMongoConnection } from "@/lib/mongodb";
import { getSqlConnection } from "@/lib/sqlserver";
import {
  fillAnnualClosingRateSeries,
  fillAnnualOperationSeries,
  fillDailyOperationSeries,
  getPeriodBounds,
  normalizeVendorFamilyName,
  type VendorAnalysisDashboard,
  type VendorAnalysisPoint,
  type VendorFamilyMetric,
  type VendorFamilyTreeMetric,
  normalizeVendorModelName,
} from "@/lib/vendedor-analisis-contract";
import { AsociacionPropietarioVendedor } from "@/models/asociacion-propietario-vendedor";
import { Oportunidad } from "@/models/oportunidad";

export class VendorAnalysisNotFoundError extends Error {
  constructor() {
    super("El vendedor no existe o no se encuentra activo.");
  }
}

type SellerRow = {
  codigo: number;
  nombre: string | null;
  sucursalNombre: string | null;
};

type PeriodRow = { periodo: string | null };
type TotalRow = { periodo: string; total: number };
type DailyRow = { dia: number; total: number };
type FamilyRow = { familia: string | null; total: number };
type FamilyModelRow = FamilyRow & { modelo: string | null };
type OpportunityClosingRateRow = {
  _id: string;
  oportunidades: number;
  ventas: number;
};

async function getAnnualClosingRateSeries(sellerCode: number, yearStart: Date, yearEnd: Date, year: number) {
  await getMongoConnection();
  const ownerMapping = await AsociacionPropietarioVendedor.findOne({ vendedorCodigo: sellerCode })
    .select({ propietarioClave: 1, _id: 0 })
    .lean();

  if (!ownerMapping?.propietarioClave) {
    return fillAnnualClosingRateSeries(year, []);
  }

  const rows = await Oportunidad.aggregate<OpportunityClosingRateRow>([
    {
      $match: {
        propietarioClave: ownerMapping.propietarioClave,
        fechaCreacion: { $gte: yearStart, $lt: yearEnd },
      },
    },
    {
      $set: {
        periodo: {
          $dateToString: { date: "$fechaCreacion", format: "%Y-%m", timezone: "UTC" },
        },
        esVenta: {
          $regexMatch: {
            input: { $trim: { input: { $ifNull: ["$etapa", ""] } } },
            regex: "^venta(\\s+plan)?$",
            options: "i",
          },
        },
      },
    },
    {
      $group: {
        _id: "$periodo",
        oportunidades: { $sum: 1 },
        ventas: { $sum: { $cond: ["$esVenta", 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return fillAnnualClosingRateSeries(year, rows.map((row) => ({
    periodo: row._id,
    oportunidades: row.oportunidades,
    ventas: row.ventas,
  })));
}

function normalizeCode(value: number): number {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

export async function getVendorAnalysisDashboard(
  sellerCode: number,
  requestedPeriod: string | null = null,
): Promise<VendorAnalysisDashboard> {
  const normalizedCode = normalizeCode(sellerCode);
  const pool = await getSqlConnection();
  const sellerResult = await pool.request().input("sellerCode", normalizedCode).query<SellerRow>(`
    SELECT
      v.ven_codigo AS codigo,
      NULLIF(LTRIM(RTRIM(v.ven_nombre)), '') AS nombre,
      NULLIF(LTRIM(RTRIM(s.suc_nombre)), '') AS sucursalNombre
    FROM dbo.vendedor AS v
    LEFT JOIN dbo.sucursal AS s
      ON v.ven_sucur = s.suc_codigo
    WHERE v.ven_codigo = @sellerCode
      AND v.ven_estado = 1
  `);

  const seller = sellerResult.recordset[0];
  if (!seller) throw new VendorAnalysisNotFoundError();

  const periodsResult = await pool.request().input("sellerCode", normalizedCode).query<PeriodRow>(`
    SELECT DISTINCT CONVERT(char(7), o.ope_fecasig, 126) AS periodo
    FROM dbo.opera AS o
    WHERE o.ope_vende = @sellerCode
      AND o.ope_fecasig IS NOT NULL
      AND o.ope_fecbaj IS NULL
    ORDER BY periodo DESC
  `);
  const periodos = periodsResult.recordset
    .map((row) => row.periodo)
    .filter((period): period is string => !!period);
  const periodoSeleccionado = requestedPeriod ?? periodos[0] ?? null;

  if (!periodoSeleccionado) {
    return {
      vendedor: {
        codigo: seller.codigo,
        nombre: seller.nombre ?? "Sin nombre",
        sucursalNombre: seller.sucursalNombre,
      },
      periodos,
      periodoSeleccionado: null,
      operacionesAnuales: [],
      tasaCierreAnual: [],
      operacionesAnualesPorFamilia: [],
      operacionesPorFamilia: [],
      operacionesDiarias: [],
    };
  }

  const { start, end, year } = getPeriodBounds(periodoSeleccionado);
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
  const [annualResult, annualFamiliesResult, dailyResult, familiesResult, tasaCierreAnual] = await Promise.all([
    pool.request()
      .input("sellerCode", normalizedCode)
      .input("yearStart", yearStart)
      .input("yearEnd", yearEnd)
      .query<TotalRow>(`
        SELECT CONVERT(char(7), o.ope_fecasig, 126) AS periodo, COUNT(1) AS total
        FROM dbo.opera AS o
        WHERE o.ope_vende = @sellerCode
          AND o.ope_fecasig >= @yearStart
          AND o.ope_fecasig < @yearEnd
          AND o.ope_fecbaj IS NULL
        GROUP BY CONVERT(char(7), o.ope_fecasig, 126)
        ORDER BY periodo ASC
      `),
    pool.request()
      .input("sellerCode", normalizedCode)
      .input("yearStart", yearStart)
      .input("yearEnd", yearEnd)
      .query<FamilyModelRow>(`
        SELECT
          NULLIF(LTRIM(RTRIM(f.fam_nombre)), '') AS familia,
          NULLIF(LTRIM(RTRIM(a.au_nombre)), '') AS modelo,
          COUNT(1) AS total
        FROM dbo.opera AS o
        LEFT JOIN dbo.auto AS a
          ON a.au_marca = o.ope_marca
          AND a.au_codigo = o.ope_auto
        LEFT JOIN dbo.famiauto AS f
          ON f.fam_codigo = a.au_familia
        WHERE o.ope_vende = @sellerCode
          AND o.ope_fecasig >= @yearStart
          AND o.ope_fecasig < @yearEnd
          AND o.ope_fecbaj IS NULL
        GROUP BY
          NULLIF(LTRIM(RTRIM(f.fam_nombre)), ''),
          NULLIF(LTRIM(RTRIM(a.au_nombre)), '')
        ORDER BY familia ASC, modelo ASC
      `),
    pool.request()
      .input("sellerCode", normalizedCode)
      .input("start", start)
      .input("end", end)
      .query<DailyRow>(`
        SELECT DATEPART(day, o.ope_fecasig) AS dia, COUNT(1) AS total
        FROM dbo.opera AS o
        WHERE o.ope_vende = @sellerCode
          AND o.ope_fecasig >= @start
          AND o.ope_fecasig < @end
          AND o.ope_fecbaj IS NULL
        GROUP BY DATEPART(day, o.ope_fecasig)
        ORDER BY dia ASC
      `),
    pool.request()
      .input("sellerCode", normalizedCode)
      .input("start", start)
      .input("end", end)
      .query<FamilyRow>(`
        SELECT
          NULLIF(LTRIM(RTRIM(f.fam_nombre)), '') AS familia,
          COUNT(1) AS total
        FROM dbo.opera AS o
        LEFT JOIN dbo.auto AS a
          ON a.au_marca = o.ope_marca
          AND a.au_codigo = o.ope_auto
        LEFT JOIN dbo.famiauto AS f
          ON f.fam_codigo = a.au_familia
        WHERE o.ope_vende = @sellerCode
          AND o.ope_fecasig >= @start
          AND o.ope_fecasig < @end
          AND o.ope_fecbaj IS NULL
        GROUP BY NULLIF(LTRIM(RTRIM(f.fam_nombre)), '')
        ORDER BY total DESC, familia ASC
      `),
    getAnnualClosingRateSeries(normalizedCode, yearStart, yearEnd, year),
  ]);

  const operacionesPorFamilia: VendorFamilyMetric[] = familiesResult.recordset.map((row) => ({
    familia: normalizeVendorFamilyName(row.familia),
    total: row.total,
  }));
  const annualFamilies = new Map<string, VendorFamilyTreeMetric>();
  for (const row of annualFamiliesResult.recordset) {
    const familia = normalizeVendorFamilyName(row.familia);
    const current = annualFamilies.get(familia) ?? { familia, total: 0, modelos: [] };
    current.total += row.total;
    current.modelos.push({ modelo: normalizeVendorModelName(row.modelo), total: row.total });
    annualFamilies.set(familia, current);
  }
  const operacionesAnualesPorFamilia = [...annualFamilies.values()]
    .map((family) => ({
      ...family,
      modelos: family.modelos.sort(
        (left, right) => right.total - left.total || left.modelo.localeCompare(right.modelo, "es"),
      ),
    }))
    .sort((left, right) => right.total - left.total || left.familia.localeCompare(right.familia, "es"));

  return {
    vendedor: {
      codigo: seller.codigo,
      nombre: seller.nombre ?? "Sin nombre",
      sucursalNombre: seller.sucursalNombre,
    },
    periodos,
    periodoSeleccionado,
    operacionesAnuales: fillAnnualOperationSeries(year, annualResult.recordset as VendorAnalysisPoint[]),
    tasaCierreAnual,
    operacionesAnualesPorFamilia,
    operacionesPorFamilia,
    operacionesDiarias: fillDailyOperationSeries(periodoSeleccionado, dailyResult.recordset),
  };
}
