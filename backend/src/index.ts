import { app } from './app';
import { logger } from './config/logger';

const PORT = Number(process.env.PORT) || 10000;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server listening on port ${PORT} (0.0.0.0)`);
});
