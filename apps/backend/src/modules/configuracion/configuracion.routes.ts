import { Router } from "express";
import { authMiddleware, authorize } from "../../common/middlewares/auth.middleware";
import { configuracionController } from "./configuracion.controller";

export const configuracionRoutes = Router();

// GET es público (login, nav, footer lo usan sin sesión)
configuracionRoutes.get("/", configuracionController.get);

// PUT solo ADMIN
configuracionRoutes.put("/", authMiddleware, authorize("ADMIN"), configuracionController.save);
