import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { ok } from "../../common/utils/api-response";
import { configuracionService } from "./configuracion.service";

const configSchema = z.object({
  nombre: z.string().min(1).max(120).optional(),
  logo: z.string().max(2_000_000).nullable().optional(),
  ruc: z.string().max(20).nullable().optional(),
  direccion: z.string().max(200).nullable().optional(),
  telefono: z.string().max(30).nullable().optional(),
  email: z.string().email().max(120).nullable().optional(),
  igv: z.string().max(5).optional(),
  moneda_simbolo: z.string().max(5).optional(),
  moneda_nombre: z.string().max(30).optional(),
  serie_boleta: z.string().max(20).optional(),
  serie_factura: z.string().max(20).optional(),
});

export const configuracionController = {
  get: async (_req: Request, res: Response) => {
    const data = await configuracionService.get();
    res.status(StatusCodes.OK).json(ok("Configuración obtenida", data));
  },

  save: async (req: Request, res: Response) => {
    const data = configSchema.parse(req.body);
    const result = await configuracionService.save(data);
    res.status(StatusCodes.OK).json(ok("Configuración guardada", result));
  },
};
