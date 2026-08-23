import type { Server } from 'node:http';

import { logger } from '@/utils/logger';

/**
 * Anything that escapes Express (a throw in a timer/stream callback, a promise nobody
 * awaited, a listen() failure) never reaches the error middleware. Without these hooks
 * Node prints a bare stack trace to stderr and exits, so nothing lands in the pino logs.
 */
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
