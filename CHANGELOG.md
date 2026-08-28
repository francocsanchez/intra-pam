# Changelog

## 2026-08-28

### Agregado

- Preparacion de produccion con `Dockerfile` multi-stage para Next.js standalone.
- Nuevos archivos `.dockerignore`, `docker-compose.yml` para Portainer y workflow de GitHub Actions para publicar en GHCR.
- Guia operativa `PRODUCCION.md` para despliegue y actualizacion desde Portainer.

### Modificado

- `.env.example` deja de incluir credenciales reales y ahora documenta solo las variables requeridas para despliegue.
- Los enlaces de perfil y logout central ahora usan navegacion directa del navegador para evitar que Next intercepte el flujo y deje la sesion activa en Auth Central.

## 2026-08-27

### Agregado

- Integracion inicial con Auth Central para proteger toda la app y todas las rutas `src/app/api/*` mediante `middleware`.
- Helpers reutilizables en `src/lib/auth/central.ts` y `src/lib/auth/central-shared.ts` para consultar sesion central, resolver rol por aplicacion y construir redirecciones de login/logout.
- Pantalla local `/forbidden` para informar accesos denegados y ruta `GET /logout` para delegar el cierre de sesion en Auth Central.
- Nuevas variables de entorno `CENTRAL_AUTH_URL`, `NEXT_PUBLIC_APP_URL` y `CENTRAL_APP_KEY`.
- Pruebas unitarias para helpers de Auth Central y para el flujo del `middleware`.

### Modificado

- El navbar ahora agrupa marca y navegación completamente a la izquierda, y reemplaza el bloque de sesión por un dropdown `Mi Perfil`.
- El dropdown `Mi Perfil` enlaza al perfil central de Auth Central, desde donde se puede editar la cuenta, cambiar la password y cerrar sesión.
- Se elimina el redirect de `/forbidden` desde `RootLayout` para evitar loops `307`; esa decision queda centralizada en `middleware`.
- El `RootLayout` ahora corta el render y redirige al login central cuando la sesion no esta disponible, reforzando la proteccion de paginas aun si el contexto visual del navbar no llega a poblarse.
- El navbar ahora mantiene siempre visible una accion de cierre/cambio de sesion central, incluso cuando el contexto del usuario aun no muestra nombre o email.
- El `RootLayout` ahora obtiene contexto minimo del usuario autenticado y el navbar muestra identidad basica, rol de aplicacion y acceso visible a logout central.
- La documentacion del proyecto ahora explica la configuracion y prueba local de Auth Central.
- `GET /api/health` deja de ser publico en esta primera etapa y queda protegido por sesion central al igual que el resto del modulo.

### Agregado

- Nueva vista `PAM > Participación Digital` con pantalla `/participacion-digital` y ruta pública `GET /api/participacion-digital?periodo=YYYY-MM`.
- Gráfico anualizado con ECharts para comparar `ventas colaboradas` contra `total de oportunidades`, incluyendo la línea de `% de participación digital`.
- Nuevos campos materializados en `rendimiento_totalizado` para servir la serie anual de participación digital y su resumen acumulado por año.

### Modificado

- El tooltip del gráfico `PAM > Participación Digital` ahora muestra cada serie con porcentaje explícito, evitando ratios decimales crudos en hover.
- El modelo cacheado de `RendimientoTotalizado` ahora reemplaza en hot reload la forma vieja de `resumenParticipacionDigital` cuando venía como documento embebido, evitando el `ValidationError` al reconstruir snapshots con el nuevo arreglo por `tipoRegistro`.
- `PAM > Participación Digital` ahora mide la participación por `tipoRegistro`, calculando `ventas colaboradas / ventas totales` para cada negocio en lugar de usar una tasa global contra todas las oportunidades.
- El gráfico anual de `Participación Digital` pasó a mostrar una línea independiente por `tipoRegistro`, y el resumen superior ahora desglosa ventas colaboradas, ventas totales y porcentaje por negocio.
- El dropdown `PAM` del navbar ahora incluye `Participación Digital` como acceso directo adicional.
- La totalizadora analítica de PAM invalida snapshots previos mediante `versionCalculo = 6` para reconstruir también la nueva métrica de participación digital por `tipoRegistro`.

## 2026-08-26

### Agregado

- Nueva vista `PAM > Tasas de cierre` con filtros por mes, `tipoRegistro` y `suborigen`, orientada a analizar `ventas / oportunidades` por propietario.
- Ruta pública `GET /api/tasas-cierre?periodo=YYYY-MM&tipoRegistro=...&suborigen=...` y pantalla `/tasas-cierre`.
- Colección MongoDB `pam_cierre_totalizado` para servir snapshots materializados de tasas de cierre por propietario.
- Gráfico combinado con ECharts para `Tasas de cierre`, usando barras de oportunidades/ventas y línea de tasa por propietario.
- Módulo `PAM` en el navbar con la nueva vista `Resumen` como primer tablero del plan de acción mensual.
- Ruta pública `GET /api/resumen?periodo=YYYY-MM` y pantalla `/resumen` con selector mensual propio.
- Serie anual materializada de `pre leads` por `tipoRegistro` para el año del mes seleccionado.
- Snapshot mensual materializado de oportunidades por `tipoRegistro` para alimentar el gráfico pie de `Resumen`.
- Snapshot mensual materializado de `leads` y `ventas` por `suborigen` y `tipoRegistro` dentro de `rendimiento_totalizado` para reutilizar la misma base totalizada en `Resumen`.

- Colecciones MongoDB `dashboard_oportunidades_totalizadas` y `rendimiento_totalizado` para servir snapshots analíticos precalculados.
- Módulo servidor `src/lib/analytics-totals.ts` para reconstruir snapshots de Dashboard y Rendimiento desde las colecciones base.
- Metadatos de snapshot `actualizadoEn`, `fuente`, `versionCalculo` y `periodosAfectados` para diagnóstico de la analítica materializada.

### Modificado

- `PAM > Resumen` ahora permite filtrar el gráfico mensual de oportunidades por uno o varios `suborígenes` desde un dropdown compacto con checkboxes, recalculando la distribución a partir de la tabla totalizada mensual ya cargada.
- `PAM > Resumen` ajusta en responsive el header del card de distribución para mantener el selector de `suborigen` a la izquierda del contador de oportunidades, evitando el apilado visual incómodo.
- `PAM > Resumen` ahora estira la barra apilada de `Oportunidades por tipo de registro` hasta ocupar todo el alto útil del card, eliminando el espacio vacío bajo el gráfico.
- `PAM > Resumen` ahora fija colores estables por `tipoRegistro` en la barra apilada mensual y reutiliza el mismo mapeo en la leyenda, etiquetas y tooltip.
- `PAM > Resumen` ahora ajusta la barra apilada mensual para que ocupe cerca del 80% del ancho útil del gráfico y usa una paleta más contrastada entre negocios para mejorar la distinción visual.
- `PAM > Resumen` deja de calcular colores por hash en la barra apilada mensual y ahora asigna una secuencia fija de tonos bien separados para garantizar que cada tipo visible se distinga del resto.
- La reconstrucción analítica ahora materializa también snapshots de `Tasas de cierre` por propietario y los invalida junto con el resto cuando cambia `versionCalculo`.
- `PAM > Resumen` ahora usa una única barra apilada para `Oportunidades por tipo de registro`, siguiendo la referencia visual solicitada, y corrige el desalineado vertical entre el panel del gráfico y la tabla de conversión.
- `PAM > Resumen` reemplaza el pie de oportunidades por tipo de registro por barras horizontales apiladas con cantidad y porcentaje, y compacta el panel/tablas para aprovechar mejor el ancho disponible.
- El gráfico anual `Pre leads por tipo de registro` en `PAM > Resumen` ahora usa líneas y puntos más visibles, con etiquetas de valor por mes sobre cada serie para mejorar la lectura.
- El navbar ahora agrupa `Resumen` y `Rendimiento` dentro del dropdown `PAM`, manteniendo ambas vistas como parte de la sección mensual.
- La asignación y renombre de suborígenes dejó de reescribir históricamente la colección `oportunidades`; ahora la fuente operativa es la tabla `asociaciones_origen_suborigen` y la analítica resuelve el suborigen desde allí.
- `getSuborigenes()` ya no ejecuta reparaciones masivas sobre `oportunidades` durante cada refresh del módulo.
- Dashboard, Rendimiento y Resumen materializan sus snapshots usando la asociación `origenNormalizado -> suborigen` en tiempo de rebuild, sin depender de `suborigenNombre` denormalizado en cada oportunidad.
- El resumen de Oportunidades calcula orígenes pendientes y suborígenes recientes desde la tabla de asociaciones en lugar de leer el valor persistido en cada documento histórico.
- La colección `rendimiento_totalizado` ahora persiste también insumos de `Resumen`: tendencia anual de pre leads, pie mensual de oportunidades por tipo de registro y tabla mensual de leads/ventas por suborigen y negocio.
- El gráfico pie pedido para `Resumen` quedó definido sobre oportunidades mensuales por `tipoRegistro`, no sobre pre leads.
- El rebuild de analítica ahora invalida snapshots desactualizados por `versionCalculo` y recompone automáticamente `Resumen` cuando faltan campos nuevos en `rendimiento_totalizado`.
- El modelo cacheado de `RendimientoTotalizado` actualiza en hot reload los campos `tendenciaAnualPreLeads`, `tiposRegistroMensual` y `conversionMensual` para no descartarlos durante el rebuild.

- La conexión Mongo ahora fuerza `retryWrites=false` cuando la URI no lo declara, para compatibilidad con deployments que no soportan retryable writes.
- La reconstrucción de snapshots analíticos dejó de usar transacciones/sesiones Mongo y ahora reemplaza los snapshots con escrituras directas compatibles con instancias standalone.
- Dashboard y Rendimiento dejaron de agregar sobre `oportunidades` y `pre_leads_mensuales` en cada lectura; ahora consumen exclusivamente snapshots totalizados.
- La primera lectura de analítica inicializa snapshots faltantes mediante rebuild completo y las siguientes reutilizan la colección materializada.
- Las importaciones de oportunidades y colaboradores ahora reconstruyen en forma sincrónica las totalizadoras antes de responder.
- Los cambios manuales que afectan la lectura analítica, incluyendo asociaciones vendedor-propietario, clasificación de propietarios, asociaciones/renombres de suborigen y CRUD de pre leads, ahora regeneran snapshots sincrónicamente.
- Las pruebas de `oportunidades` y `rendimiento` se reorientaron para validar la nueva lectura delegada hacia la capa de snapshots.

### Agregado

- Módulo principal `Rendimiento` con filtro mensual y funnels de conversión por `tipoRegistro`, usando ECharts para visualizar `Pre Leads`, `Leads` y `Ventas`.
- Catálogo `Pre Leads` dentro de `Configuración` para cargar manualmente totales mensuales únicos por combinación `periodo + tipoRegistro`.
- Endpoints públicos `GET|POST /api/pre-leads`, `PUT|DELETE /api/pre-leads/{id}` y `GET /api/rendimiento?periodo=YYYY-MM`.
- Colección MongoDB `pre_leads_mensuales` con unicidad por período y tipo de registro.
- Pruebas unitarias para contrato de rendimiento, cruce analítico mensual y validación del endpoint de rendimiento.

### Modificado

- Todo el proyecto pasa a usar `Nunito Sans` para respetar literalmente el preset `b1D0dvg8`, incluyendo paneles, tablas, etiquetas técnicas y gráficos.
- La instalación local de tipografías se simplifica a `Nunito Sans` con `@fontsource`, reemplazando la configuración anterior basada en familias distintas al preset.
- El navbar principal ahora suma `Rendimiento` como acceso directo y agrega `Pre Leads` dentro del menú `Configuración`.
- El proyecto declara `baseUrl` en `tsconfig.json` para estabilizar la resolución interna de módulos durante pruebas.
- El dropdown de `Configuración` ahora se cierra automáticamente al navegar a cualquiera de sus módulos.
- La carga de `Pre Leads` ahora obliga a elegir un `tipoRegistro` existente en oportunidades y deja de proponer `Sin tipo de registro` como valor de entrada.
- El insumo mensual de `Pre Leads` ahora carga también `presupuesto` y `gasto` en la misma operación, manteniendo unicidad por `periodo + tipoRegistro`.
- `Rendimiento` ahora muestra además presupuesto, gasto, costo por venta y variación del costo por venta contra el mes anterior.
- El modelo `pre_leads_mensuales` ahora incorpora `presupuesto` y `gasto` también en hot reload, evitando que el desarrollo descarte esos campos al guardar.
- Los inputs monetarios de `Pre Leads` ahora muestran máscara local con separador de miles y decimales en formato `es-AR`.
- `Rendimiento` ahora suma filtro opcional por `suborigen`, y el CRUD de `Pre Leads` pasa a registrar `pre leads`, `presupuesto` y `gasto` por combinación `periodo + tipoRegistro + suborigen`.
- El cálculo de rendimiento, los períodos disponibles y la comparación mensual respetan el `suborigen` seleccionado tanto en oportunidades como en carga manual.
- Los funnels de `Rendimiento` ahora escalan su ancho contra el mayor volumen del período para que la comparación visual entre negocios respete la proporción real de datos.
- La escala visual del funnel ahora usa sólo los negocios comparados, conserva el orden `Pre Leads > Leads > Ventas` y, si no hay pre leads cargados en el período, cae al mayor lead para evitar una visual inválida.

## 2026-08-25

### Agregado

- Módulo `Propietarios` dentro de `Configuración` para clasificar cada propietario en `Vendedor`, `Gerencia` o `Call Center`.
- Colección MongoDB `clasificaciones_propietario_oportunidad` con persistencia por `propietarioClave` y default `Vendedor`.
- Endpoints públicos `GET /api/clasificaciones-propietario-oportunidad` y `PUT /api/clasificaciones-propietario-oportunidad/{propietarioClave}`.
- Pruebas unitarias para contrato de grupos, filtro analítico de vendedores, dashboard filtrado y validación del endpoint de actualización.

### Modificado

- La escritura de clasificación de propietarios usa el valor normalizado del grupo también dentro del `updateOne`, evitando `ReferenceError` al guardar.
- La actualización de clasificación de propietarios corrige el retorno del grupo persistido para evitar falsos `500` después de guardar.
- El dashboard ahora excluye de todos sus gráficos y totales a propietarios clasificados como `Gerencia` o `Call Center`, manteniendo visibles por defecto los no clasificados como `Vendedor`.
- La importación de oportunidades materializa la clasificación default de propietarios para sostener el filtro analítico futuro.
- El navbar de `Configuración` suma el acceso `Propietarios`.
- El resumen de Oportunidades reconcilia `vendedorCodigo` con las asociaciones propietario-vendedor vigentes y repara registros históricos desactualizados.
- Volver a guardar una asociación vendedor-propietario existente también sincroniza las oportunidades afectadas.
- El modelo cacheado de oportunidades incorpora `tipoRegistro` durante el hot reload para evitar que Mongoose descarte el campo al importar sin reiniciar el servidor.
- El modelo cacheado de oportunidades ahora incorpora también `colaborador` durante el hot reload.
- Oportunidades suma una importación separada de colaboradores por `Id. de la oportunidad`, sin mezclar ese archivo con el CSV principal.
- La sincronización de colaboradores trata cada archivo importado como una foto completa y marca `false` a las oportunidades ausentes o sin miembro cargado.
- Nuevo endpoint `POST /api/oportunidades/importar-colaboradores` y segundo cargador en la vista `/oportunidades`.

- El `RootLayout` ahora suprime warnings de hidratación sobre `body` para tolerar atributos inyectados por extensiones del navegador sin ensuciar la consola.
- El navbar ahora agrupa `Vendedores` y `Suborígenes` dentro de un menú desplegable `Configuración`, manteniendo `Dashboard` y `Oportunidades` como accesos principales.

## 2026-08-24

### Agregado

- Importación y persistencia del campo `Tipo de registro de la oportunidad` como `tipoRegistro` en cada oportunidad.

- Filtro en la asociación de orígenes para mostrar únicamente los registros que aún no tienen suborigen.

- Módulo Suborígenes para administrar un catálogo dinámico y asociar orígenes importados de oportunidades.
- Colecciones MongoDB `suborigenes_oportunidad` y `asociaciones_origen_suborigen`, con índices únicos por nombre y origen normalizados.
- Campo denormalizado `suborigenNombre` en oportunidades para consulta rápida y actualización retroactiva.
- Endpoints públicos para catálogo de suborígenes, listado de orígenes y administración de asociaciones.
- Actualización masiva inmediata de oportunidades al asignar, reasignar, desasociar o renombrar una clasificación.
- Métrica de orígenes pendientes de clasificación y columnas Origen/Suborigen en oportunidades recientes.
- Pruebas unitarias para normalización de orígenes y validación de identificadores de suborigen.

- Conexion reutilizable a MongoDB mediante Mongoose.
- Pool de conexion de solo consulta a SQL Server.
- Endpoint `GET /api/health` con diagnostico seguro de ambas fuentes.
- Pantalla inicial responsive con estado, latencia y permisos de cada base de datos.
- Configuracion de entorno de ejemplo para desarrollo y produccion.
- Sistema visual propio basado en el preset obligatorio de shadcn.
- Navbar principal con el modulo Vendedores.
- Endpoint `GET /api/vendedores` con busqueda y paginacion de 50 registros.
- Tabla responsive de vendedores activos con su sucursal asociada.
- Modulo Oportunidades con importacion CSV incremental hacia MongoDB.
- Modelos para oportunidades, asociaciones propietario-vendedor e historial de importaciones.
- Validacion de archivos UTF-8 y Windows-1252, fechas, encabezados, duplicados y limites.
- Resumen compacto de oportunidades y tabla de los diez registros mas recientes.
- Selector de propietario de oportunidad en la tabla Vendedores.
- Endpoints de importacion, resumen, propietarios y asociacion uno a uno.
- Pruebas unitarias del parser CSV mediante Vitest.
- Dashboard inicial de oportunidades con filtro mensual por fecha de creación.
- Endpoint `GET /api/dashboard/oportunidades` con métricas por etapa y propietario.
- Gráficos ECharts compactos para analizar distribución por etapa y propietario.
- Gráfico global de oportunidades abiertas y cerradas, independiente del filtro mensual.
- Clasificación global de abiertas para las etapas separadas `Negociacion`/`Negociación` e `Inicial`.
- Barras apiladas por propietario para distinguir oportunidades abiertas y cerradas dentro del período seleccionado.
- Gráfico de línea histórico con la cantidad total de oportunidades ingresadas por mes según `fechaCreacion`.
- Serie mensual combinada con barras apiladas de abiertas/cerradas y línea de ingresos totales.
- Panel en Oportunidades para identificar propietarios sin vendedor, con cantidad de oportunidades afectadas y acceso a Vendedores.
- Treemap global y Treemap mensual para analizar oportunidades por `suborigenNombre`.
- Gráfico de pie global por `tipoRegistro` y líneas históricas mensuales para cada tipo de registro.
- Gráfico de pie global para comparar oportunidades colaboradas y no colaboradas.
- Tabla mensual de leads, ventas y tasa de conversión agrupada por suborigen y tipo de registro, con subtotales y total general.

### Modificado

- Los conteos de oportunidades por suborigen ahora se calculan desde las asociaciones de origen vigentes y reparan los valores denormalizados históricos al consultar el catálogo.

- La clasificación de orígenes normaliza los registros históricos en la aplicación para mantener compatibilidad con versiones de MongoDB que no admiten `$regexReplace`.

- El inicio ahora muestra unicamente dos lineas centrales con el estado de MongoDB y SQL Server.
- La interfaz usa todo el ancho disponible y espaciados compactos.
- El selector de Vendedores permite reemplazar una asociacion existente con confirmacion previa y actualiza las oportunidades relacionadas.
- El inicio fue reemplazado por el Dashboard y el navbar incorpora ese acceso como primer módulo.
- El Dashboard separa métricas globales en una fila `1/3 + 2/3` y métricas filtradas en una fila de dos mitades.
# 2026-08-28

- Portainer y Docker: el stack `intra-pam` ahora se conecta a la red Docker externa `internal-apps` para consumir Auth Central por `http://auth-central:3000` sin cambiar la exposicion publica `32772:3000`.
- Produccion: se documentaron en `PRODUCCION.md`, `README.md` y `.env.example` los valores recomendados de `CENTRAL_AUTH_URL`, `NEXT_PUBLIC_APP_URL` y `CENTRAL_APP_KEY` para despliegues compartiendo red con Auth Central.
- Auth Central: se separo `CENTRAL_AUTH_PUBLIC_URL` para que login, logout y perfil usen la URL publica del servicio, mientras `CENTRAL_AUTH_URL` queda reservado para la comunicacion interna entre contenedores.
