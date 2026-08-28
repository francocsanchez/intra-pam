import { model, models, Schema } from "mongoose";

const performanceMetricSchema = new Schema(
  {
    tipoRegistro: { type: String, required: true, trim: true },
    preLeads: { type: Number, required: true, min: 0 },
    leads: { type: Number, required: true, min: 0 },
    tasaConversion: { type: Number, required: true, min: 0 },
    ventas: { type: Number, required: true, min: 0 },
    tasaCierre: { type: Number, required: true, min: 0 },
    tasaPreLeads: { type: Number, required: true, min: 0 },
    presupuesto: { type: Number, required: true, min: 0 },
    gasto: { type: Number, required: true, min: 0 },
    costoPorVenta: { type: Number, required: true, min: 0 },
    costoPorVentaAnterior: { type: Number, default: null, min: 0 },
    variacionCostoPorVenta: { type: Number, default: null },
    periodoAnterior: { type: String, default: null },
  },
  { _id: false },
);

const pamAnnualPreLeadPointSchema = new Schema(
  {
    periodo: { type: String, required: true, trim: true },
    total: { type: Number, required: true, min: 0 },
    porTipoRegistro: { type: Map, of: Number, default: {} },
  },
  { _id: false },
);

const pamDigitalParticipationPointSchema = new Schema(
  {
    periodo: { type: String, required: true, trim: true },
    porTipoRegistro: {
      type: Map,
      of: new Schema(
        {
          ventasTotales: { type: Number, required: true, min: 0 },
          ventasColaboradas: { type: Number, required: true, min: 0 },
          participacion: { type: Number, required: true, min: 0 },
        },
        { _id: false },
      ),
      default: {},
    },
  },
  { _id: false },
);

const pamDigitalParticipationSummarySchema = new Schema(
  {
    tipoRegistro: { type: String, required: true, trim: true },
    ventasTotales: { type: Number, required: true, min: 0 },
    ventasColaboradas: { type: Number, required: true, min: 0 },
    participacion: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const pamTypeMetricSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const pamConversionMetricSchema = new Schema(
  {
    suborigen: { type: String, required: true, trim: true },
    tipoRegistro: { type: String, required: true, trim: true },
    leads: { type: Number, required: true, min: 0 },
    ventas: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const rendimientoTotalizadoSchema = new Schema(
  {
    scope: {
      type: String,
      required: true,
      enum: ["catalogo", "snapshot"],
      index: true,
    },
    periodo: { type: String, default: null, index: true },
    suborigenFiltro: { type: String, default: null, index: true },
    periodos: { type: [String], default: [] },
    suborigenes: { type: [String], default: [] },
    periodoSeleccionado: { type: String, default: null },
    suborigenSeleccionado: { type: String, default: null },
    negocios: { type: [performanceMetricSchema], default: [] },
    resumen: { type: performanceMetricSchema, default: null },
    tendenciaAnualPreLeads: { type: [pamAnnualPreLeadPointSchema], default: [] },
    tendenciaAnualParticipacionDigital: {
      type: [pamDigitalParticipationPointSchema],
      default: [],
    },
    resumenParticipacionDigital: {
      type: [pamDigitalParticipationSummarySchema],
      default: [],
    },
    tiposRegistroMensual: { type: [pamTypeMetricSchema], default: [] },
    conversionMensual: { type: [pamConversionMetricSchema], default: [] },
    actualizadoEn: { type: Date, required: true },
    fuente: { type: String, required: true, trim: true },
    versionCalculo: { type: Number, required: true, min: 1 },
    periodosAfectados: { type: [String], default: [] },
  },
  {
    collection: "rendimiento_totalizado",
    timestamps: true,
  },
);

rendimientoTotalizadoSchema.index(
  { scope: 1, periodo: 1, suborigenFiltro: 1 },
  { unique: true },
);

const cachedRendimientoTotalizado = models.RendimientoTotalizado;

if (cachedRendimientoTotalizado) {
  const cachedDigitalSummaryPath = cachedRendimientoTotalizado.schema.path("resumenParticipacionDigital");

  if (!cachedRendimientoTotalizado.schema.path("tendenciaAnualPreLeads")) {
    cachedRendimientoTotalizado.schema.add({
      tendenciaAnualPreLeads: { type: [pamAnnualPreLeadPointSchema], default: [] },
    });
  }

  if (!cachedRendimientoTotalizado.schema.path("tendenciaAnualParticipacionDigital")) {
    cachedRendimientoTotalizado.schema.add({
      tendenciaAnualParticipacionDigital: {
        type: [pamDigitalParticipationPointSchema],
        default: [],
      },
    });
  }

  if (
    cachedDigitalSummaryPath &&
    !("schema" in cachedDigitalSummaryPath && "$isMongooseDocumentArray" in cachedDigitalSummaryPath)
  ) {
    cachedRendimientoTotalizado.schema.remove("resumenParticipacionDigital");
  }

  if (!cachedRendimientoTotalizado.schema.path("resumenParticipacionDigital")) {
    cachedRendimientoTotalizado.schema.add({
      resumenParticipacionDigital: {
        type: [pamDigitalParticipationSummarySchema],
        default: [],
      },
    });
  }

  if (!cachedRendimientoTotalizado.schema.path("tiposRegistroMensual")) {
    cachedRendimientoTotalizado.schema.add({
      tiposRegistroMensual: { type: [pamTypeMetricSchema], default: [] },
    });
  }

  if (!cachedRendimientoTotalizado.schema.path("conversionMensual")) {
    cachedRendimientoTotalizado.schema.add({
      conversionMensual: { type: [pamConversionMetricSchema], default: [] },
    });
  }
}

export const RendimientoTotalizado =
  cachedRendimientoTotalizado ??
  model("RendimientoTotalizado", rendimientoTotalizadoSchema);
