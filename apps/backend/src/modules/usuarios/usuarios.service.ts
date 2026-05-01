import { usuariosRepository } from "./usuarios.repository";
import bcrypt from "bcrypt";

export const usuariosService = {
  list: (incluirInactivos = false) => usuariosRepository.list(incluirInactivos),

  me: async (userId: number) => {
    const user = await usuariosRepository.findById(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }
    return user;
  },

  updateMiPerfil: (userId: number, data: { email?: string; nombre?: string; apellido?: string; telefono?: string }) =>
    usuariosRepository.updatePerfilPropio(userId, data),

  updateMiPassword: async (userId: number, input: { currentPassword: string; newPassword: string }) => {
    const user = await usuariosRepository.findById(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    const validPassword = await bcrypt.compare(input.currentPassword, user.password_hash);
    if (!validPassword) {
      throw new Error("La contraseña actual es incorrecta");
    }

    const newHash = await bcrypt.hash(input.newPassword, 10);
    return usuariosRepository.updatePasswordHash(userId, newHash);
  },

  updateCredencialesCliente: async (
    userId: number,
    data: { email?: string; password?: string; nombre?: string; apellido?: string; telefono?: string; activo?: boolean }
  ) => {
    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : undefined;
    return usuariosRepository.updateCredencialesClienteByAdmin(userId, {
      email: data.email,
      passwordHash,
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
      activo: data.activo
    });
  }
};
