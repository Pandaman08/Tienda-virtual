import { prisma } from "../../config/prisma";

export const catalogoRepository = {
  findMany: (skip: number, take: number, q?: string, categoria?: string, incluirInactivos = false) =>
    prisma.cat_productos.findMany({
      where: {
        activo: incluirInactivos ? undefined : true,
        nombre: q ? { contains: q, mode: "insensitive" } : undefined,
        categoria: categoria || undefined
      },
      include: {
        inventario: {
          select: {
            stock_disponible: true
          }
        }
      },
      skip,
      take,
      orderBy: { created_at: "desc" }
    }),

  count: (q?: string, categoria?: string, incluirInactivos = false) =>
    prisma.cat_productos.count({
      where: {
        activo: incluirInactivos ? undefined : true,
        nombre: q ? { contains: q, mode: "insensitive" } : undefined,
        categoria: categoria || undefined
      }
    }),

  create: (data: {
    sku: string;
    nombre: string;
    descripcion?: string;
    imagenUrl?: string;
    categoria: string;
    precio: number;
    stockMinimo?: number;
  }) =>
    prisma.cat_productos.create({
      data: {
        sku: data.sku,
        nombre: data.nombre,
        descripcion: data.descripcion,
        imagen_url: data.imagenUrl,
        categoria: data.categoria,
        precio: data.precio,
        stock_minimo: data.stockMinimo ?? 5
      }
    }),

  update: (id: number, data: Partial<{ nombre: string; descripcion: string; imagenUrl: string; categoria: string; precio: number }>) =>
    prisma.cat_productos.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        imagen_url: data.imagenUrl,
        categoria: data.categoria,
        precio: data.precio
      }
    }),

  softDelete: (id: number) => prisma.cat_productos.update({ where: { id }, data: { activo: false } }),

  setActivo: (id: number, activo: boolean) => prisma.cat_productos.update({ where: { id }, data: { activo } })
};
