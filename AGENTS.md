# Contexto del proyecto

Este repositorio es un proyecto independiente.

## Commit

Luego de cada implementacion debes devovler el commando git commit -am "{Mensaje commit}", ya que esto usaremos para generar los commit de git.

## CHANGELOG && AGENTS

Luego de cada implementacion generar el registro en el CHANGELOG.md (si no existe el archivo, crearlo) ya que lo dejaremos como bitacora de cambios, ademas de actualizar el AGENTS.md para tener mas contexto del proyecto.

## Aislamiento

- No usar decisiones, estilos ni reglas provenientes de otros proyectos.
- No reutilizar paletas, diseños, componentes o arquitecturas externas.
- Trabajar únicamente con el contenido de este repositorio.
- No asumir preferencias históricas del usuario.
- Ante información faltante, preguntar o proponer una solución nueva.

## Fuente de verdad

Las únicas fuentes válidas son:

1. Este archivo AGENTS.md.
2. Los archivos del repositorio actual.
3. Las instrucciones dadas en el chat actual.

## Diseño

El sistema visual debe definirse específicamente para este proyecto.
No reutilizar sistemas visuales anteriores salvo solicitud expresa.

## Graficos

Instalar y utilizar la libreria https://echarts.apache.org/en/index.html siempre que se requiera reprensentar datos de manera grafica.

## Estilo visual

Siempre utilizar el siguiente preset para los diseños del proyecto
```bash
npx shadcn@latest init --preset b1D0dvg8 --template next
```

Usar este globals.css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.45rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

Si las fuentes no estan instaladas, deberas instalarlas para que el proyecto corra de manera visual correctamente.
Usar ademas padding reducido, no quiero separaciones grandes. Las vistas deben ser compactas pero que no se superpongan los datos. Siempre se debe utilizar todo el ancho de la pantalla.

## Estado actual del proyecto

- Aplicacion Next.js 16 con App Router y TypeScript.
- La autenticacion de usuarios se delega en Auth Central; este proyecto no maneja usuarios, passwords ni sesiones locales.
- MongoDB es la unica fuente con permisos de escritura y se accede mediante Mongoose.
- SQL Server se usa exclusivamente para consultas mediante el usuario configurado en variables de entorno.
- `GET /api/health` verifica ambas conexiones en tiempo de ejecucion; la pagina inicial es el dashboard analítico.
- Las conexiones reutilizan pools globales para evitar aperturas innecesarias durante desarrollo y produccion.
- Las variables de entorno privadas nunca deben usar el prefijo `NEXT_PUBLIC_`.
- Las variables de entorno requeridas para Auth Central son `CENTRAL_AUTH_URL`, `NEXT_PUBLIC_APP_URL` y `CENTRAL_APP_KEY`.
- La consulta de sesion central se hace exclusivamente por `GET {CENTRAL_AUTH_URL}/api/internal/session?appKey={CENTRAL_APP_KEY}` reenviando la `cookie` original del request.
- Toda la app y todas las rutas `src/app/api/*`, incluyendo `GET /api/health`, quedan protegidas por `middleware`; solo se excluyen assets internos de Next, `favicon` y la ruta local `/logout`.
- Si no hay sesion central valida, la app redirige a `{CENTRAL_AUTH_URL}/login?appKey=...&returnTo=...`.
- Si existe sesion central pero la aplicacion no tiene acceso habilitado, las vistas muestran `/forbidden` y las APIs responden `403`.
- El logout local se expone en `GET /logout` y solo redirige al logout central con retorno a la raiz de la app.
- El navbar debe agrupar la navegación principal a la izquierda y exponer la cuenta como un dropdown `Mi Perfil`.
- El dropdown `Mi Perfil` debe enlazar al perfil central (`/profile` en Auth Central), que es desde donde el usuario cambia password y gestiona su cuenta, además de ofrecer la salida por `/logout`.
- El `RootLayout` debe actuar tambien como guard server-side de paginas solo para el caso sin sesion central valida; la decision de mandar a `/forbidden` queda centralizada en `middleware` para evitar loops de redireccion.
- El `RootLayout` tolera atributos agregados por extensiones sobre `body` usando `suppressHydrationWarning` para evitar falsos positivos de hidratación en desarrollo.
- El navbar principal expone Dashboard y Oportunidades como accesos directos, y agrupa Vendedores, Propietarios y Suborígenes dentro del menú desplegable Configuración.
- `GET /api/vendedores` y `/vendedores` consultan exclusivamente registros con `ven_estado = 1`.
- El listado de vendedores pagina de a 50 registros y permite buscar por codigo, nombre o sucursal.
- En el esquema SQL real, la relacion de sucursal es `vendedor.ven_sucur = sucursal.suc_codigo`.
- La relacion se resuelve con `LEFT JOIN` porque existen vendedores activos sin sucursal asociada.
- El menú Configuración del navbar concentra los módulos operativos de mantenimiento, incluyendo Vendedores, Propietarios y Suborígenes.
- El navbar principal incorpora un dropdown `PAM`; actualmente contiene `Resumen`, `Rendimiento` y `Tasas de cierre`, y debe permitir agregar más vistas mensuales en el futuro.
- El dropdown `PAM` incluye también la vista `Participación Digital`.
- Las oportunidades se almacenan en MongoDB mediante upsert por `oportunidadId`.
- Las colecciones son `oportunidades`, `asociaciones_propietario_vendedor`, `clasificaciones_propietario_oportunidad` e `importaciones_oportunidades`.
- Las colecciones de clasificación de oportunidades son `suborigenes_oportunidad` y `asociaciones_origen_suborigen`.
- Los CSV de oportunidades usan `;`, aceptan UTF-8 o Windows-1252 y un maximo de 10 MB o 50.000 filas.
- Los CSV de colaboradores de oportunidades usan `;`, aceptan UTF-8 o Windows-1252 y sincronizan `colaborador` por `Id. de la oportunidad` sin crear oportunidades nuevas.
- Los CSV incluyen `Tipo de registro de la oportunidad`, persistido en MongoDB como `tipoRegistro` opcional.
- El campo `colaborador` en oportunidades es `boolean | null`; la importacion de colaboradores guarda `true` si hay miembro de equipo y `false` si no hay dato o si la oportunidad no aparece en la foto completa importada.
- El modelo Mongoose de oportunidades actualiza el esquema cacheado durante hot reload para que campos nuevos como `tipoRegistro` no sean descartados en desarrollo.
- La validacion completa ocurre antes de escribir; los archivos invalidos no modifican MongoDB.
- El propietario se identifica por su nombre normalizado y se relaciona uno a uno con un vendedor SQL activo.
- Las asociaciones pueden reasignarse directamente desde Vendedores mediante confirmacion; la API exige `reemplazar: true` cuando existe un conflicto.
- `/oportunidades` muestra todos los propietarios sin vendedor, la cantidad de oportunidades afectadas y un acceso directo al modulo Vendedores para completar asociaciones.
- Cambiar el propietario importado recalcula el codigo de vendedor asociado.
- Al consultar el resumen de Oportunidades se reconcilia `vendedorCodigo` con las asociaciones propietario-vendedor para reparar datos históricos desactualizados.
- Las oportunidades ausentes en cargas posteriores nunca se eliminan.
- Cada origen importado puede asociarse a un único suborigen, pero la fuente de verdad de esa clasificación es exclusivamente `asociaciones_origen_suborigen`; no propagar el cambio reescribiendo oportunidades históricas.
- La compatibilidad con oportunidades históricas normaliza orígenes en la aplicación; no usar `$regexReplace` en agregaciones porque la instancia MongoDB actual no lo admite.
- Los totales por suborigen se derivan de las asociaciones origen-suborigen y los orígenes importados; al consultar el catálogo se sincroniza `suborigenNombre` de historiales pendientes.
- Los suborígenes se crean manualmente, pueden activarse o desactivarse, y no pueden eliminarse mientras tengan orígenes asociados.
- `Presupuesto sincronizado` es booleano: contenido no vacio equivale a `true`.
- Las fechas de oportunidades se guardan en UTC y se muestran como `dd/MM/yyyy`.
- Las rutas publicas del modulo son `GET /api/oportunidades`, `POST /api/oportunidades/importar`, `GET /api/propietarios-oportunidad` y `PUT /api/vendedores/{codigo}/propietario-oportunidad`.
- Las rutas públicas de clasificación de propietarios son `GET /api/clasificaciones-propietario-oportunidad` y `PUT /api/clasificaciones-propietario-oportunidad/{propietarioClave}`.
- La actualización de clasificación de propietarios persiste por upsert en MongoDB y devuelve el grupo confirmado sin afectar la importación histórica.
- La escritura de clasificación usa siempre el grupo normalizado (`Vendedor`, `Gerencia`, `Call Center`) tanto en la persistencia como en la respuesta.
- Las rutas publicas de oportunidades incluyen tambien `POST /api/oportunidades/importar-colaboradores` para sincronizar el indicador `colaborador`.
- Las rutas públicas de suborígenes son `GET|POST /api/suborigenes-oportunidad`, `PUT|DELETE /api/suborigenes-oportunidad/{id}`, `GET /api/origenes-oportunidad` y `PUT /api/origenes-oportunidad/{origenNormalizado}/suborigen`.
- Las rutas públicas de pre leads son `GET|POST /api/pre-leads`, `PUT|DELETE /api/pre-leads/{id}`.
- La colección MongoDB para insumo manual del funnel es `pre_leads_mensuales`.
- Cada registro de pre leads es único por combinación `periodo + tipoRegistro + suborigen`; `tipoRegistro` vacío se normaliza como `Sin tipo de registro`.
- La carga manual de `Pre Leads` debe elegir el `tipoRegistro` desde los valores reales ya importados en oportunidades; no usar `Sin tipo de registro` como opción de alta o edición.
- La carga manual de `Pre Leads` debe elegir también el `suborigen` desde el catálogo activo; no usar `Sin suborigen` como opción de alta o edición.
- Cada registro manual de `pre_leads_mensuales` guarda `total`, `presupuesto` y `gasto` para la misma combinación `periodo + tipoRegistro + suborigen`.
- El modelo Mongoose de `pre_leads_mensuales` debe actualizar el esquema cacheado durante hot reload para no perder campos nuevos como `presupuesto` y `gasto`.
- `GET /api/rendimiento?periodo=YYYY-MM&suborigen=...` cruza pre leads manuales con oportunidades creadas en el mes por `tipoRegistro`, filtrando únicamente propietarios clasificados como `Vendedor` y, cuando aplica, por el `suborigen` seleccionado.
- En Rendimiento, `Leads` cuenta oportunidades del período, `Ventas` cuenta etapas `Venta` o `Venta plan`, `Tasa de conversión` es leads dividido pre leads, `Tasa de cierre` es ventas dividido leads y `Tasa de pre leads` es ventas dividido pre leads.
- En Rendimiento, `Costo por venta` es `gasto / ventas`, y la comparativa mensual usa la variación porcentual contra el costo por venta del mes anterior para el mismo `tipoRegistro`.
- `GET /api/dashboard/oportunidades?periodo=YYYY-MM` entrega las métricas mensuales por etapa y propietario basadas exclusivamente en `fechaCreacion` UTC y filtradas a propietarios clasificados como `Vendedor`.
- Las lecturas de gráficos de Dashboard y Rendimiento ya no agregan en vivo desde las colecciones base; consumen snapshots de `dashboard_oportunidades_totalizadas` y `rendimiento_totalizado`.
- La colección `dashboard_oportunidades_totalizadas` guarda un snapshot global y snapshots por período con los mismos contratos públicos actuales del Dashboard.
- La colección `rendimiento_totalizado` guarda un catálogo global y snapshots por combinación `periodo + suborigenFiltro` para sostener la vista de Rendimiento.
- La colección `rendimiento_totalizado` también guarda los insumos totalizados de `PAM > Resumen`: tendencia anual de pre leads por `tipoRegistro`, pie mensual de oportunidades por `tipoRegistro` y tabla mensual de leads/ventas por `suborigen` y negocio.
- La colección `rendimiento_totalizado` también guarda la serie anual y el resumen acumulado de `PAM > Participación Digital`.
- La colección `pam_cierre_totalizado` guarda snapshots por combinación `periodo + suborigenFiltro + tipoRegistroFiltro` para sostener `PAM > Tasas de cierre`.
- Cuando cambie el contrato de `rendimiento_totalizado`, el sistema debe invalidar snapshots viejos por `versionCalculo` y el modelo Mongoose cacheado debe agregar los campos nuevos durante hot reload para no perder datos materializados.
- Si un campo materializado de `rendimiento_totalizado` cambia de forma entre releases, el modelo Mongoose cacheado debe reemplazar también el path anterior durante hot reload; no alcanza con agregarlo si ya existe con un tipo incompatible.
- Dashboard, Rendimiento y Resumen deben resolver el suborigen a partir de `origenNormalizado` y `asociaciones_origen_suborigen` durante la reconstrucción de snapshots; no depender de `suborigenNombre` denormalizado en `oportunidades`.
- El módulo `Suborígenes` no debe ejecutar reparaciones masivas sobre `oportunidades` al refrescar el catálogo o al asignar una relación.
- El módulo servidor `src/lib/analytics-totals.ts` es la única pieza autorizada para reconstruir snapshots analíticos materializados.
- Las importaciones de oportunidades y colaboradores reconstruyen sincrónicamente Dashboard y Rendimiento antes de responder la API.
- Las mutaciones de asociaciones vendedor-propietario, clasificaciones de propietario, asociaciones/renombres de suborigen y CRUD de pre leads deben actualizar snapshots totalizados en el mismo flujo de escritura.
- Si faltan snapshots analíticos, la aplicación ejecuta un rebuild completo una sola vez antes de servir la primera lectura para no dejar gráficos vacíos con históricos ya cargados.
- La conexión Mongo debe operar con `retryWrites=false` salvo que la infraestructura futura confirme soporte explícito para retryable writes.
- La reconstrucción de snapshots no debe depender de transacciones MongoDB, porque el deployment actual puede ejecutarse sobre una instancia sin soporte para sesiones transaccionales.
- El Dashboard abre con el mes más reciente que tenga oportunidades; los valores vacíos se muestran como `Sin etapa` o `Sin propietario`.
- Todo propietario nuevo o aún no clasificado se considera `Vendedor` por defecto hasta recibir una clasificación manual.
- El estado global del Dashboard no usa filtro de fecha: las etapas `Negociacion`/`Negociación` e `Inicial` se consideran abiertas y todas las demás, cerradas.
- El gráfico mensual por propietario apila oportunidades abiertas y cerradas usando la misma clasificación del estado global.
- La tendencia histórica no responde al filtro mensual: agrupa por mes UTC de `fechaCreacion`, apila abiertas/cerradas y superpone la línea de ingresos totales.
- El Dashboard muestra dos Treemap por `suborigenNombre`: uno global y otro afectado por el período seleccionado; los valores vacíos se agrupan como `Sin suborigen`.
- El Dashboard muestra un pie global por `tipoRegistro`; los vacíos se agrupan como `Sin tipo de registro`.
- El Dashboard muestra un pie global de colaboración: `colaborador: true` se cuenta como `Colaboradas`, mientras `false` y `null` se agrupan como `No colaboradas`.
- El gráfico histórico mensual agrega una línea por cada `tipoRegistro`, además de las barras abiertas/cerradas y la línea total.
- El Dashboard incluye una tabla del período activo por suborigen y `tipoRegistro`; leads cuenta oportunidades, ventas cuenta etapas `Venta` o `Venta plan`, y la tasa es ventas dividido leads.
- `GET /api/resumen?periodo=YYYY-MM` entrega la vista `Resumen` de PAM usando snapshots totalizados, con selector mensual independiente.
- `GET /api/participacion-digital?periodo=YYYY-MM` entrega la vista `Participación Digital` de PAM usando snapshots totalizados.
- `GET /api/tasas-cierre?periodo=YYYY-MM&tipoRegistro=...&suborigen=...` entrega la vista `Tasas de cierre` de PAM usando snapshots totalizados por propietario.
- En `PAM > Resumen`, el gráfico anual muestra pre leads por `tipoRegistro` para el año del mes seleccionado.
- En `PAM > Resumen`, el gráfico anual de pre leads debe priorizar legibilidad: líneas con trazo visible, puntos marcados y etiquetas de valor por mes sobre cada serie.
- En `PAM > Resumen`, la distribución mensual de oportunidades por `tipoRegistro` se representa con una única barra apilada, mostrando cantidad y porcentaje por segmento.
- En `PAM > Resumen`, el gráfico mensual de oportunidades admite filtro multiselección por `suborigen` dentro de un dropdown compacto con checkboxes, reutilizando la tabla totalizada mensual del período.
- En `PAM > Resumen`, el dropdown de `suborigen` debe conservarse visualmente a la izquierda del contador de oportunidades también en anchos reducidos, priorizando una lectura horizontal compacta.
- En `PAM > Resumen`, la barra apilada de oportunidades debe ocupar todo el alto disponible dentro de su card para evitar espacio vacío y equilibrar visualmente la fila con la tabla comercial.
- En `PAM > Resumen`, cada `tipoRegistro` debe conservar un color estable y coincidente entre segmento, leyenda, etiqueta y tooltip para evitar ambigüedad visual.
- En `PAM > Resumen`, la barra apilada mensual debe ocupar aproximadamente el 80% del ancho útil del gráfico y priorizar una paleta con contraste claro entre tipos de registro.
- En `PAM > Resumen`, cuando se muestren pocos tipos de registro en simultáneo, la asignación de color debe evitar tonos vecinos o demasiado parecidos dentro de la misma barra visible.
- En `PAM > Resumen`, la tabla mensual muestra leads y ventas por `suborigen` y `tipoRegistro`, con subtotales y total general.
- En `PAM > Participación Digital`, el gráfico anualizado compara la participación por `tipoRegistro`; cada serie usa la tasa `ventas colaboradas / ventas totales` del mismo negocio para cada mes del año seleccionado.
- En `PAM > Participación Digital`, las etiquetas y tooltips del gráfico deben mostrar porcentajes explícitos, no ratios decimales crudos.
- En `PAM > Tasas de cierre`, la tasa por propietario se calcula como `ventas / oportunidades`, filtrable por mes, `tipoRegistro` y `suborigen`.
- En `PAM > Tasas de cierre`, el gráfico principal combina barras de oportunidades y ventas con una línea de tasa de cierre sobre eje secundario, manteniendo lectura compacta y rotación de etiquetas para propietarios largos.

## Sistema visual del proyecto

- Concepto: consola de observabilidad para fuentes de datos.
- Paleta: base monocromatica del preset, verde tecnico para estados operativos y rojo para fallas.
- Tipografia: Nunito Sans en todo el proyecto para respetar el preset `b1D0dvg8`, incluyendo titulos, lectura, datos y graficos.
- Espaciado: escala basada en multiplos de 4 px.
- Bordes: radio base de 0.45rem y lineas finas con el token `--border`.
- Sombras: suaves y de baja opacidad, reservadas para paneles principales.
- Componentes: paneles compactos, etiquetas tecnicas y una linea de senal que vincula las fuentes.
- Layout: navbar de ancho completo y contenido con padding reducido.
- Las fuentes del proyecto deben seguir el preset `b1D0dvg8`; si faltan localmente, instalar `Nunito Sans` y usarla en toda la app sin mezclar otras familias.
- Dashboard: métricas globales arriba en proporción `1/3 + 2/3`, una fila intermedia con pies de colaboración y tipo de registro más Treemap global/mensual, y métricas filtradas abajo en dos mitades.
- Rendimiento: vista mensual compacta con resumen consolidado y una grilla de funnels por unidad de negocio (`tipoRegistro`).
- Rendimiento: cada tarjeta por negocio incorpora además presupuesto, gasto, costo por venta y referencia compacta contra el mes anterior.
- Rendimiento: la barra superior expone un filtro opcional por `suborigen` a la izquierda del selector mensual.
- Rendimiento: los embudos comparativos deben escalar el ancho de cada negocio contra el mayor volumen del período, evitando normalizar cada tarjeta por separado.
- Rendimiento: la referencia de ancho del embudo debe salir sólo de los negocios visibles; no usar el total general consolidado como máximo, y conservar siempre el orden visual `Pre Leads`, `Leads`, `Ventas`.
- PAM Resumen: layout full-width y compacto, con una fila superior para la línea anual y una fila inferior `1/3 + 2/3` para pie mensual y tabla comercial.
- PAM Resumen: compactar padding del panel de distribución y la altura de filas de la tabla comercial para reducir aire vacío junto al bloque de conversión.
- PAM Resumen: el gráfico mensual de oportunidades debe estirarse verticalmente hasta el fondo del panel cuando comparta fila con la tabla de conversión.
- PAM Tasas de cierre: layout full-width con filtros superiores, resumen consolidado compacto y un gráfico comparativo por propietario como panel principal.
- PAM Participación Digital: layout full-width con selector mensual, resumen anual compacto y gráfico principal combinado de barras más línea porcentual.
- PAM Resumen: los paneles contiguos del bloque mensual deben quedar alineados en borde superior y separación, sin desfases verticales entre gráfico y tabla.
- La tabla comercial del Dashboard ocupa todo el ancho, presenta subtotales por suborigen y conserva scroll horizontal en móvil.
- Tablas: grillas operativas de ancho completo, filas compactas y scroll horizontal controlado en pantallas pequenas.
- Oportunidades: metricas lineales compactas, historial de ultima carga y diez registros recientes sin graficos.
- Propietarios: tabla compacta full-width con búsqueda, grupo operativo, total de oportunidades y vendedor asociado.
- Suborígenes: catálogo compacto y tabla full-width para asociar los orígenes detectados, con cambios retroactivos.
- Pre Leads: catálogo compacto full-width con alta manual por mes, negocio y total, búsqueda por texto y edición inline.
- Pre Leads: la grilla full-width expone además presupuesto y gasto junto con el volumen de pre leads en la misma fila de mantenimiento.
- Pre Leads: los campos monetarios deben mostrarse y editarse con máscara local `es-AR`, usando separador de miles y coma decimal.
- Pre Leads: la carga manual y la búsqueda operan también por `suborigen`, para sostener el análisis filtrado de Rendimiento.
- La tabla de asociación de orígenes permite filtrar la cola pendiente sin suborigen además de buscar por texto.
- Produccion containerizada: Next.js debe compilar con `output: "standalone"` y publicarse como imagen en GHCR `ghcr.io/francocsanchez/intra-pam:latest`.
- Portainer usa `docker-compose.yml` sin `build:` y con `container_name: intra-pam`, puerto externo fijo `32772` hacia el puerto interno `3000`.
- En despliegues junto a Auth Central en Docker, el stack `intra-pam` debe unirse a la red Docker externa `internal-apps` y resolver `CENTRAL_AUTH_URL` por la URL interna `http://auth-central:3000`.
- El despliegue productivo depende de variables `MONGODB_URI`, `CENTRAL_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `CENTRAL_APP_KEY`, `DBUSER_NIC`, `DBPASS_NIC`, `DBHOST_NIC`, `DATABASE_NIC`, `DBPORT_NIC`, `DB_CONNECTION_TIMEOUT_MS`, `SQL_ENCRYPT` y `SQL_TRUST_SERVER_CERTIFICATE`.
