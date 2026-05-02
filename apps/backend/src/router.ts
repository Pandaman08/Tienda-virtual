import { Router } from "express";
import { authRoutes } from "./modules/auth/auth.routes";
import { catalogoRoutes } from "./modules/catalogo/catalogo.routes";
import { carritoRoutes } from "./modules/carrito/carrito.routes";
import { ordenesRoutes } from "./modules/ordenes/ordenes.routes";
import { inventarioRoutes } from "./modules/inventario/inventario.routes";
import { clientesRoutes } from "./modules/clientes/clientes.routes";
import { reportesRoutes } from "./modules/reportes/reportes.routes";
import { usuariosRoutes } from "./modules/usuarios/usuarios.routes";
import { configuracionRoutes } from "./modules/configuracion/configuracion.routes";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "ok", data: null });
});

router.use("/auth", authRoutes);
router.use("/catalogo", catalogoRoutes);
router.use("/carrito", carritoRoutes);
router.use("/ordenes", ordenesRoutes);
router.use("/inventario", inventarioRoutes);
router.use("/clientes", clientesRoutes);
router.use("/reportes", reportesRoutes);
router.use("/usuarios", usuariosRoutes);
router.use("/configuracion", configuracionRoutes);
