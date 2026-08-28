import { model, models, Schema } from "mongoose";

const asociacionOrigenSuborigenSchema = new Schema(
  {
    origen: { type: String, required: true, trim: true },
    origenNormalizado: { type: String, required: true, unique: true },
    suborigenId: { type: Schema.Types.ObjectId, required: true, index: true },
    suborigenNombre: { type: String, required: true, trim: true },
  },
  { collection: "asociaciones_origen_suborigen", timestamps: true },
);

export const AsociacionOrigenSuborigen = models.AsociacionOrigenSuborigen ?? model("AsociacionOrigenSuborigen", asociacionOrigenSuborigenSchema);
