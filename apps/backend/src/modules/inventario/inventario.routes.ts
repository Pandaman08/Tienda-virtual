import { Router } from "express";
import { authMiddleware, authorize } from "../../common/middlewares/auth.middleware";
import { inventarioController } from "./inventario.controller";

export const inventarioRoutes = Router();

inventarioRoutes.get("/", authMiddleware, authorize("ADMIN"), inventarioController.list);
inventarioRoutes.patch("/:productoId", authMiddleware, authorize("ADMIN"), inventarioController.adjust);
