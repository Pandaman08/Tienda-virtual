import { prisma } from "../../config/prisma";

export const usuariosRepository = {
  list: () =>
    prisma.seg_usuarios.findMany({
      where: { activo: true },
      include: {
        rol: true,
        cliente: true
      },
      orderBy: { created_at: "desc" }
    })
};
