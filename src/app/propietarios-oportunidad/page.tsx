import { connection } from "next/server";

import { OwnerClassificationManager } from "@/components/owner-classification-manager";
import { getOpportunityOwnerClassifications } from "@/lib/propietarios-clasificacion";

export default async function PropietariosOportunidadPage() {
  await connection();
  const owners = await getOpportunityOwnerClassifications();

  return (
    <main className="sellers-page">
      <section className="sellers-toolbar" aria-labelledby="owners-title">
        <div>
          <p className="section-kicker">Configuración / cartera comercial</p>
          <h1 id="owners-title">Propietarios</h1>
        </div>

        <p className="owners-page__summary">
          Clasifique cada propietario para que el dashboard comercial analice
          solo la cartera atribuida a Vendedores.
        </p>
      </section>

      <OwnerClassificationManager initialOwners={owners} />
    </main>
  );
}
