import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { ok } from "../../common/utils/api-response";
import { clientesService } from "./clientes.service";

const updateSchema = z.object({
  nombre: z.string().min(2).optional(),
  apellido: z.string().min(2).optional(),
  telefono: z.string().optional()
});

export const clientesController = {
  list: async (_req: Request, res: Response) => {
    const data = await clientesService.list();
    res.status(StatusCodes.OK).json(ok("Clientes obtenidos", data));
  },

  getById: async (req: Request, res: Response) => {
    const id = z.coerce.number().parse(req.params.id);
    const data = await clientesService.getById(id);
    res.status(StatusCodes.OK).json(ok("Cliente obtenido", data));
  },

  update: async (req: Request, res: Response) => {
    const id = z.coerce.number().parse(req.params.id);
    const input = updateSchema.parse(req.body);
    const data = await clientesService.update(id, input);
    res.status(StatusCodes.OK).json(ok("Cliente actualizado", data));
  },

  remove: async (req: Request, res: Response) => {
    const id = z.coerce.number().parse(req.params.id);
    const data = await clientesService.remove(id);
    res.status(StatusCodes.OK).json(ok("Cliente eliminado logicamente", data));
  }
};
