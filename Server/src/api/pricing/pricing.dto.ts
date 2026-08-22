import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { stringToFloat } from '@/utils/zodTransforms';

extendZodWithOpenApi(z);

export const PricingSchema = z.object({
  roomId: z.string(),
  date: z.date(),
  price: z.number(),
});
export const updatePricingSchema = z.object({
  body: z.object({
    roomId: z.string(),
    date: z.string().refine((val) => !Number.isNaN(Date.parse(val)), { message: 'Invalid date format' }),
    price: stringToFloat(z.number()),
  }),
});

export type Pricing = z.infer<typeof PricingSchema>;
