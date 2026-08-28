import { model, models, Schema } from "mongoose";

const importacionSchema = new Schema(
  {
    archivo: { type: String, required: true },
    procesados: { type: Number, required: true },
    creados: { type: Number, required: true },
    actualizados: { type: Number, required: true },
    propietariosPendientes: { type: Number, required: true },
  },
  {
    collection: "importaciones_oportunidades",
    timestamps: true,
  },
);

export const ImportacionOportunidades =
  models.ImportacionOportunidades ??
  model("ImportacionOportunidades", importacionSchema);
