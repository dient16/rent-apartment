import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const roomSchema = z.object({
  apartmentId: z.string(),
  amenities: z.array(z.string()),
  size: z.number(),
  // whole VND, never a float like 299.824 (a mis-parsed "299.824")
  price: z.number().int().min(10000),
  images: z.array(z.string()),
  unavailableDateRanges: z.array(
    z.object({
      startDay: z.date(),
      endDay: z.date(),
    })
  ),
  roomType: z.string(),
  numberOfGuest: z.number(),
  bedType: z.string().optional(),
  reviews: z
    .array(
      z.object({
        score: z.number(),
        comment: z.string().optional(),
        postedBy: z.string(),
      })
    )
    .optional(),
  quantity: z.number(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createRoomSchema = roomSchema.omit({ apartmentId: true, createdAt: true, updatedAt: true });

export const updateRoomSchema = roomSchema.partial();

export type Room = z.infer<typeof roomSchema>;
export type CreateRoom = z.infer<typeof createRoomSchema>;
export type UpdateRoom = z.infer<typeof updateRoomSchema>;
