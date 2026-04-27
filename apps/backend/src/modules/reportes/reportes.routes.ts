import { Router } from "express";
import { authMiddleware, authorize } from "../../common/middlewares/auth.middleware";
import { reportesController } from "./reportes.controller";

export const reportesRoutes = Router();

reportesRoutes.get("/kpis", authMiddleware, authorize("ADMIN"), reportesController.kpis);
reportesRoutes.get("/operacional", authMiddleware, authorize("ADMIN"), reportesController.operacional);
reportesRoutes.get("/gestion", authMiddleware, authorize("ADMIN"), reportesController.gestion);
