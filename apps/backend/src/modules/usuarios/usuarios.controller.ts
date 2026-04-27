import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ok } from "../../common/utils/api-response";
import { usuariosService } from "./usuarios.service";

export const usuariosController = {
  list: async (_req: Request, res: Response) => {
    const data = await usuariosService.list();
    res.status(StatusCodes.OK).json(ok("Usuarios obtenidos", data));
  }
};
