import { model, models, Schema } from "mongoose";

const preLeadMensualSchema = new Schema(
  {
    periodo: { type: String, required: true, trim: true, index: true },
    tipoRegistro: { type: String, required: true, trim: true },
    suborigen: { type: String, required: true, trim: true },
    total: { type: Number, required: true, min: 0 },
    presupuesto: { type: Number, required: true, min: 0, default: 0 },
    gasto: { type: Number, required: true, min: 0, default: 0 },
  },
  {
    collection: "pre_leads_mensuales",
    timestamps: true,
  },
);

preLeadMensualSchema.index({ periodo: 1, tipoRegistro: 1, suborigen: 1 }, { unique: true });

const cachedPreLeadMensual = models.PreLeadMensual;

if (cachedPreLeadMensual) {
  const numericSchemaUpdates: Record<string, { type: NumberConstructor; min: number; default: number }> = {};

  if (!cachedPreLeadMensual.schema.path("presupuesto")) {
    numericSchemaUpdates.presupuesto = { type: Number, min: 0, default: 0 };
  }

  if (!cachedPreLeadMensual.schema.path("gasto")) {
    numericSchemaUpdates.gasto = { type: Number, min: 0, default: 0 };
  }

  if (!cachedPreLeadMensual.schema.path("suborigen")) {
    cachedPreLeadMensual.schema.add({
      suborigen: { type: String, required: true, trim: true, default: "" },
    });
  }

  if (Object.keys(numericSchemaUpdates).length > 0) {
    cachedPreLeadMensual.schema.add(numericSchemaUpdates);
  }
}

export const PreLeadMensual =
  cachedPreLeadMensual ?? model("PreLeadMensual", preLeadMensualSchema);
