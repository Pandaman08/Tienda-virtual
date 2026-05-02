import { prisma } from "../../config/prisma";
import { Prisma } from "@prisma/client";

export const ordenesRepository = {
  getCarritoWithItems: (clienteId: number) =>
    prisma.ord_carritos.findFirst({
      where: { cliente_id: clienteId, estado: "ACTIVO", activo: true },
      include: { items: { where: { activo: true }, include: { producto: true } } }
    }),

  createOrdenDesdeCarrito: async (clienteId: number, metodoPago: string, transaccionId?: string) => {
    const carrito = await prisma.ord_carritos.findFirst({
      where: { cliente_id: clienteId, estado: "ACTIVO", activo: true },
      include: { items: { where: { activo: true } } }
    });

    if (!carrito || carrito.items.length === 0) {
      throw new Error("Carrito vacio");
    }

    const subtotal = carrito.items.reduce((acc: number, item) => acc + Number(item.precio_unitario) * item.cantidad, 0);
    const impuestos = subtotal * 0.18;
    const total = subtotal + impuestos;

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of carrito.items) {
        const inventario = await tx.inv_inventario.findUnique({ where: { producto_id: item.producto_id } });
        if (!inventario || inventario.stock_disponible < item.cantidad) {
          throw new Error(`Stock insuficiente para el producto #${item.producto_id}`);
        }
      }

      const orden = await tx.ord_ordenes.create({
        data: {
          cliente_id: clienteId,
          numero_orden: `ORD-${Date.now()}`,
          subtotal,
          impuestos,
          total,
          metodo_pago: metodoPago,
          transaccion_id: transaccionId,
          estado: "PAGADA"
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

  listByCliente: (clienteId: number) =>
    prisma.ord_ordenes.findMany({
      where: { cliente_id: clienteId, activo: true },
      orderBy: { created_at: "desc" },
      include: {
        items: {
          where: { activo: true },
          include: {
            producto: { select: { id: true, nombre: true, imagen_url: true, categoria: true } }
          }
        }
      }
    }),

  findByIdWithDetail: async (id: number) => {
    const orden = await prisma.ord_ordenes.findFirst({
      where: { id, activo: true },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        },
        items: {
          where: { activo: true },
          include: {
            producto: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!orden) {
      throw new Error("Orden no encontrada");
    }

    return orden;
  },

  listAll: (filters?: { desde?: Date; hasta?: Date; cliente?: string; clienteId?: number }) =>
    prisma.ord_ordenes.findMany({
      where: {
        activo: true,
        ...(filters?.clienteId ? { cliente_id: filters.clienteId } : {}),
        created_at: {
          gte: filters?.desde,
          lte: filters?.hasta
        },
        cliente: filters?.cliente
          ? {
              OR: [
                { nombre: { contains: filters.cliente, mode: "insensitive" } },
                { apellido: { contains: filters.cliente, mode: "insensitive" } },
                { email: { contains: filters.cliente, mode: "insensitive" } }
              ]
            }
          : undefined
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true
          }
        }
      },
      orderBy: { created_at: "desc" }
    }),

  revertirVenta: async (id: number) =>
    prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const orden = await tx.ord_ordenes.findFirst({
        where: { id, activo: true },
        include: {
          items: { where: { activo: true } },
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true
            }
          }
        }
      });

      if (!orden) {
        throw new Error("Orden no encontrada");
      }

      if (orden.estado === "ANULADA" || orden.estado === "DEVUELTA") {
        throw new Error("La venta ya fue anulada o tiene una devolución registrada");
      }

      for (const item of orden.items) {
        await tx.inv_inventario.update({
          where: { producto_id: item.producto_id },
          data: {
            stock_actual: { increment: item.cantidad },
            stock_disponible: { increment: item.cantidad }
          }
        });
      }

      const ordenActualizada = await tx.ord_ordenes.update({
        where: { id: orden.id },
        data: {
          estado: "ANULADA"
        },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true
            }
          },
          items: {
            where: { activo: true },
            include: {
              producto: {
                select: {
                  id: true,
                  nombre: true
                }
              }
            }
          }
        }
      });

      return ordenActualizada;
    }),

  registrarDevolucion: async (id: number) =>
    prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const orden = await tx.ord_ordenes.findFirst({
        where: { id, activo: true },
        include: {
          items: { where: { activo: true } },
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true
            }
          }
        }
      });

      if (!orden) {
        throw new Error("Orden no encontrada");
      }

      if (orden.estado === "ANULADA") {
        throw new Error("La venta ya fue anulada; no se puede registrar devolución");
      }

      if (orden.estado === "DEVUELTA") {
        throw new Error("Ya existe una devolución registrada para esta venta");
      }

      for (const item of orden.items) {
        await tx.inv_inventario.update({
          where: { producto_id: item.producto_id },
          data: {
            stock_actual: { increment: item.cantidad },
            stock_disponible: { increment: item.cantidad }
          }
        });
      }

      return tx.ord_ordenes.update({
        where: { id: orden.id },
        data: { estado: "DEVUELTA" },
        include: {
          cliente: {
            select: { id: true, nombre: true, apellido: true, email: true }
          },
          items: {
            where: { activo: true },
            include: { producto: { select: { id: true, nombre: true } } }
          }
        }
      });
    }),

  updateEstado: (id: number, estado: string) => prisma.ord_ordenes.update({ where: { id }, data: { estado } })
};
