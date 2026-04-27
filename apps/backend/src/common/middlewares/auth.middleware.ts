import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env";

type JwtPayload = {
  sub: number;
  rol: "ADMIN" | "CLIENTE";
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Token no proporcionado",
      data: null
    });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      message: "Token invalido",
      data: null
    });
  }
};

export const authorize = (...roles: Array<"ADMIN" | "CLIENTE">) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.rol)) {
      res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "No tienes permisos para realizar esta accion",
        data: null
      });
      return;
    }
    next();
  };
};
