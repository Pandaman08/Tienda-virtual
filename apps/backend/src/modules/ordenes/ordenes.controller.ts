import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { ok } from "../../common/utils/api-response";
import { ordenesService } from "./ordenes.service";

const checkoutSchema = z.object({
  metodoPago: z.string().min(3)
});

export const ordenesController = {
  checkout: async (req: Request, res: Response) => {
    const clienteId = req.user?.sub;
    if (!clienteId) {
      throw new Error("Usuario no autenticado");
    }

    const input = checkoutSchema.parse(req.body);
    const data = await ordenesService.checkout(clienteId, input.metodoPago);
    res.status(StatusCodes.CREATED).json(ok("Orden creada", data));
  },

  mine: async (req: Request, res: Response) => {
    const clienteId = req.user?.sub;
    if (!clienteId) {
      throw new Error("Usuario no autenticado");
    }

    const data = await ordenesService.mine(clienteId);
    res.status(StatusCodes.OK).json(ok("Ordenes del cliente", data));
  },

  all: async (_req: Request, res: Response) => {
    const data = await ordenesService.all();
    res.status(StatusCodes.OK).json(ok("Ordenes del sistema", data));
  },

  changeEstado: async (req: Request, res: Response) => {
    const id = z.coerce.number().parse(req.params.id);
    const estado = z.string().parse(req.body.estado);
    const data = await ordenesService.changeEstado(id, estado);
    res.status(StatusCodes.OK).json(ok("Estado actualizado", data));
  }
};
