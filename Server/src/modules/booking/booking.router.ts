import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import * as controller from '@/modules/booking/booking.controller';
import { createApiResponses, objectId, PaginationSchema, PUBLIC } from '@/api-docs/openAPIResponseBuilders';
import { verifyAccessToken } from '@/middlewares/verifyToken';
import { bookingListQuerySchema, BookingSchema } from '@/modules/booking/booking.dto';
import { validateRequest } from '@/utils/httpHandlers';

const router = Router();
export const bookingRegistry = new OpenAPIRegistry();

const BookingStatus = z.enum(['pending', 'confirmed', 'canceled', 'completed']).openapi('BookingStatus');

const BookingDocSchema = BookingSchema.extend({ _id: z.string(), status: BookingStatus });
bookingRegistry.register('Booking', BookingDocSchema);

const CreateBookingBody = BookingSchema.omit({ status: true, createdAt: true, updatedAt: true })
  .extend({
    checkInTime: z.string().datetime().openapi({ example: '2026-09-01T14:00:00.000Z' }),
    checkOutTime: z.string().datetime().openapi({ example: '2026-09-04T12:00:00.000Z' }),
    rooms: z.array(z.object({ roomId: objectId('Room id'), roomNumber: z.number().int().min(1) })),
  })
  .openapi('CreateBookingBody');

const StatusCounts = z
  .object({ all: z.number().int() })
  .catchall(z.number().int())
  .openapi('BookingStatusCounts', { description: 'Number of bookings per status, plus `all`' });

const GuestBookingSchema = z
  .object({
    _id: z.string(),
    apartmentName: z.string(),
    apartmentLocation: z.string(),
    email: z.string().email(),
    firstname: z.string(),
    lastname: z.string(),
    phone: z.string(),
    rooms: z.array(
      z.object({
        roomId: z.string(),
        roomType: z.string(),
        roomNumber: z.number(),
        price: z.number(),
        size: z.number(),
        image: z.string().url(),
      })
    ),
    arrivalTime: z.string(),
    checkInTime: z.string().datetime(),
    checkOutTime: z.string().datetime(),
    totalPrice: z.number(),
    status: BookingStatus,
  })
  .openapi('GuestBooking');

const HostBookingSchema = z
  .object({
    _id: z.string(),
    guest: z
      .object({ firstname: z.string(), lastname: z.string(), email: z.string(), phone: z.string() })
      .passthrough(),
    rooms: z.array(z.object({ roomType: z.string().optional(), roomNumber: z.number() })),
    checkInTime: z.string().datetime(),
    checkOutTime: z.string().datetime(),
    totalPrice: z.number(),
    status: BookingStatus,
    createdAt: z.string().datetime().optional(),
  })
  .passthrough()
  .openapi('HostBooking');

const BookingDetailSchema = BookingDocSchema.extend({
  rooms: z.array(
    z.object({ roomId: z.string(), roomType: z.string(), roomNumber: z.number(), price: z.number() }).passthrough()
  ),
  apartment: z.object({ _id: z.string(), title: z.string() }).passthrough().optional(),
})
  .passthrough()
  .openapi('BookingDetail');

const listQuery = bookingListQuerySchema.shape.query;
const bookingIdParam = z.object({ bookingId: objectId('Booking id') });

bookingRegistry.registerPath({
  method: 'get',
  path: '/api/booking',
  tags: ['Booking'],
  summary: 'List bookings made by the current user (guest view)',
  request: { query: listQuery },
  responses: createApiResponses(
    z.object({ bookings: z.array(GuestBookingSchema), counts: StatusCounts, pagination: PaginationSchema }),
    'Bookings retrieved successfully',
    { auth: true, errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND] }
  ),
});

bookingRegistry.registerPath({
  method: 'get',
  path: '/api/booking/user/bookings',
  tags: ['Booking'],
  summary: "List bookings for the current host's apartments (host view)",
  request: { query: listQuery },
  responses: createApiResponses(
    z.object({
      bookings: z.array(HostBookingSchema),
      counts: StatusCounts,
      stats: z.object({ revenue: z.number(), pending: z.number(), upcoming: z.number(), total: z.number() }),
      pagination: PaginationSchema,
    }),
    'Bookings retrieved successfully',
    { auth: true, errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND] }
  ),
});

bookingRegistry.registerPath({
  method: 'get',
  path: '/api/booking/{bookingId}',
  tags: ['Booking'],
  summary: 'Get a booking',
  request: { params: bookingIdParam },
  responses: createApiResponses(BookingDetailSchema, 'Booking retrieved successfully', {
    auth: true,
    errors: [StatusCodes.NOT_FOUND],
  }),
});

bookingRegistry.registerPath({
  method: 'post',
  path: '/api/booking',
  tags: ['Booking'],
  summary: 'Create a booking',
  description: 'Public so guests can book without an account. Notifies the host and sends a confirmation email.',
  security: PUBLIC,
  request: {
    body: { content: { 'application/json': { schema: CreateBookingBody } } },
  },
  responses: createApiResponses(BookingDocSchema, 'Booking created', {
    status: StatusCodes.CREATED,
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND, StatusCodes.CONFLICT],
  }),
});

bookingRegistry.registerPath({
  method: 'post',
  path: '/api/booking/{bookingId}/confirm',
  tags: ['Booking'],
  summary: 'Confirm a pending booking (host)',
  request: { params: bookingIdParam },
  responses: createApiResponses(BookingDocSchema, 'Booking confirmed successfully', {
    auth: true,
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND],
  }),
});

bookingRegistry.registerPath({
  method: 'post',
  path: '/api/booking/{bookingId}/cancel',
  tags: ['Booking'],
  summary: 'Cancel a booking',
  description: 'Allowed for the guest who made the booking or the host of the apartment.',
  request: { params: bookingIdParam },
  responses: createApiResponses(BookingDocSchema, 'Booking canceled successfully', {
    auth: true,
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.FORBIDDEN, StatusCodes.NOT_FOUND],
  }),
});

router.get('/user/bookings', verifyAccessToken, validateRequest(bookingListQuerySchema), controller.getUserBookings);
router.get('/:bookingId', verifyAccessToken, controller.getBooking);
router.get('/', verifyAccessToken, validateRequest(bookingListQuerySchema), controller.getBookings);
router.post('/', controller.createBooking);
router.post('/:bookingId/confirm', verifyAccessToken, controller.confirmBooking);
router.post('/:bookingId/cancel', verifyAccessToken, controller.cancelBooking);

export const bookingRouter = router;
