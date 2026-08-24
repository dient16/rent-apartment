import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { getPricingByRoomId, updatePricing } from '@/modules/pricing/pricing.controller';
import { createApiResponses, objectId } from '@/api-docs/openAPIResponseBuilders';
import { verifyAccessToken } from '@/middlewares/verifyToken';
import { validateRequest } from '@/utils/httpHandlers';
import { PricingSchema, updatePricingSchema } from '@/modules/pricing/pricing.dto';

export const pricingRegistry = new OpenAPIRegistry();

const PricingDocSchema = PricingSchema.extend({ _id: z.string() });
pricingRegistry.register('Pricing', PricingDocSchema);

const UpdatePricingBody = z
  .object({
    roomId: objectId('Room id'),
    date: z.string().date().openapi({ description: 'Day the price applies to (YYYY-MM-DD)', example: '2026-09-01' }),
    price: z.number().positive().openapi({ example: 750000 }),
  })
  .openapi('UpdatePricingBody');

const router = express.Router();
const getPricingByRoomIdSchema = z.object({
  params: z.object({
    roomId: z.string(),
  }),
});

pricingRegistry.registerPath({
  method: 'get',
  path: '/api/pricing/{roomId}',
  tags: ['Pricing'],
  summary: 'List per-date price overrides of a room',
  request: { params: z.object({ roomId: objectId('Room id') }) },
  responses: createApiResponses(z.array(PricingDocSchema), 'Pricing retrieved', {
    auth: true,
    errors: [StatusCodes.NOT_FOUND],
  }),
});

router.get('/:roomId', verifyAccessToken, validateRequest(getPricingByRoomIdSchema), getPricingByRoomId);

pricingRegistry.registerPath({
  method: 'put',
  path: '/api/pricing',
  tags: ['Pricing'],
  summary: 'Set the price of a room for one date',
  description: 'Creates or updates the override for that `roomId` + `date`.',
  request: {
    body: { content: { 'application/json': { schema: UpdatePricingBody } } },
  },
  responses: createApiResponses(PricingDocSchema, 'Pricing updated', {
    auth: true,
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND],
  }),
});

router.put('/', verifyAccessToken, validateRequest(updatePricingSchema), updatePricing);

export const pricingRouter = router;
