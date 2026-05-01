import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ClienteSeed = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
};

type ProductoSeed = {
  sku: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  stockMinimo: number;
  stockInicial: number;
};

type OrdenItemSeed = {
  numeroOrden: string;
  items: Array<{ sku: string; cantidad: number; precioUnitario: number }>;
};

type OrdenSeed = {
  numeroOrden: string;
  clienteEmail: string;
  subtotal: number;
  impuestos: number;
  total: number;
  estado: string;
  metodoPago: string;
  transaccionId: string;
  createdAt: Date;
};

const clientesSeed: ClienteSeed[] = [
  { nombre: "Ana", apellido: "Lopez", email: "ana@example.com", telefono: "111111111" },
  { nombre: "Luis", apellido: "Perez", email: "luis@example.com", telefono: "222222222" },
  { nombre: "Marta", apellido: "Gomez", email: "marta@example.com", telefono: "333333333" },
  { nombre: "Carlos", apellido: "Quispe", email: "carlos.quispe@gmail.com", telefono: "973456789" },
  { nombre: "Ana Lucia", apellido: "Flores", email: "analucia.flores@yahoo.com", telefono: "962345678" },
  { nombre: "Alberto", apellido: "Castillo", email: "acastillo@gmail.com", telefono: "973456790" },
  { nombre: "Pedro", apellido: "Ramirez", email: "pedro.ramirez@gmail.com", telefono: "934567890" },
  { nombre: "Carmen", apellido: "Huanca", email: "chuanca@gmail.com", telefono: "906789013" },
  { nombre: "Erika", apellido: "Delgado", email: "erika.delgado@yahoo.com", telefono: "917890124" },
  { nombre: "Edgar", apellido: "Mamani", email: "edgar.mamani@gmail.com", telefono: "939012345" }
];

const productosSeed: ProductoSeed[] = [
  { sku: "ELEC-001", nombre: "Laptop Pro 14", descripcion: "Laptop de alto rendimiento", categoria: "Computacion", precio: 5200, stockMinimo: 3, stockInicial: 2 },
  { sku: "ELEC-002", nombre: "Amoladora Angular 4.5in 710W", descripcion: "Herramienta electrica compacta", categoria: "Herramientas Electricas", precio: 260, stockMinimo: 5, stockInicial: 22 },
  { sku: "ELEC-003", nombre: "Monitor 27 IPS", descripcion: "Resolucion 2K", categoria: "Monitores", precio: 1450, stockMinimo: 4, stockInicial: 3 },
  { sku: "ELEC-004", nombre: "Router WiFi 6", descripcion: "Doble banda y alta cobertura", categoria: "Redes", precio: 410, stockMinimo: 6, stockInicial: 28 },
  { sku: "ELEC-005", nombre: "Smartwatch Fit", descripcion: "Monitoreo de actividad", categoria: "Wearables", precio: 870, stockMinimo: 5, stockInicial: 19 },
  { sku: "ELEC-006", nombre: "Tablet 11", descripcion: "Pantalla retina 11 pulgadas", categoria: "Tablets", precio: 2100, stockMinimo: 3, stockInicial: 12 },
  { sku: "ELEC-007", nombre: "Consola Next Gen", descripcion: "1TB de almacenamiento", categoria: "Gaming", precio: 3600, stockMinimo: 2, stockInicial: 1 },
  { sku: "ELEC-008", nombre: "Power Bank 20000", descripcion: "Carga rapida USB-C", categoria: "Movilidad", precio: 190, stockMinimo: 10, stockInicial: 40 },
  { sku: "OFI-001", nombre: "Impresora Laser", descripcion: "Monocromatica de oficina", categoria: "Oficina", precio: 760, stockMinimo: 4, stockInicial: 16 },
  { sku: "OFI-002", nombre: "Silla Ergonomica", descripcion: "Soporte lumbar ajustable", categoria: "Muebles", precio: 980, stockMinimo: 3, stockInicial: 2 },
  { sku: "OFI-003", nombre: "Escritorio Ejecutivo", descripcion: "Acabado en melamina", categoria: "Muebles", precio: 1200, stockMinimo: 3, stockInicial: 9 },
  { sku: "OFI-004", nombre: "Lampara LED de Escritorio", descripcion: "Luz regulable", categoria: "Oficina", precio: 95, stockMinimo: 8, stockInicial: 30 },
  { sku: "ACC-001", nombre: "Mouse Inalambrico", descripcion: "Mouse ergonomico", categoria: "Accesorios", precio: 120, stockMinimo: 12, stockInicial: 45 },
  { sku: "ACC-002", nombre: "Teclado Mecanico", descripcion: "Switches red", categoria: "Accesorios", precio: 350, stockMinimo: 8, stockInicial: 24 },
  { sku: "ACC-003", nombre: "Desk Mat XL", descripcion: "Base antideslizante", categoria: "Accesorios", precio: 60, stockMinimo: 15, stockInicial: 55 },
  { sku: "ACC-004", nombre: "Docking Station USB-C", descripcion: "Multipuerto para laptop", categoria: "Accesorios", precio: 390, stockMinimo: 6, stockInicial: 20 },
  { sku: "ACC-005", nombre: "Headset Gamer", descripcion: "Sonido envolvente", categoria: "Audio", precio: 290, stockMinimo: 9, stockInicial: 35 },
  { sku: "ACC-006", nombre: "Microfono USB", descripcion: "Streaming y reuniones", categoria: "Audio", precio: 340, stockMinimo: 7, stockInicial: 21 },
  { sku: "ACC-007", nombre: "Webcam 4K", descripcion: "Con microfono integrado", categoria: "Perifericos", precio: 430, stockMinimo: 6, stockInicial: 18 },
  { sku: "ACC-008", nombre: "SSD 1TB NVMe", descripcion: "Lectura 7000MB/s", categoria: "Almacenamiento", precio: 520, stockMinimo: 8, stockInicial: 7 },
  { sku: "ACC-009", nombre: "RAM 32GB DDR5", descripcion: "Kit 2x16", categoria: "Componentes", precio: 640, stockMinimo: 6, stockInicial: 19 },
  { sku: "HOG-001", nombre: "Set de Sartenes Antiadherente", descripcion: "Juego de 5 piezas", categoria: "Hogar", precio: 280, stockMinimo: 8, stockInicial: 30 },
  { sku: "HOG-002", nombre: "Licuadora 1.5L", descripcion: "Motor de alta potencia", categoria: "Hogar", precio: 240, stockMinimo: 7, stockInicial: 25 },
  { sku: "HOG-003", nombre: "Freidora de Aire 4L", descripcion: "Coccion sin aceite", categoria: "Hogar", precio: 420, stockMinimo: 5, stockInicial: 18 },
  { sku: "HOG-004", nombre: "Aspiradora Vertical", descripcion: "Ligera y potente", categoria: "Hogar", precio: 530, stockMinimo: 4, stockInicial: 14 },
  { sku: "DEP-001", nombre: "Mancuernas Ajustables 20kg", descripcion: "Par de mancuernas", categoria: "Deportes", precio: 650, stockMinimo: 4, stockInicial: 0 },
  { sku: "DEP-002", nombre: "Colchoneta Yoga Pro", descripcion: "Alta densidad", categoria: "Deportes", precio: 120, stockMinimo: 10, stockInicial: 32 },
  { sku: "MOD-001", nombre: "Casaca Unisex Urban", descripcion: "Tela impermeable", categoria: "Moda", precio: 180, stockMinimo: 12, stockInicial: 42 },
  { sku: "MOD-002", nombre: "Zapatillas Running V2", descripcion: "Suela amortiguada", categoria: "Moda", precio: 260, stockMinimo: 10, stockInicial: 37 },
  { sku: "LIB-001", nombre: "Agenda 2026 Premium", descripcion: "Tapa dura con separadores", categoria: "Libros y Papeleria", precio: 45, stockMinimo: 15, stockInicial: 60 }
];

const daysAgo = (days: number) => {
  const date = new Date();
  date.setHours(10, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
};

const ordenesSeed: OrdenSeed[] = [
  { numeroOrden: "KPI-2026-0001", clienteEmail: "ana@example.com", subtotal: 5200, impuestos: 936, total: 6136, estado: "PAGADA", metodoPago: "TARJETA", transaccionId: "TXN-KPI-0001", createdAt: daysAgo(14) },
  { numeroOrden: "KPI-2026-0002", clienteEmail: "luis@example.com", subtotal: 980, impuestos: 176.4, total: 1156.4, estado: "PAGADA", metodoPago: "YAPE", transaccionId: "TXN-KPI-0002", createdAt: daysAgo(13) },
  { numeroOrden: "KPI-2026-0003", clienteEmail: "marta@example.com", subtotal: 2410, impuestos: 433.8, total: 2843.8, estado: "PAGADA", metodoPago: "TRANSFERENCIA", transaccionId: "TXN-KPI-0003", createdAt: daysAgo(10) },
  { numeroOrden: "KPI-2026-0004", clienteEmail: "carlos.quispe@gmail.com", subtotal: 420, impuestos: 75.6, total: 495.6, estado: "PAGADA", metodoPago: "YAPE", transaccionId: "TXN-KPI-0004", createdAt: daysAgo(8) },
  { numeroOrden: "KPI-2026-0005", clienteEmail: "analucia.flores@yahoo.com", subtotal: 3600, impuestos: 648, total: 4248, estado: "PAGADA", metodoPago: "TARJETA", transaccionId: "TXN-KPI-0005", createdAt: daysAgo(7) },
  { numeroOrden: "KPI-2026-0006", clienteEmail: "acastillo@gmail.com", subtotal: 760, impuestos: 136.8, total: 896.8, estado: "PAGADA", metodoPago: "PLIN", transaccionId: "TXN-KPI-0006", createdAt: daysAgo(6) },
  { numeroOrden: "KPI-2026-0007", clienteEmail: "pedro.ramirez@gmail.com", subtotal: 1170, impuestos: 210.6, total: 1380.6, estado: "PAGADA", metodoPago: "TARJETA", transaccionId: "TXN-KPI-0007", createdAt: daysAgo(5) },
  { numeroOrden: "KPI-2026-0008", clienteEmail: "chuanca@gmail.com", subtotal: 245, impuestos: 44.1, total: 289.1, estado: "PAGADA", metodoPago: "YAPE", transaccionId: "TXN-KPI-0008", createdAt: daysAgo(4) },
  { numeroOrden: "KPI-2026-0009", clienteEmail: "erika.delgado@yahoo.com", subtotal: 1880, impuestos: 338.4, total: 2218.4, estado: "PAGADA", metodoPago: "TARJETA", transaccionId: "TXN-KPI-0009", createdAt: daysAgo(3) },
  { numeroOrden: "KPI-2026-0010", clienteEmail: "edgar.mamani@gmail.com", subtotal: 870, impuestos: 156.6, total: 1026.6, estado: "PAGADA", metodoPago: "PLIN", transaccionId: "TXN-KPI-0010", createdAt: daysAgo(2) },
  { numeroOrden: "KPI-2026-0011", clienteEmail: "ana@example.com", subtotal: 1550, impuestos: 279, total: 1829, estado: "PAGADA", metodoPago: "TARJETA", transaccionId: "TXN-KPI-0011", createdAt: daysAgo(1) },
  { numeroOrden: "KPI-2026-0012", clienteEmail: "luis@example.com", subtotal: 430, impuestos: 77.4, total: 507.4, estado: "PAGADA", metodoPago: "YAPE", transaccionId: "TXN-KPI-0012", createdAt: daysAgo(1) },
  { numeroOrden: "KPI-2026-0013", clienteEmail: "marta@example.com", subtotal: 290, impuestos: 52.2, total: 342.2, estado: "PAGADA", metodoPago: "TRANSFERENCIA", transaccionId: "TXN-KPI-0013", createdAt: daysAgo(0) },
  { numeroOrden: "KPI-2026-0014", clienteEmail: "carlos.quispe@gmail.com", subtotal: 640, impuestos: 115.2, total: 755.2, estado: "PAGADA", metodoPago: "PLIN", transaccionId: "TXN-KPI-0014", createdAt: daysAgo(0) },
  { numeroOrden: "KPI-2026-0015", clienteEmail: "analucia.flores@yahoo.com", subtotal: 2100, impuestos: 378, total: 2478, estado: "PAGADA", metodoPago: "TARJETA", transaccionId: "TXN-KPI-0015", createdAt: daysAgo(0) }
];

const ordenItemsSeed: OrdenItemSeed[] = [
  { numeroOrden: "KPI-2026-0001", items: [{ sku: "ELEC-001", cantidad: 1, precioUnitario: 5200 }] },
  { numeroOrden: "KPI-2026-0002", items: [{ sku: "OFI-002", cantidad: 1, precioUnitario: 980 }] },
  { numeroOrden: "KPI-2026-0003", items: [{ sku: "ELEC-003", cantidad: 1, precioUnitario: 1450 }, { sku: "ACC-002", cantidad: 2, precioUnitario: 350 }, { sku: "ACC-001", cantidad: 3, precioUnitario: 120 }] },
  { numeroOrden: "KPI-2026-0004", items: [{ sku: "HOG-003", cantidad: 1, precioUnitario: 420 }] },
  { numeroOrden: "KPI-2026-0005", items: [{ sku: "ELEC-007", cantidad: 1, precioUnitario: 3600 }] },
  { numeroOrden: "KPI-2026-0006", items: [{ sku: "OFI-001", cantidad: 1, precioUnitario: 760 }] },
  { numeroOrden: "KPI-2026-0007", items: [{ sku: "ELEC-005", cantidad: 1, precioUnitario: 870 }, { sku: "ACC-001", cantidad: 2, precioUnitario: 120 }, { sku: "ACC-003", cantidad: 1, precioUnitario: 60 }] },
  { numeroOrden: "KPI-2026-0008", items: [{ sku: "LIB-001", cantidad: 2, precioUnitario: 45 }, { sku: "OFI-004", cantidad: 1, precioUnitario: 95 }, { sku: "ACC-003", cantidad: 1, precioUnitario: 60 }] },
  { numeroOrden: "KPI-2026-0009", items: [{ sku: "ACC-008", cantidad: 2, precioUnitario: 520 }, { sku: "ELEC-004", cantidad: 1, precioUnitario: 410 }, { sku: "ACC-007", cantidad: 1, precioUnitario: 430 }] },
  { numeroOrden: "KPI-2026-0010", items: [{ sku: "ELEC-005", cantidad: 1, precioUnitario: 870 }] },
  { numeroOrden: "KPI-2026-0011", items: [{ sku: "OFI-003", cantidad: 1, precioUnitario: 1200 }, { sku: "ACC-006", cantidad: 1, precioUnitario: 340 }] },
  { numeroOrden: "KPI-2026-0012", items: [{ sku: "ELEC-004", cantidad: 1, precioUnitario: 410 }, { sku: "ACC-009", cantidad: 1, precioUnitario: 640 }] },
  { numeroOrden: "KPI-2026-0013", items: [{ sku: "ACC-005", cantidad: 1, precioUnitario: 290 }] },
  { numeroOrden: "KPI-2026-0014", items: [{ sku: "DEP-001", cantidad: 1, precioUnitario: 650 }] },
  { numeroOrden: "KPI-2026-0015", items: [{ sku: "ELEC-006", cantidad: 1, precioUnitario: 2100 }] }
];

async function main() {
  const adminPasswordHash = await bcrypt.hash("Admin123*", 10);
  const clientePasswordHash = await bcrypt.hash("Cliente123*", 10);
  const clientesByEmail = new Map<string, number>();
  const skuToProductId = new Map<string, number>();

  const rolAdmin = await prisma.seg_roles.upsert({
    where: { nombre: "ADMIN" },
    update: { descripcion: "Acceso total al sistema", activo: true },
    create: { nombre: "ADMIN", descripcion: "Acceso total al sistema" }
  });

  const rolCliente = await prisma.seg_roles.upsert({
    where: { nombre: "CLIENTE" },
    update: { descripcion: "Acceso a tienda y pedidos", activo: true },
    create: { nombre: "CLIENTE", descripcion: "Acceso a tienda y pedidos" }
  });

  await prisma.seg_usuarios.upsert({
    where: { email: "admin@tienda.com" },
    update: {
      rol_id: rolAdmin.id,
      cliente_id: null,
      password_hash: adminPasswordHash,
      activo: true
    },
    create: {
      rol_id: rolAdmin.id,
      cliente_id: null,
      email: "admin@tienda.com",
      password_hash: adminPasswordHash,
      activo: true
    }
  });

  for (const cliente of clientesSeed) {
    const clienteDb = await prisma.cli_clientes.upsert({
      where: { email: cliente.email },
      update: {
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        telefono: cliente.telefono,
        activo: true
      },
      create: {
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        email: cliente.email,
        telefono: cliente.telefono,
        activo: true
      }
    });

    clientesByEmail.set(cliente.email, clienteDb.id);

    await prisma.seg_usuarios.upsert({
      where: { email: cliente.email },
      update: {
        rol_id: rolCliente.id,
        cliente_id: clienteDb.id,
        password_hash: clientePasswordHash,
        activo: true
      },
      create: {
        rol_id: rolCliente.id,
        cliente_id: clienteDb.id,
        email: cliente.email,
        password_hash: clientePasswordHash,
        activo: true
      }
    });
  }

  for (const producto of productosSeed) {
    const productoDb = await prisma.cat_productos.upsert({
      where: { sku: producto.sku },
      update: {
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        categoria: producto.categoria,
        precio: producto.precio,
        stock_minimo: producto.stockMinimo,
        activo: true
      },
      create: {
        sku: producto.sku,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        categoria: producto.categoria,
        precio: producto.precio,
        stock_minimo: producto.stockMinimo,
        activo: true
      }
    });

    skuToProductId.set(producto.sku, productoDb.id);

    await prisma.inv_inventario.upsert({
      where: { producto_id: productoDb.id },
      update: {
        stock_actual: producto.stockInicial,
        stock_reservado: 0,
        stock_disponible: producto.stockInicial,
        activo: true
      },
      create: {
        producto_id: productoDb.id,
        stock_actual: producto.stockInicial,
        stock_reservado: 0,
        stock_disponible: producto.stockInicial,
        activo: true
      }
    });
  }

  const numeroOrdenToId = new Map<string, number>();

  for (const orden of ordenesSeed) {
    const clienteId = clientesByEmail.get(orden.clienteEmail);

    if (!clienteId) {
      continue;
    }

    const ordenDb = await prisma.ord_ordenes.upsert({
      where: { numero_orden: orden.numeroOrden },
      update: {
        cliente_id: clienteId,
        subtotal: orden.subtotal,
        impuestos: orden.impuestos,
        total: orden.total,
        estado: orden.estado,
        metodo_pago: orden.metodoPago,
        transaccion_id: orden.transaccionId,
        activo: true,
        created_at: orden.createdAt
      },
      create: {
        cliente_id: clienteId,
        numero_orden: orden.numeroOrden,
        subtotal: orden.subtotal,
        impuestos: orden.impuestos,
        total: orden.total,
        estado: orden.estado,
        metodo_pago: orden.metodoPago,
        transaccion_id: orden.transaccionId,
        activo: true,
        created_at: orden.createdAt
      }
    });
    numeroOrdenToId.set(orden.numeroOrden, ordenDb.id);
  }

  // Crear items de ordenes (idempotente: borra los existentes y recrea)
  for (const ordenItems of ordenItemsSeed) {
    const ordenId = numeroOrdenToId.get(ordenItems.numeroOrden);
    if (!ordenId) continue;

    await prisma.ord_orden_items.deleteMany({ where: { orden_id: ordenId } });

    for (const item of ordenItems.items) {
      const productoId = skuToProductId.get(item.sku);
      if (!productoId) continue;
      await prisma.ord_orden_items.create({
        data: {
          orden_id: ordenId,
          producto_id: productoId,
          cantidad: item.cantidad,
          precio_unitario: item.precioUnitario,
          total_linea: item.cantidad * item.precioUnitario
        }
      });
    }
  }

  const [roles, usuarios, clientes, productos, inventario] = await Promise.all([
    prisma.seg_roles.count(),
    prisma.seg_usuarios.count(),
    prisma.cli_clientes.count(),
    prisma.cat_productos.count(),
    prisma.inv_inventario.count()
  ]);

  const [ordenes, items] = await Promise.all([
    prisma.ord_ordenes.count(),
    prisma.ord_orden_items.count()
  ]);

  console.log("Seed completado:");
  console.log(`- Roles: ${roles}`);
  console.log(`- Usuarios: ${usuarios}`);
  console.log(`- Clientes: ${clientes}`);
  console.log(`- Productos: ${productos}`);
  console.log(`- Inventario: ${inventario}`);
  console.log(`- Ordenes: ${ordenes}`);
  console.log(`- Items de orden: ${items}`);
  console.log("Credenciales admin: admin@tienda.com / Admin123*");
  console.log("Credenciales cliente demo: ana@example.com / Cliente123*");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
