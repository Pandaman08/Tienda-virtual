import { Router } from "express";
import { authMiddleware, authorize } from "../../common/middlewares/auth.middleware";
import { clientesController } from "./clientes.controller";

export const clientesRoutes = Router();

clientesRoutes.use(authMiddleware, authorize("ADMIN"));
clientesRoutes.get("/", clientesController.list);
clientesRoutes.get("/:id", clientesController.getById);
clientesRoutes.patch("/:id", clientesController.update);
clientesRoutes.delete("/:id", clientesController.remove);
