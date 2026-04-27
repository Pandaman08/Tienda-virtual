import { prisma } from "../../config/prisma";

export const ordenesRepository = {
  getCarritoWithItems: (clienteId: number) =>
    prisma.ord_carritos.findFirst({
      where: { cliente_id: clienteId, estado: "ACTIVO", activo: true },
      include: { items: { where: { activo: true }, include: { producto: true } } }
    }),

  createOrdenDesdeCarrito: async (clienteId: number, metodoPago: string) => {
    const carrito = await prisma.ord_carritos.findFirst({
      where: { cliente_id: clienteId, estado: "ACTIVO", activo: true },
      include: { items: { where: { activo: true } } }
    });

    if (!carrito || carrito.items.length === 0) {
      throw new Error("Carrito vacio");
    }

    const subtotal = carrito.items.reduce((acc, item) => acc + Number(item.precio_unitario) * item.cantidad, 0);
    const impuestos = subtotal * 0.18;
    const total = subtotal + impuestos;

    return prisma.$transaction(async (tx) => {
      const orden = await tx.ord_ordenes.create({
        data: {
          cliente_id: clienteId,
          numero_orden: `ORD-${Date.now()}`,
          subtotal,
          impuestos,
          total,
          metodo_pago: metodoPago
        }
      });

      for (const item of carrito.items) {
        await tx.ord_orden_items.create({
          data: {
            orden_id: orden.id,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            total_linea: Number(item.precio_unitario) * item.cantidad
          }
        });

        await tx.inv_inventario.update({
          where: { producto_id: item.producto_id },
          data: {
            stock_actual: { decrement: item.cantidad },
            stock_disponible: { decrement: item.cantidad }
          }
        });
      }

      await tx.ord_carrito_items.updateMany({ where: { carrito_id: carrito.id, activo: true }, data: { activo: false } });

      return orden;
    });
  },

  listByCliente: (clienteId: number) => prisma.ord_ordenes.findMany({ where: { cliente_id: clienteId, activo: true } }),
  listAll: () => prisma.ord_ordenes.findMany({ where: { activo: true }, orderBy: { created_at: "desc" } }),
  updateEstado: (id: number, estado: string) => prisma.ord_ordenes.update({ where: { id }, data: { estado } })
};
