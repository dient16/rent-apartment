import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { Router } from 'express';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import * as controller from '@/modules/user/user.controller';
import { favoritesQuerySchema, UserSchema } from '@/modules/user/user.dto';
import { createApiResponses, objectId, PaginationSchema } from '@/api-docs/openAPIResponseBuilders';
import upload from '@/middlewares/uploadFile';
import { validateRequest } from '@/utils/httpHandlers';
import { verifyAccessToken } from '@/middlewares/verifyToken';

export const userRegistry = new OpenAPIRegistry();

const SafeUserSchema = UserSchema.omit({ password: true, refreshToken: true, confirmationToken: true });
userRegistry.register('User', SafeUserSchema);

const EditUserSchema = UserSchema.omit({
  _id: true,
  email: true,
  password: true,
  isAdmin: true,
  favorites: true,
  createApartments: true,
  confirmationToken: true,
  emailConfirmed: true,
  refreshToken: true,
  provider: true,
  createdAt: true,
  updatedAt: true,
})
  .partial()
  .extend({
    avatar: z.any().optional().openapi({ type: 'string', format: 'binary', description: 'Avatar image file' }),
  })
  .openapi('EditUserBody');

const FavoriteApartmentSchema = z
  .object({
    _id: z.string(),
    title: z.string(),
    location: z.object({ district: z.string().optional(), province: z.string().optional() }),
    images: z.array(z.string().url()),
    price: z.number().nullable().openapi({ description: 'Lowest room price, null when no rooms' }),
    avgRating: z.number(),
  })
  .openapi('FavoriteApartment');

export const userRouter: Router = (() => {
  const router = express.Router();

  userRegistry.registerPath({
    method: 'get',
    path: '/api/user/current-user',
    tags: ['User'],
    summary: 'Get the current user',
    responses: createApiResponses(SafeUserSchema, 'Current user', { auth: true, errors: [StatusCodes.NOT_FOUND] }),
  });

  router.get('/current-user', verifyAccessToken, controller.getCurrentUser);

  userRegistry.registerPath({
    method: 'put',
    path: '/api/user',
    tags: ['User'],
    summary: 'Update the current user profile',
    description: 'Send `multipart/form-data` to change the avatar, plain JSON otherwise.',
    request: {
      body: {
        content: {
          'multipart/form-data': { schema: EditUserSchema },
          'application/json': { schema: EditUserSchema.omit({ avatar: true }) },
        },
      },
    },
    responses: createApiResponses(SafeUserSchema, 'Updated user', { auth: true, errors: [StatusCodes.NOT_FOUND] }),
  });

  router.put('/', verifyAccessToken, upload.single('avatar'), controller.editUser);

  userRegistry.registerPath({
    method: 'post',
    path: '/api/user/host-welcome-seen',
    tags: ['User'],
    summary: 'Dismiss the host welcome banner',
    responses: createApiResponses(z.null(), 'Host welcome marked as seen', { auth: true }),
  });

  router.post('/host-welcome-seen', verifyAccessToken, controller.markHostWelcomeSeen);

  userRegistry.registerPath({
    method: 'get',
    path: '/api/user/favorites',
    tags: ['User'],
    summary: 'List favorite apartments',
    request: { query: favoritesQuerySchema.shape.query },
    responses: createApiResponses(
      z.object({ favorites: z.array(FavoriteApartmentSchema), pagination: PaginationSchema }),
      'Favorites found',
      { auth: true, errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND] }
    ),
  });

  router.get('/favorites', verifyAccessToken, validateRequest(favoritesQuerySchema), controller.getFavorites);

  userRegistry.registerPath({
    method: 'post',
    path: '/api/user/favorites/{apartmentId}',
    tags: ['User'],
    summary: 'Toggle an apartment in favorites',
    description: 'Adds the apartment when absent, removes it when present.',
    request: {
      params: z.object({ apartmentId: objectId('Apartment id') }),
    },
    responses: createApiResponses(
      z
        .object({
          favorited: z.boolean().openapi({ description: '`true` when the apartment is now a favorite' }),
          favorites: z.array(z.string()).openapi({ description: 'All favorite apartment ids' }),
        })
        .openapi('ToggleFavoriteResult'),
      'Favorite toggled',
      { auth: true, errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND] }
    ),
  });

  router.post('/favorites/:apartmentId', verifyAccessToken, controller.toggleFavorite);

  return router;
})();
