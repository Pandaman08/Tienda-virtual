import { Router } from "express";
import multer from "multer";
import { authMiddleware, authorize } from "../../common/middlewares/auth.middleware";
import { catalogoController } from "./catalogo.controller";

export const catalogoRoutes = Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (!file.mimetype.startsWith("image/")) {
			cb(new Error("Solo se permiten archivos de imagen"));
			return;
		}
		cb(null, true);
	}
});

catalogoRoutes.get("/", catalogoController.list);
catalogoRoutes.post("/", authMiddleware, authorize("ADMIN"), upload.single("imagen"), catalogoController.create);
catalogoRoutes.patch("/:id", authMiddleware, authorize("ADMIN"), upload.single("imagen"), catalogoController.update);
catalogoRoutes.patch("/:id/estado", authMiddleware, authorize("ADMIN"), catalogoController.setEstado);
catalogoRoutes.delete("/:id", authMiddleware, authorize("ADMIN"), catalogoController.remove);
