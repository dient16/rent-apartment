import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { logger } from '@/server';

const unexpectedRequest: RequestHandler = (req: Request, res: Response, next) => {
  const error = new Error(`Route ${req.originalUrl} not found!`);
  res.status(StatusCodes.NOT_FOUND);
  next(error);
};

const addErrorToRequestLog: ErrorRequestHandler = (err, _req, res, next) => {
  res.locals.err = err;
  next(err);
};
const errHandler: ErrorRequestHandler = (error, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  logger.error(error);
  return res.status(statusCode).json({
    success: false,
    message: error?.message || 'Error from server',
  });
};
export default () => [unexpectedRequest, addErrorToRequestLog, errHandler];
