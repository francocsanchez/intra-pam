# Produccion con Portainer

## Datos del despliegue

- Imagen GHCR: `ghcr.io/francocsanchez/intra-pam:latest`
- Nombre recomendado del Stack: `intra-pam`
- Nombre del contenedor: `intra-pam`
- Puerto externo: `32772`
- Puerto interno del contenedor: `3000`

## Variables de entorno requeridas

- `MONGODB_URI`
- `CENTRAL_AUTH_URL`
- `NEXT_PUBLIC_APP_URL`
- `CENTRAL_APP_KEY`
- `DBUSER_NIC`
- `DBPASS_NIC`
- `DBHOST_NIC`
- `DATABASE_NIC`
- `DBPORT_NIC` opcional, por defecto `1433`
- `DB_CONNECTION_TIMEOUT_MS` opcional, por defecto `5000`
- `SQL_ENCRYPT` opcional, por defecto `false`
- `SQL_TRUST_SERVER_CERTIFICATE` opcional, por defecto `true`

`NEXT_PUBLIC_APP_URL` debe apuntar a la URL publica real de la app, incluyendo el puerto `32772` si no hay proxy inverso delante.

## Flujo de publicacion

1. Subir cambios a la rama `main`.
2. GitHub Actions ejecuta `.github/workflows/docker-publish.yml`.
3. La imagen se publica en GHCR con `latest` y `sha-<commit>`.

## Crear el Stack en Portainer

1. Ir a `Stacks`.
2. Crear un stack nuevo con nombre `intra-pam`.
3. Pegar el contenido de `docker-compose.yml`.
4. Completar las variables de entorno requeridas en Portainer.
5. Hacer `Deploy the stack`.

La aplicacion quedara disponible en `http://IP_DEL_SERVIDOR:32772`.

## Actualizar la aplicacion

1. Hacer `git push` a `main`.
2. Esperar a que GitHub Actions publique la nueva imagen.
3. En Portainer, abrir el stack `intra-pam`.
4. Ejecutar `Pull and redeploy` o recrear el stack para forzar descarga de la nueva `latest`.

## Operacion basica en Portainer

- Ver logs: abrir el contenedor `intra-pam` y entrar en `Logs`.
- Reiniciar: usar `Restart` sobre el contenedor o `Redeploy` sobre el stack.
- Verificar servicio: abrir `http://IP_DEL_SERVIDOR:32772` y confirmar carga del dashboard autenticado.

## Persistencia

No se configuraron volumenes porque la app no declara almacenamiento local persistente. MongoDB y SQL Server permanecen externos al contenedor.
