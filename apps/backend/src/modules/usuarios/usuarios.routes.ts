import { Router } from "express";
import { authMiddleware, authorize } from "../../common/middlewares/auth.middleware";
import { usuariosController } from "./usuarios.controller";

export const usuariosRoutes = Router();

usuariosRoutes.use(authMiddleware);

usuariosRoutes.get("/me", usuariosController.me);
usuariosRoutes.patch("/me", usuariosController.updateMiPerfil);
usuariosRoutes.patch("/me/password", usuariosController.updateMiPassword);

usuariosRoutes.get("/", authorize("ADMIN"), usuariosController.list);
usuariosRoutes.patch("/:id/credenciales", authorize("ADMIN"), usuariosController.updateCredencialesCliente);
