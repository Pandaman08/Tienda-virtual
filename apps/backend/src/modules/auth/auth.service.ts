import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { authRepository } from "./auth.repository";

const createTokens = (userId: number, rol: "ADMIN" | "CLIENTE", clienteId?: number) => {
  const accessToken = jwt.sign({ sub: userId, rol, clienteId: clienteId ?? null }, env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ sub: userId, rol, clienteId: clienteId ?? null }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
};

export const authService = {
  register: async (input: {
    nombre: string;
    apellido: string;
    email: string;
    telefono?: string;
    password: string;
  }) => {
    const existing = await authRepository.findUsuarioByEmail(input.email);
    if (existing) {
      throw new Error("El usuario ya existe");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const result = await authRepository.createClienteYUsuario({ ...input, passwordHash });
    const rol = result.usuario.rol.nombre as "ADMIN" | "CLIENTE";
    const tokens = createTokens(result.usuario.id, rol, result.cliente.id);

    await authRepository.updateRefreshTokenHash(result.usuario.id, await bcrypt.hash(tokens.refreshToken, 10));

    return {
      usuario: {
        id: result.usuario.id,
        email: result.usuario.email,
        rol
      },
      ...tokens
    };
  },

  login: async (email: string, password: string) => {
    const user = await authRepository.findUsuarioByEmail(email);
    if (!user?.activo) {
      throw new Error("Credenciales invalidas");
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new Error("Credenciales invalidas");
    }

    const rol = user.rol.nombre as "ADMIN" | "CLIENTE";
    const clienteId = user.cliente_id ?? undefined;
    const tokens = createTokens(user.id, rol, clienteId);
    await authRepository.updateRefreshTokenHash(user.id, await bcrypt.hash(tokens.refreshToken, 10));

    return {
      usuario: {
        id: user.id,
        email: user.email,
        rol
      },
      ...tokens
    };
  },

  refresh: async (userId: number, refreshToken: string, rol: "ADMIN" | "CLIENTE", clienteId?: number) => {
    if (!refreshToken) {
      throw new Error("Refresh token requerido");
    }

    const tokens = createTokens(userId, rol, clienteId);
    return tokens;
  }
};
