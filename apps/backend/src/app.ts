import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { errorMiddleware } from "./common/middlewares/error.middleware";
import { swaggerSpec } from "./docs/swagger";
import { router } from "./router";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3000,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/v1", router);

app.use(errorMiddleware);
