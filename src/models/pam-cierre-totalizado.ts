import { model, models, Schema } from "mongoose";

const closingRateOwnerMetricSchema = new Schema(
  {
    propietario: { type: String, required: true, trim: true },
    oportunidades: { type: Number, required: true, min: 0 },
    ventas: { type: Number, required: true, min: 0 },
    tasaCierre: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const closingRateSummarySchema = new Schema(
  {
    propietarios: { type: Number, required: true, min: 0 },
    oportunidades: { type: Number, required: true, min: 0 },
    ventas: { type: Number, required: true, min: 0 },
    tasaCierre: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const pamCierreTotalizadoSchema = new Schema(
  {
    scope: {
      type: String,
      required: true,
      enum: ["catalogo", "snapshot"],
      index: true,
    },
    periodo: { type: String, default: null, index: true },
    suborigenFiltro: { type: String, default: null, index: true },
    tipoRegistroFiltro: { type: String, default: null, index: true },
    periodos: { type: [String], default: [] },
    suborigenes: { type: [String], default: [] },
    tiposRegistro: { type: [String], default: [] },
    periodoSeleccionado: { type: String, default: null },
    suborigenSeleccionado: { type: String, default: null },
    tipoRegistroSeleccionado: { type: String, default: null },
    propietarios: { type: [closingRateOwnerMetricSchema], default: [] },
    resumen: { type: closingRateSummarySchema, default: null },
    actualizadoEn: { type: Date, required: true },
    fuente: { type: String, required: true, trim: true },
    versionCalculo: { type: Number, required: true, min: 1 },
    periodosAfectados: { type: [String], default: [] },
  },
  {
    collection: "pam_cierre_totalizado",
    timestamps: true,
  },
);

pamCierreTotalizadoSchema.index(
  { scope: 1, periodo: 1, suborigenFiltro: 1, tipoRegistroFiltro: 1 },
  { unique: true },
);

const cachedPamCierreTotalizado = models.PamCierreTotalizado;

if (cachedPamCierreTotalizado) {
  if (!cachedPamCierreTotalizado.schema.path("tiposRegistro")) {
    cachedPamCierreTotalizado.schema.add({
      tiposRegistro: { type: [String], default: [] },
    });
  }

  if (!cachedPamCierreTotalizado.schema.path("propietarios")) {
    cachedPamCierreTotalizado.schema.add({
      propietarios: { type: [closingRateOwnerMetricSchema], default: [] },
    });
  }

  if (!cachedPamCierreTotalizado.schema.path("resumen")) {
    cachedPamCierreTotalizado.schema.add({
      resumen: { type: closingRateSummarySchema, default: null },
    });
  }
}

export const PamCierreTotalizado =
  cachedPamCierreTotalizado ??
  model("PamCierreTotalizado", pamCierreTotalizadoSchema);
