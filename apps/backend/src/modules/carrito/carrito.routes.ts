import { Router } from "express";
import { authMiddleware, authorize } from "../../common/middlewares/auth.middleware";
import { carritoController } from "./carrito.controller";

export const carritoRoutes = Router();

carritoRoutes.use(authMiddleware, authorize("CLIENTE", "ADMIN"));
carritoRoutes.get("/mine", carritoController.getMine);
carritoRoutes.post("/items", carritoController.addItem);
carritoRoutes.delete("/items/:itemId", carritoController.removeItem);
carritoRoutes.delete("/clear", carritoController.clear);
