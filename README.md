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

## Conexiones

- MongoDB usa un pool reutilizable mediante Mongoose y tiene permisos de lectura y escritura.
- SQL Server usa un pool reutilizable con intencion de solo lectura y el usuario `Consulta`.
- `GET /api/health` devuelve el estado actual de ambas fuentes sin exponer credenciales ni direcciones de red.

## Vendedores

- La opcion `Vendedores` del navbar abre el listado de vendedores activos de SQL Server.
- La tabla muestra codigo, nombre, sucursal y estado, con 50 registros por pagina.
- El buscador filtra por codigo de vendedor, nombre o nombre de sucursal.
- `GET /api/vendedores?page=1&q=texto` ofrece los mismos datos en formato JSON.
- El esquema real utiliza `vendedor.ven_sucur = sucursal.suc_codigo`; se usa `LEFT JOIN` para conservar vendedores sin sucursal asociada.
