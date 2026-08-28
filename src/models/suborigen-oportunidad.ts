import { model, models, Schema } from "mongoose";

const suborigenOportunidadSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    nombreNormalizado: { type: String, required: true, unique: true },
    activo: { type: Boolean, required: true, default: true },
  },
  { collection: "suborigenes_oportunidad", timestamps: true },
);

export const SuborigenOportunidad = models.SuborigenOportunidad ?? model("SuborigenOportunidad", suborigenOportunidadSchema);
