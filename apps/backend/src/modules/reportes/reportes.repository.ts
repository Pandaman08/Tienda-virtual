import { prisma } from "../../config/prisma";

export type Periodo = "dia" | "semana" | "mes" | "trimestre" | "anio" | "todo";

function fechaDesde(periodo: Periodo): Date | undefined {
  if (periodo === "todo") return undefined;
  const now = new Date();
  switch (periodo) {
    case "dia":       { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    case "semana":    { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; }
    case "mes":       { return new Date(now.getFullYear(), now.getMonth(), 1); }
    case "trimestre": { return new Date(now.getFullYear(), now.getMonth() - 2, 1); }
    case "anio":      { return new Date(now.getFullYear(), 0, 1); }
  }
}

async function whereItemsByPeriodo(periodo: Periodo) {
  const desde = fechaDesde(periodo);
  if (!desde) return {};

  const ordenIds = (await prisma.ord_ordenes.findMany({
    where: { activo: true, created_at: { gte: desde } },
    select: { id: true }
  })).map((o) => o.id);

  // Si no hay ordenes en el rango, hacemos fallback a historico para no vaciar los graficos.
  if (!ordenIds.length) return {};

  return { orden_id: { in: ordenIds } };
}

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
  },

  topProductos: async (periodo: Periodo = "todo", limit = 8) => {
    const whereItems = await whereItemsByPeriodo(periodo);

    const items = await prisma.ord_orden_items.groupBy({
      by: ["producto_id"],
      where: whereItems,
      _sum: { cantidad: true, total_linea: true },
      orderBy: { _sum: { cantidad: "desc" } },
      take: limit
    });

    const ids = items.map((i) => i.producto_id);
    const productos = await prisma.cat_productos.findMany({
      where: { id: { in: ids } },
      select: { id: true, nombre: true, categoria: true }
    });

    return items.map((i) => {
      const p = productos.find((pr) => pr.id === i.producto_id);
      return {
        nombre: p?.nombre ?? `Prod #${i.producto_id}`,
        categoria: p?.categoria ?? "",
        unidades: i._sum.cantidad ?? 0,
        ingresos: Number(i._sum.total_linea ?? 0)
      };
    });
  },

  ventasPorCategoria: async (periodo: Periodo = "todo") => {
    const whereItems = await whereItemsByPeriodo(periodo);

    const items = await prisma.ord_orden_items.findMany({
      where: whereItems,
      select: {
        total_linea: true,
        cantidad: true,
        producto: { select: { categoria: true } }
      }
    });

    const grouped = items.reduce<Record<string, { ingresos: number; unidades: number }>>(
      (acc, item) => {
        const cat = item.producto.categoria;
        if (!acc[cat]) acc[cat] = { ingresos: 0, unidades: 0 };
        acc[cat].ingresos += Number(item.total_linea);
        acc[cat].unidades += item.cantidad;
        return acc;
      },
      {}
    );

    return Object.entries(grouped)
      .map(([categoria, { ingresos, unidades }]) => ({ categoria, ingresos, unidades }))
      .sort((a, b) => b.ingresos - a.ingresos);
  }
};
