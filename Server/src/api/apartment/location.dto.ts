import { z } from 'zod';

export const locationSchema = z.object({
  long: z.number(),
  lat: z.number(),
  province: z.string(),
  district: z.string(),
  ward: z.string().optional(),
  street: z.string(),
});

export type Location = z.infer<typeof locationSchema>;
