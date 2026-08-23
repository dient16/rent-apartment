import { StatusCodes } from 'http-status-codes';
import type { ZodError, ZodType } from 'zod';

import type { NextFunction, Request, Response } from '@/types/http';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

export const handleServiceResponse = (serviceResponse: ServiceResponse<any>, response: Response) => {
  return response.status(serviceResponse.statusCode).send(serviceResponse);
};

export const validateRequest =
  (schema: ZodType<any>) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        user: req.user,
        image: req.file,
      });
      req.body = parsed.body;
      // Express 5 exposes `req.query` through a getter, so it can no longer be assigned to.
      Object.defineProperty(req, 'query', { value: parsed.query, configurable: true, writable: true });
      req.params = parsed.params;
      next();
    } catch (err) {
      const errorMessage = `Invalid input: ${(err as ZodError).issues.map((e) => e.path).join(' | ')}`;
      const statusCode = StatusCodes.BAD_REQUEST;
      res.status(statusCode).send(new ServiceResponse<null>(ResponseStatus.Failed, errorMessage, null, statusCode));
    }
  };
