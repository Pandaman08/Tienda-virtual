import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { ok } from "../../common/utils/api-response";
import { carritoService } from "./carrito.service";

const addItemSchema = z.object({
  productoId: z.number().int().positive(),
  cantidad: z.number().int().positive()
});

export const carritoController = {
  getMine: async (req: Request, res: Response) => {
    const clienteId = req.user?.sub;
    if (!clienteId) {
      throw new Error("Usuario no autenticado");
    }

    const data = await carritoService.getMine(clienteId);
    res.status(StatusCodes.OK).json(ok("Carrito obtenido", data));
  },

  addItem: async (req: Request, res: Response) => {
    const clienteId = req.user?.sub;
    if (!clienteId) {
      throw new Error("Usuario no autenticado");
    }

    const input = addItemSchema.parse(req.body);
    const data = await carritoService.addItem(clienteId, input.productoId, input.cantidad);
    res.status(StatusCodes.CREATED).json(ok("Item agregado al carrito", data));
  },

  removeItem: async (req: Request, res: Response) => {
    const itemId = z.coerce.number().parse(req.params.itemId);
    const data = await carritoService.removeItem(itemId);
    res.status(StatusCodes.OK).json(ok("Item eliminado", data));
  },

  clear: async (req: Request, res: Response) => {
    const clienteId = req.user?.sub;
    if (!clienteId) {
      throw new Error("Usuario no autenticado");
    }

    const data = await carritoService.clear(clienteId);
    res.status(StatusCodes.OK).json(ok("Carrito vaciado", data));
  }
};
