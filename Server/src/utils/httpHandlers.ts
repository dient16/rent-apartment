import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { ZodError, ZodSchema } from 'zod';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

export const handleServiceResponse = (serviceResponse: ServiceResponse<any>, response: Response) => {
  return response.status(serviceResponse.statusCode).send(serviceResponse);
};

export const validateRequest = (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
      user: req.user,
      image: req.file,
    });
    req.body = parsed.body;
    req.query = parsed.query;
    req.params = parsed.params;
    next();
  } catch (err) {
    const errorMessage = `Invalid input: ${(err as ZodError).errors.map((e) => e.path).join(' | ')}`;
    const statusCode = StatusCodes.BAD_REQUEST;
    res.status(statusCode).send(new ServiceResponse<null>(ResponseStatus.Failed, errorMessage, null, statusCode));
  }
};
