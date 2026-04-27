import { prisma } from "../../config/prisma";

export const authRepository = {
  findUsuarioByEmail: (email: string) =>
    prisma.seg_usuarios.findUnique({ where: { email }, include: { rol: true, cliente: true } }),

  createClienteYUsuario: async (input: {
    nombre: string;
    apellido: string;
    email: string;
    telefono?: string;
    passwordHash: string;
  }) => {
    return prisma.$transaction(async (tx) => {
      const cliente = await tx.cli_clientes.create({
        data: {
          nombre: input.nombre,
          apellido: input.apellido,
          email: input.email,
          telefono: input.telefono
        }
      });

      const rolCliente = await tx.seg_roles.findFirst({ where: { nombre: "CLIENTE" } });
      if (!rolCliente) {
        throw new Error("Rol CLIENTE no encontrado");
      }

      const usuario = await tx.seg_usuarios.create({
        data: {
          rol_id: rolCliente.id,
          cliente_id: cliente.id,
          email: input.email,
          password_hash: input.passwordHash
        },
        include: { rol: true }
      });

      return { cliente, usuario };
    });
  },

  updateRefreshTokenHash: (userId: number, refreshTokenHash: string | null) =>
    prisma.seg_usuarios.update({
      where: { id: userId },
      data: { refresh_token_hash: refreshTokenHash }
    })
};
