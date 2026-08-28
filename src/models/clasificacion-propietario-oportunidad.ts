import { model, models, Schema } from "mongoose";

import {
  DEFAULT_OWNER_CLASSIFICATION_GROUP,
  OWNER_CLASSIFICATION_GROUPS,
} from "@/lib/propietario-clasificacion-contract";

const clasificacionPropietarioOportunidadSchema = new Schema(
  {
    propietarioNombre: { type: String, required: true, trim: true },
    propietarioClave: { type: String, required: true, unique: true, index: true },
    grupo: {
      type: String,
      required: true,
      enum: OWNER_CLASSIFICATION_GROUPS,
      default: DEFAULT_OWNER_CLASSIFICATION_GROUP,
    },
  },
  {
    collection: "clasificaciones_propietario_oportunidad",
    timestamps: true,
  },
);

export const ClasificacionPropietarioOportunidad =
  models.ClasificacionPropietarioOportunidad ??
  model(
    "ClasificacionPropietarioOportunidad",
    clasificacionPropietarioOportunidadSchema,
  );
