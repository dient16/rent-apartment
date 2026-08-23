import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { stringToNumber } from '@/utils/zodTransforms';

extendZodWithOpenApi(z);

export const BookingRoomSchema = z.object({
  roomId: z.string(),
  roomNumber: z.number(),
});

export const BookingSchema = z.object({
  email: z.string().email(),
  firstname: z.string(),
  lastname: z.string(),
  phone: z.string(),
  rooms: z.array(BookingRoomSchema),
  arrivalTime: z.string(),
  checkInTime: z.date(),
  checkOutTime: z.date(),
  totalPrice: z.number(),
  status: z.enum(['pending', 'confirmed', 'canceled', 'completed']).default('pending'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
const bookingStatus = z.enum(['pending', 'confirmed', 'canceled', 'completed']);

export const bookingListQuerySchema = z.object({
  query: z.object({
    page: stringToNumber(z.number().int().min(1)).default(1),
    limit: stringToNumber(z.number().int().min(1).max(50)).default(10),
    status: z.union([z.literal('all'), bookingStatus]).default('all'),
    search: z.string().trim().default(''),
  }),
});

export type BookingListQuery = z.infer<typeof bookingListQuerySchema>['query'];

export const GetBookingSchema = z.object({
  bookingId: z.string(),
});
export const BookingIdParamSchema = z.object({
  bookingId: z.string().describe('ID of the booking to confirm'),
});
export const GetBookingsSchema = z.object({
  userId: z.string(),
});
export type Booking = z.infer<typeof BookingSchema>;
