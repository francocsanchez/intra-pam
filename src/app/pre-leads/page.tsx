import { connection } from "next/server";

import { PreLeadsManager } from "@/components/pre-leads-manager";
import { getAvailableRegistryTypes, getPreLeads } from "@/lib/rendimiento";
import { getSuborigenes } from "@/lib/suborigenes";

export default async function PreLeadsPage() {
  await connection();
  const [records, registryTypes, suborigenes] = await Promise.all([
    getPreLeads(),
    getAvailableRegistryTypes(),
    getSuborigenes(),
  ]);

  return (
    <main className="suborigins-page">
      <section className="suborigins-toolbar">
        <div>
          <p className="section-kicker">Configuración / carga mensual</p>
          <h1>Pre Leads</h1>
        </div>
        <p>
          Registre pre leads, presupuesto y gasto por mes, tipo de registro y suborigen para
          medir conversión, cierre y costo comercial por unidad de negocio.
        </p>
      </section>
      <PreLeadsManager
        initialRecords={records}
        registryTypes={registryTypes}
        suborigenes={suborigenes.filter((item) => item.activo).map((item) => item.nombre)}
      />
    </main>
  );
}
