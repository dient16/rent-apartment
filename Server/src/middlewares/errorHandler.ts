import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { logger } from '@/utils/logger';

const unexpectedRequest: RequestHandler = (req: Request, res: Response, next) => {
  const error = new Error(`Route ${req.originalUrl} not found!`);
  res.status(StatusCodes.NOT_FOUND);
  next(error);
};

const addErrorToRequestLog: ErrorRequestHandler = (err, _req, res, next) => {
  res.locals.err = err;
  next(err);
};
const errHandler: ErrorRequestHandler = (error, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  // Pass the error under `err` so pino's serializer emits the stack, and attach the
  // request id / route so a log line can be traced back to a single call.
  logger[statusCode >= 500 ? 'error' : 'warn'](
    { err: error, reqId: req.id, method: req.method, url: req.originalUrl, statusCode },
    `${req.method} ${req.originalUrl} failed: ${error?.message ?? 'unknown error'}`
  );
  return res.status(statusCode).json({
    success: false,
    message: error?.message || 'Error from server',
  });
};
export default () => [unexpectedRequest, addErrorToRequestLog, errHandler];
