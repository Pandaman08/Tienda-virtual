# Guia de Despliegue: Tienda Virtual en Produccion

**Stack:** React 18 + Vite + TypeScript / Node.js + Express + Prisma / PostgreSQL  
**Infraestructura:** Vercel (frontend) + Render (backend) + Supabase (base de datos)

---

## 1. Preparacion del proyecto

### 1.1 Verificaciones previas

```bash
# Compilar backend sin errores
cd apps/backend
npx tsc --noEmit

# Compilar frontend sin errores
cd ../frontend
npx tsc -b && npx vite build
```

### 1.2 Variables de entorno — Backend

Crear `apps/backend/.env` con los valores de produccion:

```env
DATABASE_URL="postgresql://USER:PASS@HOST:6543/DB?pgbouncer=true&connection_limit=10"
DIRECT_URL="postgresql://USER:PASS@HOST:5432/DB"
JWT_ACCESS_SECRET="mínimo-48-caracteres-aleatorios"
JWT_REFRESH_SECRET="otro-secreto-distinto-mínimo-48-chars"
CORS_ORIGIN="https://TU-APP.vercel.app"
PORT=4000
NODE_ENV=production
```

Generar secretos seguros:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 1.3 Variables de entorno — Frontend

Crear `apps/frontend/.env.production`:

```env
VITE_API_URL=https://TU-BACKEND.onrender.com/api/v1
```

Actualizar `apps/frontend/src/services/api-client.ts`:

```typescript
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1"
});
```

### 1.4 Prisma — agregar directUrl

En `apps/backend/prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

> `DATABASE_URL` usa pgBouncer (puerto 6543) para runtime.  
> `DIRECT_URL` usa conexion directa (puerto 5432) solo para migraciones.

### 1.5 Seguridad — .gitignore

Verificar que `apps/backend/.gitignore` y `apps/frontend/.gitignore` incluyan:

```
.env
.env.*
!.env.example
```

Nunca subir archivos `.env` al repositorio.

---

## 2. Configuracion de Supabase

### 2.1 Crear proyecto

1. Ir a https://supabase.com > New project
2. Guardar la **Database Password** generada (no se puede recuperar)
3. Esperar ~2 minutos hasta que el proyecto este listo

### 2.2 Obtener credenciales

Ir a **Project Settings > Database > Connection string**:

| Variable     | Seccion en Supabase                       | Puerto |
|--------------|-------------------------------------------|--------|
| DATABASE_URL | Transaction pooler (pgBouncer)            | 6543   |
| DIRECT_URL   | Session pooler o Direct connection        | 5432   |

Formato:
```
DATABASE_URL = postgresql://postgres.XXXX:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL   = postgresql://postgres.XXXX:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

### 2.3 Ejecutar migraciones

Desde tu maquina local con las credenciales de Supabase en el `.env`:

```bash
cd apps/backend

# Aplica migraciones existentes (no crea nuevas)
npx prisma migrate deploy

# Seed inicial (solo si es necesario)
npx prisma db seed
```

---

## 3. Deploy del Backend en Render

### 3.1 Crear el servicio

1. Ir a https://render.com > New > Web Service
2. Conectar repositorio de GitHub
3. Configurar:

| Campo            | Valor                                                        |
|------------------|--------------------------------------------------------------|
| Root Directory   | `apps/backend`                                               |
| Runtime          | Node                                                         |
| Build Command    | `npm install && npx prisma generate && npm run build`        |
| Start Command    | `npm start`                                                  |
| Instance Type    | Free (o Starter $7/mes para evitar cold starts)              |

### 3.2 Variables de entorno en Render

En la seccion **Environment** del servicio agregar:

```
DATABASE_URL       = postgresql://postgres.XXXX:PASS@...:6543/postgres?pgbouncer=true
DIRECT_URL         = postgresql://postgres.XXXX:PASS@...:5432/postgres
JWT_ACCESS_SECRET  = <secreto-48-chars>
JWT_REFRESH_SECRET = <secreto-48-chars-distinto>
CORS_ORIGIN        = https://TU-APP.vercel.app
PORT               = 4000
NODE_ENV           = production
```

Variables adicionales para Puppeteer:
```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = true
PUPPETEER_EXECUTABLE_PATH        = /usr/bin/chromium-browser
```

### 3.3 Problema: Puppeteer en plan Free

Puppeteer requiere Chrome y mucha memoria. En plan Free puede fallar.

- Opcion 1: Upgrade a plan Starter ($7/mes)
- Opcion 2: El sistema ya tiene PDFKit como fallback — si Puppeteer falla el reporte igual se genera

### 3.4 Problema: Cold starts en plan Free

Render apaga servicios gratuitos tras 15 minutos de inactividad. La primera peticion puede tardar ~30 segundos.

Solucion: Crear monitor gratuito en https://uptimerobot.com con ping cada 5 minutos a:
```
https://TU-BACKEND.onrender.com/api/v1/health
```

### 3.5 CORS — multiples origenes (opcional)

Si necesitas permitir URLs de preview de Vercel ademas de produccion, en Render:
```
CORS_ORIGIN = https://app.vercel.app,https://app-git-main-usuario.vercel.app
```

Y actualizar `apps/backend/src/app.ts`:

```typescript
const allowedOrigins = env.CORS_ORIGIN.split(",").map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
```

---

## 4. Deploy del Frontend en Vercel

### 4.1 Conectar repositorio

1. Ir a https://vercel.com > Add New > Project
2. Importar repositorio de GitHub
3. Configurar:

| Campo            | Valor             |
|------------------|-------------------|
| Root Directory   | `apps/frontend`   |
| Framework Preset | Vite              |
| Build Command    | `npm run build`   |
| Output Directory | `dist`            |
| Install Command  | `npm install`     |

### 4.2 Variables de entorno en Vercel

En **Settings > Environment Variables**:

```
VITE_API_URL = https://TU-BACKEND.onrender.com/api/v1
```

Marcar como habilitada para **Production**.

### 4.3 React Router — rutas en produccion (IMPORTANTE)

Sin este archivo, recargar `/carrito`, `/admin` u otras rutas devuelve 404.

Crear `apps/frontend/public/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 5. Verificacion de integracion completa

### 5.1 Orden de verificacion

```
1. Supabase DB activa        ->  tablas visibles en Table Editor de Supabase
2. Backend en Render         ->  GET /api/v1/health retorna 200
3. Frontend en Vercel        ->  pagina carga sin errores en consola del navegador
4. Login funciona            ->  token se almacena, redirige correctamente
5. Catalogo carga productos  ->  query a /catalogo retorna datos reales
6. Checkout completo         ->  crear orden y verificar en panel admin
```

### 5.2 Pruebas rapidas con curl

```bash
# Health check del backend
curl https://TU-BACKEND.onrender.com/api/v1/health

# Login
curl -X POST https://TU-BACKEND.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@test.com\",\"password\":\"tu-password\"}"
```

---

## 6. Seguridad basica

### 6.1 JWT

- `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` deben tener minimo 48 caracteres
- Deben ser valores distintos entre si
- Solo deben existir como variables de entorno en Render, nunca en el repositorio

### 6.2 Auditoria de secretos en codigo

```bash
# Buscar posibles secretos hardcodeados
grep -r "secret\|password\|DATABASE_URL" apps/backend/src --include="*.ts"
grep -r "VITE_" apps/frontend/src --include="*.ts" --include="*.tsx"
```

### 6.3 Rate limiting

Ya configurado en `apps/backend/src/app.ts` con `express-rate-limit`. Para produccion con trafico real, ajustar:

```typescript
rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  limit: 500,                  // reducir de 3000 a 500 en produccion
})
```

---

## 7. Optimizacion y escalado

### 7.1 Logs en produccion

Verificar que Winston solo use Console transport (Render captura stdout/stderr):

```typescript
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "debug",
  transports: [new winston.transports.Console()]
});
```

### 7.2 Problema de Prisma con pgBouncer

Si aparece el error `prepared statement does not exist`, agregar a `DATABASE_URL`:
```
?pgbouncer=true&connection_limit=10&pool_timeout=10
```

### 7.3 Tabla de problemas frecuentes

| Problema                        | Causa probable                     | Solucion                                          |
|---------------------------------|------------------------------------|---------------------------------------------------|
| Backend tarda 30s en responder  | Cold start en plan Free            | UptimeRobot ping cada 5min o upgrade a Starter    |
| 404 al recargar rutas           | Falta vercel.json                  | Crear `public/vercel.json` con rewrites           |
| Error de CORS                   | CORS_ORIGIN no coincide            | Verificar URL exacta sin barra final              |
| Migracion falla en Render       | Usar DIRECT_URL para migraciones   | Ejecutar `prisma migrate deploy` desde local      |
| Puppeteer falla                 | Sin memoria o Chrome no disponible | Usar PDFKit fallback o plan Starter               |
| Login retorna 401               | JWT_SECRET diferente al local      | Regenerar y actualizar en Render                  |
| DB connection timeout           | Demasiadas conexiones              | Reducir `connection_limit` en DATABASE_URL        |

---

## Checklist final antes de compartir la URL publica

```
[ ] .env NO esta en el repositorio de GitHub
[ ] schema.prisma tiene directUrl = env("DIRECT_URL")
[ ] prisma migrate deploy ejecutado contra Supabase desde local
[ ] DATABASE_URL en Render usa puerto 6543 (pgBouncer)
[ ] DIRECT_URL en Render usa puerto 5432
[ ] CORS_ORIGIN en Render = URL exacta de Vercel (sin / al final)
[ ] VITE_API_URL en Vercel = URL exacta de Render (sin / al final)
[ ] api-client.ts usa import.meta.env.VITE_API_URL
[ ] apps/frontend/public/vercel.json creado con rewrites
[ ] GET /api/v1/health responde 200
[ ] Login y checkout funcionan end-to-end en produccion
```
