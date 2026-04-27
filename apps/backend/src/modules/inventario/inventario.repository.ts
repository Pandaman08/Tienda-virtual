import { prisma } from "../../config/prisma";

export const inventarioRepository = {
  list: () => prisma.inv_inventario.findMany({ include: { producto: true }, where: { activo: true } }),
  adjust: (productoId: number, stockActual: number) =>
    prisma.inv_inventario.update({
      where: { producto_id: productoId },
      data: {
        stock_actual: stockActual,
        stock_disponible: stockActual
      }
    })
};
