-- CreateTable
CREATE TABLE "seg_roles" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(30) NOT NULL,
    "descripcion" VARCHAR(120),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seg_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cli_clientes" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "apellido" VARCHAR(80) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "telefono" VARCHAR(30),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cli_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seg_usuarios" (
    "id" SERIAL NOT NULL,
    "rol_id" INTEGER NOT NULL,
    "cliente_id" INTEGER,
    "email" VARCHAR(120) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "refresh_token_hash" VARCHAR(255),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seg_usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cat_productos" (
    "id" SERIAL NOT NULL,
    "sku" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "imagen_url" TEXT,
    "categoria" VARCHAR(80) NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "stock_minimo" INTEGER NOT NULL DEFAULT 5,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cat_productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv_inventario" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "stock_actual" INTEGER NOT NULL DEFAULT 0,
    "stock_reservado" INTEGER NOT NULL DEFAULT 0,
    "stock_disponible" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inv_inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ord_carritos" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ord_carritos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ord_carrito_items" (
    "id" SERIAL NOT NULL,
    "carrito_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ord_carrito_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ord_ordenes" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "numero_orden" VARCHAR(30) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "impuestos" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "estado" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "metodo_pago" VARCHAR(30) NOT NULL,
    "transaccion_id" VARCHAR(80),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ord_ordenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ord_orden_items" (
    "id" SERIAL NOT NULL,
    "orden_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "total_linea" DECIMAL(12,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ord_orden_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seg_auditoria_acciones" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "modulo" VARCHAR(50) NOT NULL,
    "accion" VARCHAR(50) NOT NULL,
    "detalle" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seg_auditoria_acciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seg_roles_nombre_key" ON "seg_roles"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "cli_clientes_email_key" ON "cli_clientes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "seg_usuarios_email_key" ON "seg_usuarios"("email");

-- CreateIndex
CREATE INDEX "seg_usuarios_rol_id_idx" ON "seg_usuarios"("rol_id");

-- CreateIndex
CREATE UNIQUE INDEX "cat_productos_sku_key" ON "cat_productos"("sku");

-- CreateIndex
CREATE INDEX "cat_productos_nombre_idx" ON "cat_productos"("nombre");

-- CreateIndex
CREATE INDEX "cat_productos_categoria_idx" ON "cat_productos"("categoria");

-- CreateIndex
CREATE UNIQUE INDEX "inv_inventario_producto_id_key" ON "inv_inventario"("producto_id");

-- CreateIndex
CREATE INDEX "inv_inventario_producto_id_idx" ON "inv_inventario"("producto_id");

-- CreateIndex
CREATE INDEX "ord_carritos_cliente_id_idx" ON "ord_carritos"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "ord_carrito_items_carrito_id_producto_id_key" ON "ord_carrito_items"("carrito_id", "producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "ord_ordenes_numero_orden_key" ON "ord_ordenes"("numero_orden");

-- CreateIndex
CREATE INDEX "ord_ordenes_cliente_id_idx" ON "ord_ordenes"("cliente_id");

-- CreateIndex
CREATE INDEX "ord_ordenes_estado_idx" ON "ord_ordenes"("estado");

-- CreateIndex
CREATE INDEX "seg_auditoria_acciones_usuario_id_created_at_idx" ON "seg_auditoria_acciones"("usuario_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "seg_usuarios" ADD CONSTRAINT "seg_usuarios_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "seg_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seg_usuarios" ADD CONSTRAINT "seg_usuarios_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cli_clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_inventario" ADD CONSTRAINT "inv_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "cat_productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_carritos" ADD CONSTRAINT "ord_carritos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cli_clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_carrito_items" ADD CONSTRAINT "ord_carrito_items_carrito_id_fkey" FOREIGN KEY ("carrito_id") REFERENCES "ord_carritos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_carrito_items" ADD CONSTRAINT "ord_carrito_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "cat_productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_ordenes" ADD CONSTRAINT "ord_ordenes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "cli_clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_orden_items" ADD CONSTRAINT "ord_orden_items_orden_id_fkey" FOREIGN KEY ("orden_id") REFERENCES "ord_ordenes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ord_orden_items" ADD CONSTRAINT "ord_orden_items_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "cat_productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seg_auditoria_acciones" ADD CONSTRAINT "seg_auditoria_acciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "seg_usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
