import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import multer from "multer";
import { ZodError } from "zod";

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        success: false,
        message: "La imagen supera el limite de 5MB",
        data: null
      });
      return;
    }

    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message,
      data: null
    });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as { type?: string }).type === "entity.too.large"
  ) {
    res.status(413).json({
      success: false,
      message: "La imagen es demasiado grande. Usa una imagen mas liviana.",
      data: null
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: "Error de validacion",
      data: error.flatten()
    });
    return;
  }

  if (error instanceof Error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
      data: null
    });
    return;
  }

  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    message: "Error interno del servidor",
    data: null
  });
};
