import { catalogoRepository } from "./catalogo.repository";

export const catalogoService = {
  list: async (params: { page: number; limit: number; q?: string; categoria?: string }) => {
    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      catalogoRepository.findMany(skip, params.limit, params.q, params.categoria),
      catalogoRepository.count(params.q, params.categoria)
    ]);

    return {
      items,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit)
      }
    };
  },

  create: catalogoRepository.create,
  update: catalogoRepository.update,
  remove: catalogoRepository.softDelete
};
