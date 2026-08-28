import { model, models, Schema } from "mongoose";

const oportunidadSchema = new Schema(
  {
    oportunidadId: { type: String, required: true, unique: true, trim: true },
    propietarioNombre: { type: String, required: true, trim: true },
    propietarioClave: { type: String, required: true, index: true },
    colaborador: { type: Boolean, default: null },
    origen: { type: String, default: null },
    origenNormalizado: { type: String, default: null, index: true },
    suborigenNombre: { type: String, default: null, index: true },
    tipoRegistro: { type: String, default: null },
    nombre: { type: String, default: null },
    etapa: { type: String, default: null },
    fechaCierre: { type: Date, default: null },
    fechaCreacion: { type: Date, default: null },
    presupuestoSincronizado: { type: Boolean, required: true, default: false },
    vendedorCodigo: { type: Number, default: null, index: true },
    ultimaImportacionEn: { type: Date, required: true },
  },
  {
    collection: "oportunidades",
    timestamps: true,
  },
);

const cachedOportunidad = models.Oportunidad;

// Next.js conserva los modelos entre recargas; incorpore campos nuevos al esquema ya compilado.
if (cachedOportunidad) {
  const schemaUpdates: Record<
    string,
    { type: StringConstructor | BooleanConstructor; default: null }
  > = {};

  if (!cachedOportunidad.schema.path("tipoRegistro")) {
    schemaUpdates.tipoRegistro = { type: String, default: null };
  }

  if (!cachedOportunidad.schema.path("colaborador")) {
    schemaUpdates.colaborador = { type: Boolean, default: null };
  }

  if (Object.keys(schemaUpdates).length > 0) {
    cachedOportunidad.schema.add(schemaUpdates);
  }
}

export const Oportunidad =
  cachedOportunidad ?? model("Oportunidad", oportunidadSchema);
