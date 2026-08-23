import { pino } from 'pino';

/** Outside server.ts: importing the app into a service closes an import cycle. */
export const logger = pino({ name: 'server start' });

export default logger;
