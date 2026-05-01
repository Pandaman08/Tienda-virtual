import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ok } from "../../common/utils/api-response";
import { usuariosService } from "./usuarios.service";
import { z } from "zod";

const perfilSchema = z.object({
  email: z.string().email().optional(),
  nombre: z.string().min(2).optional(),
  apellido: z.string().min(2).optional(),
  telefono: z.string().min(6).optional()
});

const passwordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8)
});

const credencialesClienteSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  nombre: z.string().min(2).optional(),
  apellido: z.string().min(2).optional(),
  telefono: z.string().min(6).optional(),
  activo: z.boolean().optional()
});

export const usuariosController = {
  list: async (req: Request, res: Response) => {
    const incluirInactivos = z.coerce.boolean().optional().parse(req.query.incluirInactivos);
    const data = await usuariosService.list(Boolean(incluirInactivos));
    res.status(StatusCodes.OK).json(ok("Usuarios obtenidos", data));
  },

  me: async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const data = await usuariosService.me(userId);
    res.status(StatusCodes.OK).json(ok("Perfil obtenido", data));
  },

  updateMiPerfil: async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const input = perfilSchema.parse(req.body);
    const data = await usuariosService.updateMiPerfil(userId, input);
    res.status(StatusCodes.OK).json(ok("Perfil actualizado", data));
  },

  updateMiPassword: async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    if (!userId) {
      throw new Error("Usuario no autenticado");
    }

    const input = passwordSchema.parse(req.body);
    const data = await usuariosService.updateMiPassword(userId, input);
    res.status(StatusCodes.OK).json(ok("Contrasena actualizada", data));
  },

  updateCredencialesCliente: async (req: Request, res: Response) => {
    const userId = z.coerce.number().parse(req.params.id);
    const input = credencialesClienteSchema.parse(req.body);
    const data = await usuariosService.updateCredencialesCliente(userId, input);
    res.status(StatusCodes.OK).json(ok("Credenciales del cliente actualizadas", data));
  }
};
