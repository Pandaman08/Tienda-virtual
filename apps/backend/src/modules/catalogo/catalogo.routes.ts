import { Router } from "express";
import { authMiddleware, authorize } from "../../common/middlewares/auth.middleware";
import { catalogoController } from "./catalogo.controller";

export const catalogoRoutes = Router();

catalogoRoutes.get("/", catalogoController.list);
catalogoRoutes.post("/", authMiddleware, authorize("ADMIN"), catalogoController.create);
catalogoRoutes.patch("/:id", authMiddleware, authorize("ADMIN"), catalogoController.update);
catalogoRoutes.delete("/:id", authMiddleware, authorize("ADMIN"), catalogoController.remove);
