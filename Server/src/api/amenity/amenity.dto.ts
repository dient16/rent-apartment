import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const amenitySchema = z.object({
  _id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  description: z.string().default(''),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type Amenity = z.infer<typeof amenitySchema>;
