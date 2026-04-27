import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ok } from "../../common/utils/api-response";
import { reportesService } from "./reportes.service";

export const reportesController = {
  kpis: async (_req: Request, res: Response) => {
    const data = await reportesService.kpis();
    res.status(StatusCodes.OK).json(ok("KPIs obtenidos", data));
  },

  operacional: async (_req: Request, res: Response) => {
    const pdf = await reportesService.generarOperacional();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=operacional.pdf");
    res.status(StatusCodes.OK).send(pdf);
  },

  gestion: async (_req: Request, res: Response) => {
    const pdf = await reportesService.generarGestion();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=gestion.pdf");
    res.status(StatusCodes.OK).send(pdf);
  }
};
