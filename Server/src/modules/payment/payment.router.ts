import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import { createPaymentIntent } from '@/modules/payment/payment.controller';
import { createPaymentIntentSchema } from '@/modules/payment/payment.dto';
import { createApiResponses, PUBLIC } from '@/api-docs/openAPIResponseBuilders';
import { validateRequest } from '@/utils/httpHandlers';

export const paymentRegistry = new OpenAPIRegistry();

const CreatePaymentIntentBody = createPaymentIntentSchema.shape.body
  .extend({
    amount: z.number().positive().openapi({ description: 'Amount in VND', example: 1500000 }),
    description: z.string().optional().openapi({ example: 'Booking #66b1f2c9e4b0a1d2c3e4f5a6' }),
  })
  .openapi('CreatePaymentIntentBody');

const router = express.Router();

paymentRegistry.registerPath({
  method: 'post',
  path: '/api/payment/create-payment-intent',
  tags: ['Payment'],
  summary: 'Create a Stripe PaymentIntent',
  description:
    'Returns the Stripe `client_secret` to confirm the payment on the client with Stripe.js. Public because guests can pay without an account.',
  security: PUBLIC,
  request: {
    body: { content: { 'application/json': { schema: CreatePaymentIntentBody } } },
  },
  responses: createApiResponses(
    z.string().openapi({ description: 'Stripe PaymentIntent `client_secret`', example: 'pi_3P..._secret_...' }),
    'Payment intent created',
    { errors: [StatusCodes.BAD_REQUEST, StatusCodes.SERVICE_UNAVAILABLE] }
  ),
});

router.post('/create-payment-intent', validateRequest(createPaymentIntentSchema), createPaymentIntent);

export const paymentRouter = router;
