import { model, models, Schema } from "mongoose";

const dashboardMetricSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const dashboardOwnerMetricSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    abiertas: { type: Number, required: true, min: 0 },
    cerradas: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const dashboardMonthlyTrendSchema = new Schema(
  {
    periodo: { type: String, required: true, trim: true },
    abiertas: { type: Number, required: true, min: 0 },
    cerradas: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    porTipoRegistro: { type: Schema.Types.Mixed, required: true, default: {} },
  },
  { _id: false },
);

const dashboardConversionMetricSchema = new Schema(
  {
    suborigen: { type: String, required: true, trim: true },
    tipoRegistro: { type: String, required: true, trim: true },
    leads: { type: Number, required: true, min: 0 },
    ventas: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const dashboardOportunidadesTotalizadasSchema = new Schema(
  {
    scope: {
      type: String,
      required: true,
      enum: ["global", "periodo"],
      index: true,
    },
    periodo: { type: String, default: null, index: true },
    periodos: { type: [String], default: [] },
    total: { type: Number, default: 0, min: 0 },
    estadoGlobal: {
      abiertas: { type: Number, required: true, min: 0, default: 0 },
      cerradas: { type: Number, required: true, min: 0, default: 0 },
    },
    tendenciaMensual: { type: [dashboardMonthlyTrendSchema], default: [] },
    colaboracionGlobal: { type: [dashboardMetricSchema], default: [] },
    tiposRegistroGlobal: { type: [dashboardMetricSchema], default: [] },
    suborigenesGlobal: { type: [dashboardMetricSchema], default: [] },
    suborigenesPeriodo: { type: [dashboardMetricSchema], default: [] },
    conversionPeriodo: { type: [dashboardConversionMetricSchema], default: [] },
    porEtapa: { type: [dashboardMetricSchema], default: [] },
    porPropietario: { type: [dashboardOwnerMetricSchema], default: [] },
    actualizadoEn: { type: Date, required: true },
    fuente: { type: String, required: true, trim: true },
    versionCalculo: { type: Number, required: true, min: 1 },
    periodosAfectados: { type: [String], default: [] },
  },
  {
    collection: "dashboard_oportunidades_totalizadas",
    timestamps: true,
  },
);

dashboardOportunidadesTotalizadasSchema.index(
  { scope: 1, periodo: 1 },
  { unique: true },
);

export const DashboardOportunidadesTotalizadas =
  models.DashboardOportunidadesTotalizadas ??
  model(
    "DashboardOportunidadesTotalizadas",
    dashboardOportunidadesTotalizadasSchema,
  );
