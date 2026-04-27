# Tienda Virtual

Sistema e-commerce full-stack con React 18 + TypeScript en frontend y Node.js + Express + Prisma + PostgreSQL en backend.

## Stack

- Frontend: React 18, Vite, React Router v6, Zustand, React Query, React Hook Form, Zod, Axios, Recharts, React Hot Toast
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL, JWT, RBAC, Zod, Swagger, PDFKit, Puppeteer, Winston
- Base de datos: PostgreSQL con prefijos por modulo y eliminacion logica

## Arquitectura

Arquitectura de 3 capas:

1. SPA React (`apps/frontend`)
2. API REST (`apps/backend`, base path `/api/v1`)
3. PostgreSQL (`database/schema.sql` + Prisma)

Documentos Mermaid:

- Arquitectura: `docs/arquitectura.mmd`
- Modelo ER: `docs/modelo-er.mmd`

## Estructura

```
apps/
	backend/
		prisma/schema.prisma
		src/
			modules/
				auth/
				catalogo/
				carrito/
				ordenes/
				inventario/
				clientes/
				reportes/
	frontend/
		src/
			app/
			components/
			pages/
			stores/
database/
	schema.sql
docs/
	arquitectura.mmd
	modelo-er.mmd
```

## Requisitos

- Node.js 20+
- PostgreSQL 14+

## Configuracion

1. Copiar variables:

```bash
cp .env.example apps/backend/.env
cp .env.example apps/frontend/.env
```

2. Crear base de datos y tablas:

```bash
psql -U postgres -f database/schema.sql
```

3. Instalar dependencias:

```bash
npm run install:all
```

4. Generar cliente Prisma:

```bash
npm run prisma:generate --workspace apps/backend
```

## Ejecucion

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

Swagger:

- `http://localhost:4000/docs`

Frontend:

- `http://localhost:5173`

## Modulos implementados

- Auth: register/login/refresh con JWT y RBAC
- Catalogo: listado con paginacion/filtro y CRUD admin
- Carrito: persistencia local + sincronizacion backend
- Ordenes: checkout y gestion de estado
- Inventario: consulta y ajuste por admin
- Clientes: consulta y mantenimiento por admin
- Reportes: KPIs + PDF operacional y de gestion

## Seguridad

- Helmet
- CORS configurable
- Rate limiting
- Validacion de entrada con Zod
- Hash de passwords con bcrypt

## Testing

Prueba inicial con Jest + Supertest:

```bash
npm test --workspace apps/backend
```