import { Router } from "express";
import { authMiddleware, authorize } from "../../common/middlewares/auth.middleware";
import { usuariosController } from "./usuarios.controller";

export const usuariosRoutes = Router();

usuariosRoutes.use(authMiddleware, authorize("ADMIN"));
usuariosRoutes.get("/", usuariosController.list);
