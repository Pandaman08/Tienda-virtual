import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ok } from "../../common/utils/api-response";
import { reportesService } from "./reportes.service";
import type { Periodo } from "./reportes.repository";

const PERIODOS_VALIDOS: Periodo[] = ["dia", "semana", "mes", "trimestre", "anio", "todo"];

export const reportesController = {
  kpis: async (_req: Request, res: Response) => {
    const data = await reportesService.kpis();
    res.status(StatusCodes.OK).json(ok("KPIs obtenidos", data));
  },

  graficos: async (req: Request, res: Response) => {
    const raw = req.query.periodo as string | undefined;
    const periodo: Periodo = PERIODOS_VALIDOS.includes(raw as Periodo) ? (raw as Periodo) : "todo";
    const data = await reportesService.graficos(periodo);
    res.status(StatusCodes.OK).json(ok("Graficos obtenidos", data));
  },

  operacional: async (req: Request, res: Response) => {
    const empresa = typeof req.query.empresa === "string" && req.query.empresa.trim()
      ? req.query.empresa.trim()
      : "Tienda Virtual";
    const pdf = await reportesService.generarOperacional(empresa);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=operacional.pdf");
    res.status(StatusCodes.OK).send(pdf);
  },

  gestion: async (req: Request, res: Response) => {
    const empresa = typeof req.query.empresa === "string" && req.query.empresa.trim()
      ? req.query.empresa.trim()
      : "Tienda Virtual";
    const pdf = await reportesService.generarGestion(empresa);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=gestion.pdf");
    res.status(StatusCodes.OK).send(pdf);
  }
};
