import { model, models, Schema } from "mongoose";

const asociacionSchema = new Schema(
  {
    propietarioNombre: { type: String, required: true, trim: true },
    propietarioClave: { type: String, required: true, unique: true },
    vendedorCodigo: { type: Number, required: true, unique: true },
  },
  {
    collection: "asociaciones_propietario_vendedor",
    timestamps: true,
  },
);

export const AsociacionPropietarioVendedor =
  models.AsociacionPropietarioVendedor ??
  model("AsociacionPropietarioVendedor", asociacionSchema);
