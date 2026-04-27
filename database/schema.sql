CREATE DATABASE tienda_virtual;
\c tienda_virtual;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE seg_roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(30) UNIQUE NOT NULL,
    descripcion VARCHAR(120),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE cli_clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL,
    apellido VARCHAR(80) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    telefono VARCHAR(30),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE seg_usuarios (
    id SERIAL PRIMARY KEY,
    rol_id INT NOT NULL REFERENCES seg_roles(id),
    cliente_id INT REFERENCES cli_clientes(id),
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE cat_productos (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(40) UNIQUE NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(80) NOT NULL,
    precio NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
    stock_minimo INT NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE inv_inventario (
    id SERIAL PRIMARY KEY,
    producto_id INT UNIQUE NOT NULL REFERENCES cat_productos(id),
    stock_actual INT NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_reservado INT NOT NULL DEFAULT 0 CHECK (stock_reservado >= 0),
    stock_disponible INT NOT NULL DEFAULT 0 CHECK (stock_disponible >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ord_carritos (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES cli_clientes(id),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ord_carrito_items (
    id SERIAL PRIMARY KEY,
    carrito_id INT NOT NULL REFERENCES ord_carritos(id),
    producto_id INT NOT NULL REFERENCES cat_productos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_carrito_producto UNIQUE (carrito_id, producto_id)
);

CREATE TABLE ord_ordenes (
    id SERIAL PRIMARY KEY,
    cliente_id INT NOT NULL REFERENCES cli_clientes(id),
    numero_orden VARCHAR(30) UNIQUE NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    impuestos NUMERIC(12,2) NOT NULL CHECK (impuestos >= 0),
    total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    metodo_pago VARCHAR(30) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE ord_orden_items (
    id SERIAL PRIMARY KEY,
    orden_id INT NOT NULL REFERENCES ord_ordenes(id),
    producto_id INT NOT NULL REFERENCES cat_productos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
    total_linea NUMERIC(12,2) NOT NULL CHECK (total_linea >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE seg_auditoria_acciones (
    id BIGSERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES seg_usuarios(id),
    modulo VARCHAR(50) NOT NULL,
    accion VARCHAR(50) NOT NULL,
    detalle JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cat_productos_nombre ON cat_productos(nombre);
CREATE INDEX idx_cat_productos_categoria ON cat_productos(categoria);
CREATE INDEX idx_inv_inventario_producto_id ON inv_inventario(producto_id);
CREATE INDEX idx_ord_carritos_cliente_id ON ord_carritos(cliente_id);
CREATE INDEX idx_ord_ordenes_cliente_id ON ord_ordenes(cliente_id);
CREATE INDEX idx_ord_ordenes_estado ON ord_ordenes(estado);
CREATE INDEX idx_seg_usuarios_rol_id ON seg_usuarios(rol_id);
CREATE INDEX idx_seg_auditoria_usuario_fecha ON seg_auditoria_acciones(usuario_id, created_at DESC);

INSERT INTO seg_roles (nombre, descripcion) VALUES
('ADMIN', 'Acceso total al sistema'),
('CLIENTE', 'Acceso a tienda y pedidos');

INSERT INTO cli_clientes (nombre, apellido, email, telefono) VALUES
('Ana', 'Lopez', 'ana@example.com', '111111111'),
('Luis', 'Perez', 'luis@example.com', '222222222'),
('Marta', 'Gomez', 'marta@example.com', '333333333');

INSERT INTO seg_usuarios (rol_id, cliente_id, email, password_hash, activo, created_at, updated_at) VALUES
((SELECT id FROM seg_roles WHERE nombre = 'ADMIN'), NULL, 'admin@tienda.com', '$2b$10$s07ZfoKp8HU1HBOTwxe2LemC0btSgezBAOlb3OEozMlsKBxs787ES', TRUE, NOW(), NOW()),
((SELECT id FROM seg_roles WHERE nombre = 'CLIENTE'), (SELECT id FROM cli_clientes WHERE email = 'ana@example.com'), 'ana@example.com', '$2b$10$cNqlhSE.QR99tfDSKQAzZ.dYJPW89G9jJ1ajUtiRZm0geldBYeHGq', TRUE, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO cat_productos (sku, nombre, descripcion, categoria, precio, stock_minimo) VALUES
('SKU-001', 'Laptop Pro 14', 'Laptop de alto rendimiento', 'Computacion', 5200.00, 2),
('SKU-002', 'Mouse Inalambrico', 'Mouse ergonomico', 'Accesorios', 120.00, 10),
('SKU-003', 'Teclado Mecanico', 'Switches red', 'Accesorios', 350.00, 8),
('SKU-004', 'Monitor 27 IPS', 'Resolucion 2K', 'Monitores', 1450.00, 4),
('SKU-005', 'SSD 1TB NVMe', 'Lectura 7000MB/s', 'Almacenamiento', 520.00, 6),
('SKU-006', 'RAM 32GB DDR5', 'Kit 2x16', 'Componentes', 640.00, 6),
('SKU-007', 'Webcam 4K', 'Con microfono integrado', 'Perifericos', 430.00, 6),
('SKU-008', 'Headset Gamer', 'Sonido envolvente', 'Audio', 290.00, 12),
('SKU-009', 'Silla Ergonomica', 'Soporte lumbar', 'Muebles', 980.00, 3),
('SKU-010', 'Desk Mat XL', 'Antideslizante', 'Accesorios', 60.00, 20),
('SKU-011', 'Router WiFi 6', 'Doble banda', 'Redes', 410.00, 5),
('SKU-012', 'Smartwatch Fit', 'Salud y deporte', 'Wearables', 870.00, 4),
('SKU-013', 'Tablet 11', 'Pantalla retina', 'Tablets', 2100.00, 4),
('SKU-014', 'Impresora Laser', 'Monocromatica', 'Oficina', 760.00, 3),
('SKU-015', 'Camara Mirrorless', '24MP', 'Fotografia', 4900.00, 2),
('SKU-016', 'Microfono USB', 'Streaming', 'Audio', 340.00, 7),
('SKU-017', 'Docking Station', 'USB-C multipuerto', 'Accesorios', 390.00, 7),
('SKU-018', 'Power Bank 20000', 'Carga rapida', 'Movilidad', 190.00, 9),
('SKU-019', 'Smart TV 55', '4K HDR', 'TV', 3200.00, 2),
('SKU-020', 'Consola Next Gen', '1TB almacenamiento', 'Gaming', 3600.00, 2);

INSERT INTO inv_inventario (producto_id, stock_actual, stock_reservado, stock_disponible)
SELECT id, 25, 2, 23 FROM cat_productos;

INSERT INTO ord_ordenes (cliente_id, numero_orden, subtotal, impuestos, total, estado, metodo_pago, activo, created_at, updated_at) VALUES
((SELECT id FROM cli_clientes WHERE email = 'ana@example.com'), 'ORD-0001', 5600.00, 1008.00, 6608.00, 'PAGADA', 'TARJETA', TRUE, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
((SELECT id FROM cli_clientes WHERE email = 'luis@example.com'), 'ORD-0002', 980.00, 176.40, 1156.40, 'PAGADA', 'YAPE', TRUE, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
((SELECT id FROM cli_clientes WHERE email = 'marta@example.com'), 'ORD-0003', 3300.00, 594.00, 3894.00, 'PAGADA', 'TARJETA', TRUE, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
ON CONFLICT (numero_orden) DO NOTHING;

INSERT INTO ord_orden_items (orden_id, producto_id, cantidad, precio_unitario, total_linea, activo, created_at, updated_at)
SELECT o.id, p.id, x.cantidad, x.precio_unitario, x.total_linea, TRUE, NOW(), NOW()
FROM (
    VALUES
        ('ORD-0001', 'SKU-001', 1, 5200.00, 5200.00),
        ('ORD-0001', 'SKU-002', 2, 120.00, 240.00),
        ('ORD-0001', 'SKU-010', 1, 60.00, 60.00),
        ('ORD-0001', 'SKU-008', 1, 290.00, 290.00),
        ('ORD-0001', 'SKU-018', 1, 190.00, 190.00),
        ('ORD-0001', 'SKU-016', 1, 340.00, 340.00),
        ('ORD-0002', 'SKU-009', 1, 980.00, 980.00),
        ('ORD-0003', 'SKU-019', 1, 3200.00, 3200.00),
        ('ORD-0003', 'SKU-010', 1, 60.00, 60.00),
        ('ORD-0003', 'SKU-002', 1, 40.00, 40.00)
) AS x(numero_orden, sku, cantidad, precio_unitario, total_linea)
JOIN ord_ordenes o ON o.numero_orden = x.numero_orden
JOIN cat_productos p ON p.sku = x.sku
WHERE NOT EXISTS (
    SELECT 1
    FROM ord_orden_items oi
    WHERE oi.orden_id = o.id
        AND oi.producto_id = p.id
);
