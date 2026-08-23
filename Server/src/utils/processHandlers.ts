import type { Server } from 'node:http';

import { logger } from '@/utils/logger';

/** Failures outside Express never reach the error middleware — catch them here. */
const registerProcessHandlers = (server: Server, shutdown: (code: number) => void) => {
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.fatal({ err: error, port: (server.address() as { port?: number } | null)?.port }, 'Port already in use');
    } else {
      logger.fatal({ err: error }, 'HTTP server error');
    }
    shutdown(1);
  });

  process.on('uncaughtException', (error, origin) => {
    logger.fatal({ err: error, origin }, 'Uncaught exception — shutting down');
    shutdown(1);
  });

  process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(`Non-error rejection: ${JSON.stringify(reason)}`);
    logger.fatal({ err }, 'Unhandled promise rejection — shutting down');
    shutdown(1);
  });

  // Deprecations and things like MaxListenersExceededWarning otherwise go straight to stderr.
  process.on('warning', (warning) => {
    logger.warn({ err: warning }, `Process warning: ${warning.name}`);
  });
};

export default registerProcessHandlers;
