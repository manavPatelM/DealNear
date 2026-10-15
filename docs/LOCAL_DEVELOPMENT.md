# Local development

## PostgreSQL

The repository provides a disposable PostgreSQL 16 dependency through Docker
Compose. It is local-only and does not create AWS resources.

Start it:

```text
docker compose up -d postgres
```

Check its status:

```text
docker compose ps
```

Stop the database while retaining local data:

```text
docker compose stop postgres
```

Remove the container and local database volume:

```text
docker compose down -v
```

The `-v` option permanently removes the local PostgreSQL data.

## Vendor service against PostgreSQL

From `services/vendor-service`, package and start the service:

```text
mvn package -DskipTests
java -jar target/vendor-service-0.1.0.jar
```

The default application configuration connects to the Compose database:

```text
DATABASE_URL=jdbc:postgresql://localhost:5432/dealnear
DATABASE_USERNAME=dealnear
DATABASE_PASSWORD=dealnear
JWT_SECRET=replace-with-a-local-secret
```

Flyway applies the `stores` migration during startup. The application listens
on port `8081`.

## Offer projection delivery metrics

When the offer-service dispatcher is enabled, delivery metrics are available
locally without exposing event payloads or identifiers:

```text
GET http://localhost:8082/actuator/metrics/dealnear.offer.projection.delivery
GET http://localhost:8082/actuator/metrics/dealnear.offer.projection.delivery.duration
```

The delivery counter uses only the stable `result` tag (`success` or
`failure`). The dispatcher remains disabled by default.
## Full local stack

The complete local stack runs PostgreSQL/PostGIS, vendor-service,
discovery-service, offer-service, identity-service, and the API gateway:

```text
docker compose up --build
```

The customer web application is available at `http://localhost:5173`.
The gateway is available at `http://localhost:3000`. Individual services are
also exposed for focused debugging on ports `8081` through `8084`.

Compose uses local-only credentials and projection tokens. Do not reuse these
values outside local development. Stop the stack with:

```text
docker compose down
```

The PostgreSQL volume is retained by default. To remove local database data,
run `docker compose down -v` only when that data can be discarded.
