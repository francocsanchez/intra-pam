# Intra PAM

Aplicacion interna para analizar informacion proveniente de distintas fuentes de datos. La primera etapa verifica la conectividad con MongoDB y SQL Server.

## Requisitos

- Node.js 20.19 o superior.
- MongoDB disponible en la direccion configurada.
- Acceso de red al servidor SQL Server.

## Configuracion

1. Copiar `.env.example` como `.env.local` para desarrollo.
2. Ajustar los valores del entorno si corresponde.
3. Ejecutar `npm install`.
4. Ejecutar `npm run dev` y abrir `http://localhost:3000`.

Para produccion, copiar `.env.example` como `.env.production`. Next.js reconoce ese nombre automaticamente al ejecutar `npm run build` y `npm start`.

## Produccion con Docker y Portainer

- El proyecto genera una imagen de produccion con `Dockerfile` multi-stage y `output: "standalone"` de Next.js.
- El stack de Portainer usa la imagen publicada en GHCR y expone la app en `32772` hacia el puerto interno `3000`.
- La guia operativa completa de despliegue y actualizacion esta en `PRODUCCION.md`.

## Auth Central

- La aplicacion ahora delega autenticacion, sesiones, acceso por aplicacion y logout en Auth Central.
- Variables requeridas:
  - `CENTRAL_AUTH_URL`
  - `NEXT_PUBLIC_APP_URL`
  - `CENTRAL_APP_KEY`
- La validacion de sesion se realiza server-to-server contra `GET {CENTRAL_AUTH_URL}/api/internal/session?appKey={CENTRAL_APP_KEY}` reenviando la `cookie` del request actual.
- Si no hay sesion central valida, cualquier pagina o API del modulo redirige al login central.
- Si existe sesion pero la app no tiene acceso habilitado, las vistas muestran `/forbidden` y las APIs responden `403`.
- `GET /logout` redirige al logout central y vuelve a la raiz de la app.

### Prueba local con Auth Central

1. Levantar Auth Central en otro puerto, por ejemplo `http://localhost:3100`.
2. Configurar en `.env.local`:
   - `CENTRAL_AUTH_URL=http://localhost:3100`
   - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
   - `CENTRAL_APP_KEY=REEMPLAZAR_CON_EL_KEY_DE_ESTA_APP`
3. Ejecutar `npm run dev`.
4. Navegar a `http://localhost:3000` sin sesion y verificar la redireccion al login central.
5. Probar un usuario con acceso denegado para confirmar la vista `403`.
6. Probar un usuario con acceso habilitado para validar dashboard, modulos y logout central.

## Conexiones

- MongoDB usa un pool reutilizable mediante Mongoose y tiene permisos de lectura y escritura.
- SQL Server usa un pool reutilizable con intencion de solo lectura y el usuario `Consulta`.
- `GET /api/health` devuelve el estado actual de ambas fuentes sin exponer credenciales ni direcciones de red, pero ahora tambien requiere sesion central valida.

## Vendedores

- La opcion `Vendedores` del navbar abre el listado de vendedores activos de SQL Server.
- La tabla muestra codigo, nombre, sucursal y estado, con 50 registros por pagina.
- El buscador filtra por codigo de vendedor, nombre o nombre de sucursal.
- `GET /api/vendedores?page=1&q=texto` ofrece los mismos datos en formato JSON.
- El esquema real utiliza `vendedor.ven_sucur = sucursal.suc_codigo`; se usa `LEFT JOIN` para conservar vendedores sin sucursal asociada.
- La columna `Propietario de oportunidad` permite asociar un propietario importado con un vendedor activo.
- La asociacion es uno a uno: un propietario por vendedor y un vendedor por propietario.
- Para corregir una asignacion, puede seleccionarse otro propietario o vendedor y confirmar el reemplazo; las oportunidades relacionadas se actualizan automaticamente.

## Oportunidades

- La opcion `Oportunidades` permite importar reportes CSV separados por `;` en UTF-8 o Windows-1252.
- Cada importacion valida el archivo completo y actualiza o crea registros por `Id. de la oportunidad`.
- El archivo puede contener hasta 50.000 registros y pesar como maximo 10 MB.
- Las fechas usan el formato `dd/MM/yyyy`; los valores vacios se guardan como `null`.
- La columna `Tipo de registro de la oportunidad` se importa en MongoDB como `tipoRegistro`; los valores vacíos se guardan como `null`.
- El archivo de colaboradores se importa por separado usando `Id. de la oportunidad` y actualiza `colaborador` sin crear oportunidades nuevas.
- Si `Nombre del miembro del equipo` tiene contenido se guarda `colaborador = true`; si está vacío o la oportunidad no aparece en la foto completa importada se guarda `false`.
- `Presupuesto sincronizado` se guarda como booleano segun tenga o no contenido.
- La pantalla resume totales, etapas, presupuestos, asociaciones pendientes y las diez oportunidades mas recientes.
- Cada oportunidad conserva su origen importado y puede recibir un suborigen operativo. Los cambios de clasificación actualizan también las oportunidades ya almacenadas.

### API de oportunidades

- `POST /api/oportunidades/importar`: recibe `multipart/form-data` con el campo `file`.
- `POST /api/oportunidades/importar-colaboradores`: recibe `multipart/form-data` con el campo `file` y sincroniza el indicador `colaborador`.
- `GET /api/oportunidades`: devuelve resumen, ultima importacion y registros recientes.
- `GET /api/propietarios-oportunidad`: devuelve propietarios detectados y asociaciones.
- `PUT /api/vendedores/{codigo}/propietario-oportunidad`: asocia o desasocia mediante `{ "propietario": string | null, "reemplazar"?: boolean }`; responde `409` antes de reemplazar una asociacion existente.

## Suborígenes

- La opción `Suborígenes` permite crear, renombrar, activar o desactivar el catálogo de suborígenes.
- Un origen importado puede asociarse a un único suborigen; un suborigen puede agrupar múltiples orígenes.
- Los orígenes surgen de los CSV y se administran desde una tabla con búsqueda y selector. Desasociar un origen deja sus oportunidades con `suborigenNombre = null`.
- La clasificación es retroactiva: asociar, reasignar, desasociar o renombrar actualiza las oportunidades históricas de inmediato.

### API de suborígenes

- `GET /api/suborigenes-oportunidad`: lista catálogo y conteos operativos.
- `POST /api/suborigenes-oportunidad`: crea mediante `{ "nombre": string }`.
- `PUT /api/suborigenes-oportunidad/{id}`: actualiza `{ "nombre"?: string, "activo"?: boolean }`.
- `DELETE /api/suborigenes-oportunidad/{id}`: solo elimina registros sin orígenes asociados.
- `GET /api/origenes-oportunidad`: lista orígenes detectados, asociación vigente y oportunidades afectadas.
- `PUT /api/origenes-oportunidad/{origenNormalizado}/suborigen`: asigna o quita mediante `{ "suborigenId": string | null }`.

## Pruebas

Ejecutar `npm test` para validar el parser CSV y las reglas de normalización, además de `npm run lint` y `npm run build`.
