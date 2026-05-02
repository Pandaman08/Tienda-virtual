-- CreateTable
CREATE TABLE "cfg_tienda" (
    "id"             INTEGER NOT NULL DEFAULT 1,
    "nombre"         VARCHAR(120) NOT NULL DEFAULT 'MI EMPRESA',
    "logo"           TEXT,
    "ruc"            VARCHAR(20),
    "direccion"      VARCHAR(200),
    "telefono"       VARCHAR(30),
    "email"          VARCHAR(120),
    "igv"            VARCHAR(5) NOT NULL DEFAULT '18',
    "moneda_simbolo" VARCHAR(5) NOT NULL DEFAULT 'S/',
    "moneda_nombre"  VARCHAR(30) NOT NULL DEFAULT 'Soles',
    "serie_boleta"   VARCHAR(20) NOT NULL DEFAULT 'B001',
    "serie_factura"  VARCHAR(20) NOT NULL DEFAULT 'F001',
    "updated_at"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cfg_tienda_pkey" PRIMARY KEY ("id")
);

-- Seed row (single-row config)
INSERT INTO "cfg_tienda" ("id", "nombre", "updated_at")
VALUES (1, 'MI EMPRESA', NOW())
ON CONFLICT ("id") DO NOTHING;
