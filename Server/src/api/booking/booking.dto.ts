import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const BookingSchema = z.object({
  email: z.string().email(),
  firstname: z.string(),
  lastname: z.string(),
  phone: z.string(),
  room: z.string(),
  arrivalTime: z.string(),
  checkInTime: z.date(),
  checkOutTime: z.date(),
  totalPrice: z.number(),
  status: z.enum(['pending', 'confirmed', 'canceled', 'completed']).default('pending'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
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
