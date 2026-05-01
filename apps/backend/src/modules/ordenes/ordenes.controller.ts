import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { ok } from "../../common/utils/api-response";
import { ordenesService } from "./ordenes.service";

const checkoutSchema = z.object({
  metodoPago: z.enum(["TARJETA", "YAPE", "PLIN", "TRANSFERENCIA"]),
  tarjetaNumero: z.string().optional(),
  titular: z.string().optional(),
  cvv: z.string().optional(),
  expiracion: z.string().optional(),
  telefonoYape: z.string().optional(),
  numeroOperacion: z.string().optional()
});

const listSchema = z.object({
  desde: z.string().optional(),
  hasta: z.string().optional(),
  cliente: z.string().optional(),
  clienteId: z.coerce.number().int().positive().optional()
});

export const ordenesController = {
  checkout: async (req: Request, res: Response) => {
    const clienteId = req.user?.clienteId;
    if (!clienteId) {
      throw new Error("Usuario no autenticado o sin perfil de cliente");
    }

    const input = checkoutSchema.parse(req.body);
    const data = await ordenesService.checkout(clienteId, input);
    res.status(StatusCodes.CREATED).json(ok("Orden creada", data));
  },

  mine: async (req: Request, res: Response) => {
    const clienteId = req.user?.clienteId;
    if (!clienteId) {
      throw new Error("Usuario no autenticado o sin perfil de cliente");
    }

    const data = await ordenesService.mine(clienteId);
    res.status(StatusCodes.OK).json(ok("Ordenes del cliente", data));
  },

  all: async (req: Request, res: Response) => {
    const filters = listSchema.parse(req.query);
    const data = await ordenesService.all(filters);
    res.status(StatusCodes.OK).json(ok("Ordenes del sistema", data));
  },

  detail: async (req: Request, res: Response) => {
    const id = z.coerce.number().parse(req.params.id);
    const data = await ordenesService.detail(id);
    res.status(StatusCodes.OK).json(ok("Detalle de orden", data));
  },

  anular: async (req: Request, res: Response) => {
    const id = z.coerce.number().parse(req.params.id);
    const data = await ordenesService.anular(id);
    res.status(StatusCodes.OK).json(ok("Venta anulada y stock revertido", data));
  },

  devolucion: async (req: Request, res: Response) => {
    const id = z.coerce.number().parse(req.params.id);
    const data = await ordenesService.devolucion(id);
    res.status(StatusCodes.OK).json(ok("Devolución registrada y stock revertido", data));
  },

  changeEstado: async (req: Request, res: Response) => {
    const id = z.coerce.number().parse(req.params.id);
    const estado = z.string().parse(req.body.estado);
    const data = await ordenesService.changeEstado(id, estado);
    res.status(StatusCodes.OK).json(ok("Estado actualizado", data));
  }
};
