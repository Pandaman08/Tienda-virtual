import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { ok } from "../../common/utils/api-response";
import { inventarioService } from "./inventario.service";

export const inventarioController = {
  list: async (_req: Request, res: Response) => {
    const data = await inventarioService.list();
    res.status(StatusCodes.OK).json(ok("Inventario obtenido", data));
  },

  adjust: async (req: Request, res: Response) => {
    const productoId = z.coerce.number().parse(req.params.productoId);
    const stockActual = z.coerce.number().int().min(0).parse(req.body.stockActual);
    const data = await inventarioService.adjust(productoId, stockActual);
    res.status(StatusCodes.OK).json(ok("Stock actualizado", data));
  }
};
