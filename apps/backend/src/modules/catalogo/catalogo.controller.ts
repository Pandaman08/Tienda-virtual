import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { ok } from "../../common/utils/api-response";
import { catalogoService } from "./catalogo.service";

const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  q: z.string().optional(),
  categoria: z.string().optional(),
  incluirInactivos: z.coerce.boolean().optional()
});

const createSchema = z.object({
  sku: z.string().min(2),
  nombre: z.string().min(2),
  descripcion: z.string().optional(),
  imagenUrl: z.string().trim().min(6).optional(),
  categoria: z.string().min(2),
  precio: z.coerce.number().positive(),
  stockMinimo: z.coerce.number().int().min(0).optional()
});

const updateSchema = createSchema.partial().omit({ sku: true });
const estadoSchema = z.object({ activo: z.boolean() });

export const catalogoController = {
  list: async (req: Request, res: Response) => {
    const input = listSchema.parse(req.query);
    const data = await catalogoService.list(input);
    res.status(StatusCodes.OK).json(ok("Catalogo obtenido", data));
  },

  create: async (req: Request, res: Response) => {
    const input = createSchema.parse({
      ...req.body,
      imagenUrl: req.file
        ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
        : req.body.imagenUrl
    });
    const data = await catalogoService.create(input);
    res.status(StatusCodes.CREATED).json(ok("Producto creado", data));
  },

  update: async (req: Request, res: Response) => {
    const id = z.coerce.number().parse(req.params.id);
    const input = updateSchema.parse({
      ...req.body,
      imagenUrl: req.file
        ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
        : req.body.imagenUrl
    });
    const data = await catalogoService.update(id, input);
    res.status(StatusCodes.OK).json(ok("Producto actualizado", data));
  },

  remove: async (req: Request, res: Response) => {
    const id = z.coerce.number().parse(req.params.id);
    const data = await catalogoService.remove(id);
    res.status(StatusCodes.OK).json(ok("Producto eliminado logicamente", data));
  },

  setEstado: async (req: Request, res: Response) => {
    const id = z.coerce.number().parse(req.params.id);
    const { activo } = estadoSchema.parse(req.body);
    const data = await catalogoService.setActivo(id, activo);
    res.status(StatusCodes.OK).json(ok("Estado de producto actualizado", data));
  }
};
