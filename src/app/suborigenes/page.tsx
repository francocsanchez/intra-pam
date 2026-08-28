import { connection } from "next/server";

import { SuboriginManager } from "@/components/suborigin-manager";
import { getOrigenesOportunidad, getSuborigenes } from "@/lib/suborigenes";

export default async function SuborigenesPage() {
  await connection();
  const [suborigenes, origenes] = await Promise.all([getSuborigenes(), getOrigenesOportunidad()]);
  return <main className="suborigins-page"><section className="suborigins-toolbar"><div><p className="section-kicker">Oportunidades / clasificación dinámica</p><h1>Suborígenes</h1></div><p>Relacione cada origen importado con un único suborigen. Los cambios impactan el historial inmediatamente.</p></section><SuboriginManager initialSuborigenes={suborigenes} initialOrigenes={origenes} /></main>;
}
