import { prisma } from "../../config/prisma";

export const reportesRepository = {
  ventasResumen: async () => {
    const ordenes = await prisma.ord_ordenes.findMany({ where: { activo: true } });
    const ventasTotales = ordenes.reduce((acc: number, o) => acc + Number(o.total), 0);
    const ticketPromedio = ordenes.length ? ventasTotales / ordenes.length : 0;
    return {
      totalOrdenes: ordenes.length,
      ventasTotales,
      ticketPromedio
    };
  }
};
