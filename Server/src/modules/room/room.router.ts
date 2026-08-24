import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import * as controller from '@/modules/room/room.controller';
import { createRoomSchema, roomSchema, updateRoomSchema } from '@/modules/room/room.dto';
import { createApiResponses, objectId, PUBLIC } from '@/api-docs/openAPIResponseBuilders';
import { verifyAccessToken } from '@/middlewares/verifyToken';
import { validateRequest } from '@/utils/httpHandlers';

export const roomRegistry = new OpenAPIRegistry();

const RoomSchema = roomSchema.extend({ _id: z.string() });
roomRegistry.register('Room', RoomSchema);

const CreateRoomBody = createRoomSchema
  .extend({ apartmentId: objectId('Apartment the room belongs to') })
  .openapi('CreateRoomBody');
const UpdateRoomBody = updateRoomSchema
  .omit({ apartmentId: true, createdAt: true, updatedAt: true })
  .openapi('UpdateRoomBody');

const roomIdParam = z.object({ roomId: objectId('Room id') });

const router = Router();

roomRegistry.registerPath({
  method: 'post',
  path: '/api/room',
  tags: ['Room'],
  summary: 'Add a room to an apartment',
  request: {
    body: { content: { 'application/json': { schema: CreateRoomBody } } },
  },
  responses: createApiResponses(RoomSchema, 'Room created', {
    status: StatusCodes.CREATED,
    auth: true,
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND],
  }),
});

router.post('/', verifyAccessToken, validateRequest(createRoomSchema), controller.addRoomToApartment);

roomRegistry.registerPath({
  method: 'get',
  path: '/api/room/{roomId}',
  tags: ['Room'],
  summary: 'Get a room',
  security: PUBLIC,
  request: { params: roomIdParam },
  responses: createApiResponses(RoomSchema, 'Room found', { errors: [StatusCodes.NOT_FOUND] }),
});

router.get('/:roomId', controller.findRoomById);

roomRegistry.registerPath({
  method: 'put',
  path: '/api/room/{roomId}',
  tags: ['Room'],
  summary: 'Update a room',
  request: {
    params: roomIdParam,
    body: { content: { 'application/json': { schema: UpdateRoomBody } } },
  },
  responses: createApiResponses(RoomSchema, 'Room updated', {
    auth: true,
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND],
  }),
});

router.put('/:roomId', verifyAccessToken, validateRequest(updateRoomSchema), controller.updateRoom);

roomRegistry.registerPath({
  method: 'delete',
  path: '/api/room/{roomId}',
  tags: ['Room'],
  summary: 'Delete a room',
  request: { params: roomIdParam },
  responses: createApiResponses(z.null(), 'Room deleted', { auth: true, errors: [StatusCodes.NOT_FOUND] }),
});

router.delete('/:roomId', verifyAccessToken, controller.deleteRoom);

roomRegistry.registerPath({
  method: 'get',
  path: '/api/room/apartments/{apartmentId}',
  tags: ['Room'],
  summary: 'List rooms of an apartment',
  security: PUBLIC,
  request: { params: z.object({ apartmentId: objectId('Apartment id') }) },
  responses: createApiResponses(z.array(RoomSchema), 'Rooms found', { errors: [StatusCodes.NOT_FOUND] }),
});

router.get('/apartments/:apartmentId', controller.getRoomsByApartmentId);

export const roomRouter = router;
