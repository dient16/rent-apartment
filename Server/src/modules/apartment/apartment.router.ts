import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import * as controller from '@/modules/apartment/apartment.controller';
import {
  apartmentSchema,
  createApartmentSchema,
  getApartmentQuerySchema,
  getOwnerApartmentsSchema,
  searchRoomSchema,
} from '@/modules/apartment/apartment.dto';
import { createApiResponses, objectId, PaginationSchema, PUBLIC } from '@/api-docs/openAPIResponseBuilders';
import { verifyAccessToken } from '@/middlewares/verifyToken';
import { validateRequest } from '@/utils/httpHandlers';

export const apartmentRegistry = new OpenAPIRegistry();

const ApartmentSchema = apartmentSchema.extend({ _id: z.string() });
apartmentRegistry.register('Apartment', ApartmentSchema);

const CreateApartmentBody = createApartmentSchema.shape.body.openapi('CreateApartmentBody');

const UpdateApartmentBody = apartmentSchema
  .omit({ createBy: true, rooms: true, createdAt: true, updatedAt: true })
  .partial()
  .openapi('UpdateApartmentBody');

const ApartmentCardSchema = z
  .object({
    _id: z.string(),
    title: z.string(),
    location: z.object({ province: z.string(), district: z.string() }),
    images: z.array(z.string().url()),
    price: z.number().optional(),
    avgRating: z.number().optional(),
  })
  .openapi('ApartmentCard');

const SearchResultSchema = z
  .object({
    page: z.number().int(),
    pageResults: z.number().int(),
    totalResults: z.number().int(),
    apartments: z.array(ApartmentCardSchema),
  })
  .openapi('ApartmentSearchResult');

const PopularRoomSchema = z
  .object({
    roomId: z.string(),
    roomType: z.string(),
    price: z.number(),
    images: z.array(z.string().url()),
    title: z.string(),
    location: z.object({ province: z.string(), district: z.string() }),
  })
  .openapi('PopularRoom');

const ApartmentDetailSchema = ApartmentSchema.omit({ rooms: true })
  .extend({
    images: z.array(z.string().url()),
    rooms: z.array(
      z.object({
        _id: z.string(),
        roomType: z.string(),
        bedType: z.string().optional(),
        size: z.number(),
        price: z.number(),
        numberOfGuest: z.number(),
        quantity: z.number(),
        images: z.array(z.string().url()),
        amenities: z.array(z.object({ name: z.string(), icon: z.string().url() })),
        totalPrice: z.number().openapi({ description: 'price × nights for the requested date range' }),
      })
    ),
  })
  .openapi('ApartmentDetail');

const OwnerApartmentsSchema = z
  .object({
    apartments: z.array(ApartmentCardSchema),
    pagination: PaginationSchema,
  })
  .openapi('OwnerApartments');

const RoomCheckoutSchema = z
  .object({
    apartment: z.object({ _id: z.string(), title: z.string(), location: z.any() }).passthrough(),
    rooms: z.array(
      z.object({ _id: z.string(), roomType: z.string(), price: z.number(), roomNumber: z.number() }).passthrough()
    ),
    totalPrice: z.number(),
  })
  .passthrough()
  .openapi('RoomCheckout');

const apartmentIdParam = z.object({ apartmentId: objectId('Apartment id') });

const router = Router();

apartmentRegistry.registerPath({
  method: 'post',
  path: '/api/apartment',
  tags: ['Apartment'],
  summary: 'Create an apartment with its rooms',
  description: 'The caller becomes the host (`createBy`). Image fields are GridFS filenames from **POST /api/image**.',
  request: {
    body: { content: { 'application/json': { schema: CreateApartmentBody } } },
  },
  responses: createApiResponses(ApartmentSchema, 'Apartment created', {
    status: StatusCodes.CREATED,
    auth: true,
    errors: [StatusCodes.BAD_REQUEST],
  }),
});

router.post('/', verifyAccessToken, validateRequest(createApartmentSchema), controller.createApartment);

apartmentRegistry.registerPath({
  method: 'get',
  path: '/api/apartment/search',
  tags: ['Apartment'],
  summary: 'Search apartments',
  description:
    'Full-text + filter search (Atlas Search / Elasticsearch, falls back to Mongo). `startDate`/`endDate` must be today or later. `amenities` is a comma-separated list of amenity ids.',
  security: PUBLIC,
  request: { query: searchRoomSchema.shape.query },
  responses: createApiResponses(SearchResultSchema, 'Apartments retrieved successfully', {
    errors: [StatusCodes.BAD_REQUEST],
  }),
});

router.get('/search', validateRequest(searchRoomSchema), controller.searchApartments);

apartmentRegistry.registerPath({
  method: 'get',
  path: '/api/apartment/get-room-checkout',
  tags: ['Apartment'],
  summary: 'Get checkout summary for selected rooms',
  description:
    'Use `roomIds[]` and `roomNumbers[]` in the same order. Availability is checked for `startDate`..`endDate`.',
  security: PUBLIC,
  request: {
    query: z.object({
      roomIds: z.array(objectId('Room id')).openapi({ description: 'Send as `roomIds[]=...` (repeatable)' }),
      roomNumbers: z
        .array(z.number().int().min(1))
        .openapi({ description: 'Send as `roomNumbers[]=...` (repeatable)' }),
      startDate: z.string().date().optional(),
      endDate: z.string().date().optional(),
      numberOfGuest: z.number().int().min(1).optional(),
    }),
  },
  responses: createApiResponses(RoomCheckoutSchema, 'Checkout summary', {
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND],
  }),
});

router.get('/get-room-checkout', controller.getRoomsCheckout);

apartmentRegistry.registerPath({
  method: 'get',
  path: '/api/apartment/by-user',
  tags: ['Apartment'],
  summary: "List the current host's apartments",
  request: { query: getOwnerApartmentsSchema.shape.query },
  responses: createApiResponses(OwnerApartmentsSchema, 'Apartments retrieved successfully', {
    auth: true,
    errors: [StatusCodes.BAD_REQUEST],
  }),
});

router.get('/by-user', verifyAccessToken, validateRequest(getOwnerApartmentsSchema), controller.getApartmentsByUserId);

apartmentRegistry.registerPath({
  method: 'get',
  path: '/api/apartment/popular-rooms',
  tags: ['Apartment'],
  summary: 'List popular rooms for the home page',
  security: PUBLIC,
  request: {
    query: z.object({ limit: z.number().int().min(1).default(10).optional() }),
  },
  responses: createApiResponses(z.array(PopularRoomSchema), 'Popular apartments retrieved successfully'),
});

router.get('/popular-rooms', controller.getPopularRooms);

apartmentRegistry.registerPath({
  method: 'get',
  path: '/api/apartment',
  tags: ['Apartment'],
  summary: 'List all apartments',
  responses: createApiResponses(z.array(ApartmentSchema), 'Apartments retrieved successfully', {
    auth: true,
    errors: [StatusCodes.NOT_FOUND],
  }),
});

router.get('/', verifyAccessToken, controller.getAllApartment);

apartmentRegistry.registerPath({
  method: 'get',
  path: '/api/apartment/{apartmentId}',
  tags: ['Apartment'],
  summary: 'Get apartment detail with available rooms',
  description: 'Rooms are filtered by the query (dates, guests, price). Defaults to today → tomorrow.',
  security: PUBLIC,
  request: {
    params: apartmentIdParam,
    query: getApartmentQuerySchema.shape.query,
  },
  responses: createApiResponses(ApartmentDetailSchema, 'Apartment retrieved successfully', {
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND],
  }),
});

router.get('/:apartmentId', validateRequest(getApartmentQuerySchema), controller.getApartmentDetail);

apartmentRegistry.registerPath({
  method: 'put',
  path: '/api/apartment/{apartmentId}',
  tags: ['Apartment'],
  summary: 'Update an apartment',
  description: 'Only the host that created the apartment may update it.',
  request: {
    params: apartmentIdParam,
    body: { content: { 'application/json': { schema: UpdateApartmentBody } } },
  },
  responses: createApiResponses(ApartmentSchema, 'Apartment updated', {
    auth: true,
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.FORBIDDEN, StatusCodes.NOT_FOUND],
  }),
});

router.put('/:apartmentId', verifyAccessToken, controller.updateApartment);

apartmentRegistry.registerPath({
  method: 'delete',
  path: '/api/apartment/{apartmentId}',
  tags: ['Apartment'],
  summary: 'Delete an apartment and its rooms',
  description: 'Only the host that created the apartment may delete it.',
  request: { params: apartmentIdParam },
  responses: createApiResponses(z.null(), 'Apartment deleted', {
    auth: true,
    errors: [StatusCodes.FORBIDDEN, StatusCodes.NOT_FOUND],
  }),
});

router.delete('/:apartmentId', verifyAccessToken, controller.deleteApartment);

apartmentRegistry.registerPath({
  method: 'delete',
  path: '/api/apartment/room/{roomId}',
  tags: ['Apartment'],
  summary: 'Remove a room from its apartment',
  request: { params: z.object({ roomId: objectId('Room id') }) },
  responses: createApiResponses(z.null(), 'Room removed', {
    auth: true,
    errors: [StatusCodes.FORBIDDEN, StatusCodes.NOT_FOUND],
  }),
});

router.delete('/room/:roomId', verifyAccessToken, controller.removeRoomFromApartment);

export const apartmentRouter = router;
