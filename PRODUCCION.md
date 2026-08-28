# Produccion con Portainer

## Datos del despliegue

- Imagen GHCR: `ghcr.io/francocsanchez/intra-pam:latest`
- Nombre recomendado del Stack: `intra-pam`
- Nombre del contenedor: `intra-pam`
- Puerto externo: `32772`
- Puerto interno del contenedor: `3000`
- Red Docker externa compartida: `internal-apps`
- URL interna recomendada hacia Auth Central: `http://auth-central:3000`
- URL publica de esta app: `http://192.168.100.31:32772`
- URL publica de Auth Central: `http://192.168.100.31:32770`

## Variables de entorno requeridas

- `MONGODB_URI`
- `CENTRAL_AUTH_URL`
- `CENTRAL_AUTH_PUBLIC_URL`
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

## Valores recomendados para este despliegue

```env
CENTRAL_AUTH_URL=http://auth-central:3000
CENTRAL_AUTH_PUBLIC_URL=http://192.168.100.31:32770
NEXT_PUBLIC_APP_URL=http://192.168.100.31:32772
CENTRAL_APP_KEY=<app-key-correspondiente>
```

- `CENTRAL_AUTH_URL` debe resolverse por la red Docker compartida `internal-apps`; no usar la URL publica `http://192.168.100.31:32770` para la comunicacion interna entre contenedores.
- `CENTRAL_AUTH_PUBLIC_URL` debe apuntar a la URL publica de Auth Central para las redirecciones del navegador.
- `NEXT_PUBLIC_APP_URL` debe apuntar a la URL publica real de la app, incluyendo el puerto `32772` si no hay proxy inverso delante.
- `CENTRAL_APP_KEY` debe coincidir con la clave habilitada para esta app dentro de Auth Central.

## Flujo de publicacion

1. Subir cambios a la rama `main`.
2. GitHub Actions ejecuta `.github/workflows/docker-publish.yml`.
3. La imagen se publica en GHCR con `latest` y `sha-<commit>`.

## Crear el Stack en Portainer

1. Ir a `Stacks`.
2. Crear un stack nuevo con nombre `intra-pam`.
3. Crear previamente la red externa compartida si no existe:

```bash
docker network create internal-apps
```

4. Verificar que el stack de Auth Central tambien use la red externa `internal-apps` y publique el servicio con nombre `auth-central`.
5. Pegar el contenido de `docker-compose.yml`.
6. Completar las variables de entorno requeridas en Portainer.
7. Hacer `Deploy the stack`.

La aplicacion quedara disponible en `http://IP_DEL_SERVIDOR:32772`.

## Fragmento esperado de docker-compose

```yaml
services:
  intra-pam:
    image: ghcr.io/francocsanchez/intra-pam:latest
    container_name: intra-pam
    restart: unless-stopped
    ports:
      - "32772:3000"
    environment:
      NODE_ENV: production
      HOSTNAME: 0.0.0.0
      PORT: 3000
      MONGODB_URI: ${MONGODB_URI}
      CENTRAL_AUTH_URL: ${CENTRAL_AUTH_URL}
      CENTRAL_AUTH_PUBLIC_URL: ${CENTRAL_AUTH_PUBLIC_URL}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
      CENTRAL_APP_KEY: ${CENTRAL_APP_KEY}
      DBUSER_NIC: ${DBUSER_NIC}
      DBPASS_NIC: ${DBPASS_NIC}
      DBHOST_NIC: ${DBHOST_NIC}
      DBPORT_NIC: ${DBPORT_NIC:-1433}
      DATABASE_NIC: ${DATABASE_NIC}
      DB_CONNECTION_TIMEOUT_MS: ${DB_CONNECTION_TIMEOUT_MS:-5000}
      SQL_ENCRYPT: ${SQL_ENCRYPT:-false}
      SQL_TRUST_SERVER_CERTIFICATE: ${SQL_TRUST_SERVER_CERTIFICATE:-true}
    networks:
      - internal-apps

networks:
  internal-apps:
    external: true
```

## Actualizar la aplicacion

1. Hacer `git push` a `main`.
2. Esperar a que GitHub Actions publique la nueva imagen.
3. En Portainer, abrir el stack `intra-pam`.
4. Ejecutar `Pull and redeploy` o recrear el stack para forzar descarga de la nueva `latest`.

## Operacion basica en Portainer

- Ver logs: abrir el contenedor `intra-pam` y entrar en `Logs`.
- Reiniciar: usar `Restart` sobre el contenedor o `Redeploy` sobre el stack.
- Verificar servicio: abrir `http://IP_DEL_SERVIDOR:32772` y confirmar carga del dashboard autenticado.
- Verificar reachability interna: desde el contenedor `intra-pam`, Auth Central debe resolver por `http://auth-central:3000`.

## Persistencia

No se configuraron volumenes porque la app no declara almacenamiento local persistente. MongoDB y SQL Server permanecen externos al contenedor.
