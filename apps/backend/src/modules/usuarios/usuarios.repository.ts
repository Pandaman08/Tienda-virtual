import { prisma } from "../../config/prisma";

export const usuariosRepository = {
  list: (incluirInactivos = false) =>
    prisma.seg_usuarios.findMany({
      where: { activo: incluirInactivos ? undefined : true },
      include: {
        rol: true,
        cliente: true
      },
      orderBy: { created_at: "desc" }
    }),

  findById: (id: number) =>
    prisma.seg_usuarios.findUnique({
      where: { id },
      include: { rol: true, cliente: true }
    }),

  updatePerfilPropio: async (
    userId: number,
    data: { email?: string; nombre?: string; apellido?: string; telefono?: string }
  ) => {
    const user = await prisma.seg_usuarios.findUnique({ where: { id: userId }, include: { cliente: true } });
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    if (user.cliente_id) {
      return prisma.$transaction(async (tx) => {
        const updatedCliente = await tx.cli_clientes.update({
          where: { id: user.cliente_id as number },
          data: {
            nombre: data.nombre,
            apellido: data.apellido,
            telefono: data.telefono,
            email: data.email
          }
        });

        const updatedUser = await tx.seg_usuarios.update({
          where: { id: userId },
          data: { email: data.email },
          include: { rol: true, cliente: true }
        });

        return { user: updatedUser, cliente: updatedCliente };
      });
    }

    if (data.nombre || data.apellido || data.telefono) {
      return prisma.$transaction(async (tx) => {
        const cliente = await tx.cli_clientes.create({
          data: {
            nombre: data.nombre || "Usuario",
            apellido: data.apellido || "Sistema",
            telefono: data.telefono,
            email: data.email || user.email
          }
        });

        const updatedUser = await tx.seg_usuarios.update({
          where: { id: userId },
          data: {
            email: data.email,
            cliente_id: cliente.id
          },
          include: { rol: true, cliente: true }
        });

        return { user: updatedUser, cliente };
      });
    }

    return prisma.seg_usuarios.update({
      where: { id: userId },
      data: { email: data.email },
      include: { rol: true, cliente: true }
    });
  },

  updatePasswordHash: (userId: number, passwordHash: string) =>
    prisma.seg_usuarios.update({
      where: { id: userId },
      data: { password_hash: passwordHash },
      include: { rol: true, cliente: true }
    }),

  updateCredencialesClienteByAdmin: async (
    userId: number,
    data: {
      email?: string;
      passwordHash?: string;
      nombre?: string;
      apellido?: string;
      telefono?: string;
      activo?: boolean;
    }
  ) => {
    const user = await prisma.seg_usuarios.findUnique({ where: { id: userId }, include: { rol: true, cliente: true } });
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    if (user.rol.nombre !== "CLIENTE") {
      throw new Error("Solo se pueden modificar credenciales de clientes");
    }

    return prisma.$transaction(async (tx) => {
      if (user.cliente_id) {
        await tx.cli_clientes.update({
          where: { id: user.cliente_id },
          data: {
            nombre: data.nombre,
            apellido: data.apellido,
            telefono: data.telefono,
            email: data.email
          }
        });
      }

      const updatedUser = await tx.seg_usuarios.update({
        where: { id: userId },
        data: {
          email: data.email,
          password_hash: data.passwordHash,
          activo: data.activo
        },
        include: { rol: true, cliente: true }
      });

      return updatedUser;
    });
  }
};
