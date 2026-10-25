# AI-LMS Architecture

## Decision

AI-LMS uses a feature-oriented React frontend and a Hexagonal (Ports and Adapters) backend. HTTP and MongoDB are adapters around application use cases; they are not the center of the system. Public HTTP contracts and MongoDB schemas remain stable.

`DAO` is not used. Persistence access is expressed as application-owned Repository ports and implemented by Mongoose Repository adapters.

## System flow

```text
React page/component
  -> feature public API
  -> shared HTTP client
  -> Express route/controller       (inbound adapter)
  -> application service/use case
  -> Repository port                (outbound port)
  -> Mongoose Repository adapter    (outbound adapter)
  -> Mongoose model -> MongoDB
```

The composition root is the only place that connects use cases to concrete adapters:

```text
src/composition/repositories.js
  validates Mongoose adapters against application Repository ports

src/composition/services.js
  constructor-injects repositories and collaborating use cases

src/composition/http.js
  constructs controller factories with their use cases and injects authentication
  dependencies into HTTP middleware
```

## Backend boundaries

1. `routes` compose middleware and controller handlers only.
2. `controller` is the inbound HTTP adapter. It reads HTTP data, invokes DTO validation and calls a configured use case.
3. `dto` validates, normalizes and whitelists untrusted transport input.
4. `service` contains application use cases. Services receive ports and collaborating use cases through constructors; they never import Mongoose repositories or models.
5. `application/ports/outbound` defines repository capabilities required by the application and validates adapters at startup.
6. `infrastructure/persistence/mongoose/repositories` implements those ports and owns queries, aggregation, transactions and persistence concurrency.
7. `model` contains Mongoose persistence schemas. Models do not depend on application or HTTP code.
8. `domain` contains framework-independent policies, constants and state rules.
9. `composition` is the sole wiring layer allowed to know both application code and concrete infrastructure.

Outbound gateways such as email, OAuth/token handling and generative AI are also
injected by `composition/services.js`; application services do not construct them.

The dependency rule is inward-facing:

```text
presentation/http -> application/use cases -> application ports <- infrastructure adapters
                              |
                              v
                            domain

composition ----------------------------------------------------^ (wiring only)
```

Infrastructure never imports controllers or use cases. Use cases never import infrastructure.

## Repository, DTO and model responsibilities

### Repository port

- Is owned by the application, not by MongoDB.
- Names operations in business/application language.
- Describes only capabilities required by use cases.
- Has no Mongoose, query builder or HTTP dependency.

### Mongoose Repository adapter

- Implements one or more application repository ports.
- Knows schemas, MongoDB filters, population and transactions.
- Never knows `req`, `res`, controllers, DTOs or use cases.
- Is created once and injected by the composition root.

### DTO

- Accepts untrusted boundary input.
- Validates types, ranges, identifiers and allowed fields.
- Produces plain application input.
- Never imports a Mongoose model or creates MongoDB operators.

### Mongoose model

- Defines persistence schema and database constraints only.
- Is used by repository adapters, not controllers or services.
- Is not an API DTO or a domain service.

## Frontend boundaries

```text
App/Router -> pages/components -> features/<feature>/api.js -> shared/api/client.js
                    |
                    -> feature hooks/state/components
```

1. React does not use backend MVC folders. It uses feature-oriented modules and one-way data flow.
2. `shared` is independent of pages and features.
3. Pages and reusable components consume feature public APIs, never transport modules directly.
4. Each feature owns its API facade and may depend on `shared`, but not another feature's internal implementation.
5. `App.jsx` is the frontend composition root for providers and routing.

## Executable architecture rules

Backend boundaries are enforced by `backend/tests/architecture/LayerBoundaries.test.js`. Frontend boundaries are enforced by `frontend/src/architecture/Boundaries.test.js`.

```powershell
cd backend
npm run test:architecture
npm test

cd ../frontend
npm test
npm run build
```

Architecture tests are part of the definition of done. New code must extend an application port and its adapter, then wire it in `composition`; it must not bypass a boundary.

## Development seed data

Startup never creates accounts with repository-known credentials. Optional local
seed data is disabled by default and is always disabled in production. To enable
it locally, set `ENABLE_DEVELOPMENT_SEED=true` and provide only the accounts you
need through `DEV_SEED_ADMIN_EMAIL`, `DEV_SEED_ADMIN_PASSWORD`,
`DEV_SEED_TEACHER_EMAIL` and `DEV_SEED_TEACHER_PASSWORD`.

Uploaded course thumbnails are public media. Learning materials and uploaded
lesson videos are not served by static middleware; they are downloaded through
authenticated endpoints after the corresponding use case verifies enrollment,
course ownership or administrator access.
