import { prisma } from "../../config/prisma";

export const catalogoRepository = {
  findMany: (skip: number, take: number, q?: string, categoria?: string) =>
    prisma.cat_productos.findMany({
      where: {
        activo: true,
        nombre: q ? { contains: q, mode: "insensitive" } : undefined,
        categoria: categoria || undefined
      },
      skip,
      take,
      orderBy: { created_at: "desc" }
    }),

  count: (q?: string, categoria?: string) =>
    prisma.cat_productos.count({
      where: {
        activo: true,
        nombre: q ? { contains: q, mode: "insensitive" } : undefined,
        categoria: categoria || undefined
      }
    }),

  create: (data: {
    sku: string;
    nombre: string;
    descripcion?: string;
    categoria: string;
    precio: number;
    stockMinimo?: number;
  }) =>
    prisma.cat_productos.create({
      data: {
        sku: data.sku,
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoria: data.categoria,
        precio: data.precio,
        stock_minimo: data.stockMinimo ?? 5
      }
    }),

  update: (id: number, data: Partial<{ nombre: string; descripcion: string; categoria: string; precio: number }>) =>
    prisma.cat_productos.update({ where: { id }, data }),

  softDelete: (id: number) => prisma.cat_productos.update({ where: { id }, data: { activo: false } })
};
