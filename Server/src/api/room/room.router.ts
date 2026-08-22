import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import { z } from 'zod';

import * as controller from '@/api/room/room.controller';
import { createRoomSchema, roomSchema, updateRoomSchema } from '@/api/room/room.dto';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { verifyAccessToken } from '@/middlewares/verifyToken';
import { validateRequest } from '@/utils/httpHandlers';

export const roomRegistry = new OpenAPIRegistry();

roomRegistry.register('Room', roomSchema);

const router = Router();

roomRegistry.registerPath({
  method: 'post',
  path: '/api/room',
  tags: ['Room'],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: createRoomSchema,
        },
      },
    },
  },
  responses: createApiResponse(roomSchema, 'Success'),
});

router.post('/', verifyAccessToken, validateRequest(createRoomSchema), controller.addRoomToApartment);

roomRegistry.registerPath({
  method: 'get',
  path: '/api/room/:roomId',
  tags: ['Room'],
  request: {
    params: z.object({
      roomId: z.string(),
    }),
  },
  responses: createApiResponse(roomSchema, 'Success'),
});

router.get('/:roomId', controller.findRoomById);

roomRegistry.registerPath({
  method: 'put',
  path: '/api/room/:roomId',
  tags: ['Room'],
  request: {
    params: z.object({
      roomId: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: updateRoomSchema,
        },
      },
    },
  },
  responses: createApiResponse(roomSchema, 'Success'),
});

router.put('/:roomId', verifyAccessToken, validateRequest(updateRoomSchema), controller.updateRoom);

roomRegistry.registerPath({
  method: 'delete',
  path: '/api/room/:roomId',
  tags: ['Room'],
  request: {
    params: z.object({
      roomId: z.string(),
    }),
  },
  responses: createApiResponse(roomSchema, 'Success'),
});

router.delete('/:roomId', verifyAccessToken, controller.deleteRoom);
roomRegistry.registerPath({
  method: 'get',
  path: '/api/apartment/:apartmentId/rooms',
  tags: ['Room'],
  request: {
    params: z.object({
      apartmentId: z.string(),
    }),
  },
  responses: createApiResponse(z.array(roomSchema), 'Success'),
});

router.get('/apartments/:apartmentId', controller.getRoomsByApartmentId);

export const roomRouter = router;
