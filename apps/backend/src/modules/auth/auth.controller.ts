import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { ok } from "../../common/utils/api-response";
import { env } from "../../config/env";
import { loginSchema, registerSchema } from "./auth.schemas";
import { authService } from "./auth.service";

export const authController = {
  register: async (req: Request, res: Response) => {
    const input = registerSchema.parse(req.body);
    const data = await authService.register(input);
    res.status(StatusCodes.CREATED).json(ok("Usuario registrado", data));
  },

  login: async (req: Request, res: Response) => {
    const input = loginSchema.parse(req.body);
    const data = await authService.login(input.email, input.password);
    res.status(StatusCodes.OK).json(ok("Login exitoso", data));
  },

  refresh: async (req: Request, res: Response) => {
    const token = req.body.refreshToken as string;
    const raw = jwt.verify(token, env.JWT_REFRESH_SECRET) as unknown;
    if (typeof raw !== "object" || raw === null || !("sub" in raw) || !("rol" in raw)) {
      throw new Error("Refresh token invalido");
    }

    const payload = raw as { sub: number; rol: "ADMIN" | "CLIENTE"; clienteId?: number | null };
    const data = await authService.refresh(payload.sub, token, payload.rol, payload.clienteId ?? undefined);
    res.status(StatusCodes.OK).json(ok("Token actualizado", data));
  }
};
