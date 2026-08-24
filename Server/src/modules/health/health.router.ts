import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { Request, Response, Router } from 'express';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { handleServiceResponse } from '@/utils/httpHandlers';

export const healthRegistry = new OpenAPIRegistry();

export const healthRouter: Router = (() => {
  const router = express.Router();

  healthRegistry.registerPath({
    method: 'get',
    path: '/health-check',
    tags: ['Health Check'],
    responses: createApiResponse(z.null(), 'Success'),
  });

  router.get('/', (_req: Request, res: Response) => {
    const serviceResponse = new ServiceResponse(ResponseStatus.Success, 'Service is healthy', null, StatusCodes.OK);
    handleServiceResponse(serviceResponse, res);
  });

  return router;
})();
