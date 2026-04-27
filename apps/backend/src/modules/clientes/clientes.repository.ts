import { prisma } from "../../config/prisma";

export const clientesRepository = {
  list: () => prisma.cli_clientes.findMany({ where: { activo: true }, orderBy: { created_at: "desc" } }),
  getById: (id: number) => prisma.cli_clientes.findUnique({ where: { id } }),
  update: (id: number, data: Partial<{ nombre: string; apellido: string; telefono: string }>) =>
    prisma.cli_clientes.update({ where: { id }, data }),
  remove: (id: number) => prisma.cli_clientes.update({ where: { id }, data: { activo: false } })
};
