import { pino } from 'pino';

/**
 * Lives outside server.ts so services can log without importing the Express app
 * (which would close an import cycle: server -> routes -> service -> server).
 */
export const logger = pino({ name: 'server start' });

export default logger;
