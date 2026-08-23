import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import { z } from 'zod';

import * as controller from '@/api/apartment/apartment.controller';
import {
  apartmentSchema,
  createApartmentSchema,
  getApartmentQuerySchema,
  getOwnerApartmentsSchema,
  searchRoomSchema,
} from '@/api/apartment/apartment.dto';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { verifyAccessToken } from '@/middlewares/verifyToken';
import { validateRequest } from '@/utils/httpHandlers';

export const apartmentRegistry = new OpenAPIRegistry();

apartmentRegistry.register('Apartment', apartmentSchema);

const router = Router();

apartmentRegistry.registerPath({
  method: 'post',
  path: '/api/apartment',
  tags: ['Apartment'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: apartmentSchema,
        },
      },
    },
  },
  responses: createApiResponse(apartmentSchema, 'Success'),
});

router.post('/', verifyAccessToken, validateRequest(createApartmentSchema), controller.createApartment);

apartmentRegistry.registerPath({
  method: 'get',
  path: '/api/apartment/search',
  tags: ['Apartment'],
  responses: createApiResponse(apartmentSchema, 'Success'),
});

router.get('/search', validateRequest(searchRoomSchema), controller.searchApartments);

apartmentRegistry.registerPath({
  method: 'get',
  path: '/api/apartment/room/:roomId',
  tags: ['Apartment'],
  request: {
    params: z.object({
      roomId: z.string(),
    }),
  },
  responses: createApiResponse(apartmentSchema, 'Success'),
});

router.get('/get-room-checkout', controller.getRoomsCheckout);

apartmentRegistry.registerPath({
  method: 'get',
  path: '/api/apartment/by-user',
  tags: ['Apartment'],
  responses: createApiResponse(apartmentSchema, 'Success'),
});
router.get('/by-user', verifyAccessToken, validateRequest(getOwnerApartmentsSchema), controller.getApartmentsByUserId);
apartmentRegistry.registerPath({
  method: 'get',
  path: '/api/apartment/popular-rooms',
  tags: ['Apartment'],
  responses: createApiResponse(
    z.array(
      z.object({
        roomId: z.string(),
        roomType: z.string(),
        price: z.number(),
        images: z.array(z.string()),
        title: z.string(),
        location: z.object({
          province: z.string(),
          district: z.string(),
        }),
      })
    ),
    'Success'
  ),
});

router.get('/popular-rooms', controller.getPopularRooms);

apartmentRegistry.registerPath({
  method: 'get',
  path: '/api/apartment',
  tags: ['Apartment'],
  responses: createApiResponse(apartmentSchema, 'Success'),
});

router.get('/', verifyAccessToken, controller.getAllApartment);

apartmentRegistry.registerPath({
  method: 'get',
  path: '/api/apartment/:apartmentId',
  tags: ['Apartment'],
  request: {
    params: z.object({
      apartmentId: z.string(),
    }),
  },
  responses: createApiResponse(apartmentSchema, 'Success'),
});

router.get('/:apartmentId', validateRequest(getApartmentQuerySchema), controller.getApartmentDetail);

apartmentRegistry.registerPath({
  method: 'put',
  path: '/api/apartment/:apartmentId',
  tags: ['Apartment'],
  request: {
    params: z.object({
      apartmentId: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: apartmentSchema,
        },
      },
    },
  },
  responses: createApiResponse(apartmentSchema, 'Success'),
});

router.put('/:apartmentId', verifyAccessToken, controller.updateApartment);

apartmentRegistry.registerPath({
  method: 'delete',
  path: '/api/apartment/:apartmentId',
  tags: ['Apartment'],
  request: {
    params: z.object({
      apartmentId: z.string(),
    }),
  },
  responses: createApiResponse(apartmentSchema, 'Success'),
});

router.delete('/:apartmentId', verifyAccessToken, controller.deleteApartment);

apartmentRegistry.registerPath({
  method: 'delete',
  path: '/api/apartment/room/:roomId',
  tags: ['Apartment'],
  request: {
    params: z.object({
      roomId: z.string(),
    }),
  },
  responses: createApiResponse(apartmentSchema, 'Success'),
});

router.delete('/room/:roomId', verifyAccessToken, controller.removeRoomFromApartment);

export const apartmentRouter = router;
