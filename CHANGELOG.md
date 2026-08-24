# Changelog

## 2026-08-24

### Agregado

- Conexion reutilizable a MongoDB mediante Mongoose.
- Pool de conexion de solo consulta a SQL Server.
- Endpoint `GET /api/health` con diagnostico seguro de ambas fuentes.
- Pantalla inicial responsive con estado, latencia y permisos de cada base de datos.
- Configuracion de entorno de ejemplo para desarrollo y produccion.
- Sistema visual propio basado en el preset obligatorio de shadcn.
- Navbar principal con el modulo Vendedores.
- Endpoint `GET /api/vendedores` con busqueda y paginacion de 50 registros.
- Tabla responsive de vendedores activos con su sucursal asociada.

### Modificado

- El inicio ahora muestra unicamente dos lineas centrales con el estado de MongoDB y SQL Server.
- La interfaz usa todo el ancho disponible y espaciados compactos.
