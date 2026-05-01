import { Router } from "express";
import { authMiddleware, authorize } from "../../common/middlewares/auth.middleware";
import { ordenesController } from "./ordenes.controller";

export const ordenesRoutes = Router();

ordenesRoutes.post("/checkout", authMiddleware, authorize("CLIENTE", "ADMIN"), ordenesController.checkout);
ordenesRoutes.get("/mine", authMiddleware, authorize("CLIENTE", "ADMIN"), ordenesController.mine);
ordenesRoutes.get("/", authMiddleware, authorize("ADMIN"), ordenesController.all);
ordenesRoutes.get("/:id", authMiddleware, authorize("ADMIN"), ordenesController.detail);
ordenesRoutes.post("/:id/anular", authMiddleware, authorize("ADMIN"), ordenesController.anular);
ordenesRoutes.post("/:id/devolucion", authMiddleware, authorize("ADMIN"), ordenesController.devolucion);
ordenesRoutes.patch("/:id/estado", authMiddleware, authorize("ADMIN"), ordenesController.changeEstado);
