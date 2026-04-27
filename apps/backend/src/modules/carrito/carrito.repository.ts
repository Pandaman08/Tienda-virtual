import { prisma } from "../../config/prisma";

export const carritoRepository = {
  getOrCreateCarrito: async (clienteId: number) => {
    const existing = await prisma.ord_carritos.findFirst({ where: { cliente_id: clienteId, estado: "ACTIVO", activo: true } });
    if (existing) {
      return existing;
    }

    return prisma.ord_carritos.create({ data: { cliente_id: clienteId } });
  },

  listItems: (carritoId: number) =>
    prisma.ord_carrito_items.findMany({
      where: { carrito_id: carritoId, activo: true },
      include: { producto: true }
    }),

  upsertItem: async (carritoId: number, productoId: number, cantidad: number) => {
    const product = await prisma.cat_productos.findUnique({ where: { id: productoId } });
    if (!product) {
      throw new Error("Producto no encontrado");
    }

    const existing = await prisma.ord_carrito_items.findFirst({
      where: { carrito_id: carritoId, producto_id: productoId, activo: true }
    });

    if (existing) {
      return prisma.ord_carrito_items.update({
        where: { id: existing.id },
        data: { cantidad: existing.cantidad + cantidad }
      });
    }

    return prisma.ord_carrito_items.create({
      data: {
        carrito_id: carritoId,
        producto_id: productoId,
        cantidad,
        precio_unitario: product.precio
      }
    });
  },

  removeItem: (itemId: number) => prisma.ord_carrito_items.update({ where: { id: itemId }, data: { activo: false } }),

  clearCarrito: (carritoId: number) =>
    prisma.ord_carrito_items.updateMany({ where: { carrito_id: carritoId, activo: true }, data: { activo: false } })
};
