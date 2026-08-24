import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { Request, Response, Router } from 'express';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { createApiResponse, PUBLIC } from '@/api-docs/openAPIResponseBuilders';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

export const healthRegistry = new OpenAPIRegistry();

export const healthRouter: Router = (() => {
  const router = express.Router();

  healthRegistry.registerPath({
    method: 'get',
    path: '/health-check',
    tags: ['Health Check'],
    summary: 'Liveness probe',
    description: 'Returns 200 as long as the HTTP server is up. Does not check the database.',
    security: PUBLIC,
    responses: createApiResponse(z.null(), 'Service is healthy'),
  });

  router.get('/', (_req: Request, res: Response) => {
    const serviceResponse = new ServiceResponse(ResponseStatus.Success, 'Service is healthy', null, StatusCodes.OK);
    serviceResponse.send(res);
  });

  return router;
})();
