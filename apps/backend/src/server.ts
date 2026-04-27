import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./common/utils/logger";

app.listen(env.PORT, () => {
  logger.info({ message: `API listening on port ${env.PORT}` });
});
