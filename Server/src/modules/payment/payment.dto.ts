import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    description: z.string().optional(),
    source: z.string().optional(),
  }),
});

export type CreatePaymentIntentBody = z.infer<typeof createPaymentIntentSchema>['body'];
