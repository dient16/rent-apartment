import { env } from '@/config/env.config';
import { app, logger } from '@/server';
import registerProcessHandlers from '@/utils/processHandlers';

const server = app.listen(env.PORT, () => {
  const { NODE_ENV, HOST, PORT } = env;
  logger.info(`Server (${NODE_ENV}) running on port http://${HOST}:${PORT}`);
});

let shuttingDown = false;

const shutdown = (code: number) => {
  if (shuttingDown) return;
  shuttingDown = true;

  server.close(() => {
    logger.info('server closed');
    process.exit(code);
  });
  setTimeout(() => process.exit(code || 1), 10000).unref(); // Force shutdown after 10s
};

const onCloseSignal = (signal: NodeJS.Signals) => {
  logger.info(`${signal} received, shutting down`);
  shutdown(0);
};

process.on('SIGINT', onCloseSignal);
process.on('SIGTERM', onCloseSignal);

registerProcessHandlers(server, shutdown);
