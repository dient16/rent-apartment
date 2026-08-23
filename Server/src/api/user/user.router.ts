import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { Router } from 'express';
import express from 'express';
import { z } from 'zod';

import * as controller from '@/api/user/user.controller';
import { favoritesQuerySchema, UserSchema } from '@/api/user/user.dto';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import upload from '@/middlewares/uploadFile';
import { validateRequest } from '@/utils/httpHandlers';
import { verifyAccessToken } from '@/middlewares/verifyToken';

import { commonValidations } from '@/utils/commonValidation';

export const userRegistry = new OpenAPIRegistry();

userRegistry.register('User', UserSchema);

export const userRouter: Router = (() => {
  const router = express.Router();

  userRegistry.registerPath({
    method: 'get',
    path: '/api/user/current-user',
    tags: ['User'],
    responses: createApiResponse(UserSchema, 'Success'),
  });

  router.get('/current-user', verifyAccessToken, controller.getCurrentUser);

  userRegistry.registerPath({
    method: 'put',
    path: '/api/user',
    tags: ['User'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: UserSchema.omit({ _id: true }),
          },
        },
      },
    },
    responses: createApiResponse(UserSchema, 'Success'),
  });

  router.put('/', verifyAccessToken, upload.single('avatar'), controller.editUser);

  userRegistry.registerPath({
    method: 'get',
    path: '/api/user/favorites',
    tags: ['User'],
    responses: createApiResponse(z.array(z.any()), 'Success'),
  });

  router.post('/host-welcome-seen', verifyAccessToken, controller.markHostWelcomeSeen);

  router.get('/favorites', verifyAccessToken, validateRequest(favoritesQuerySchema), controller.getFavorites);

  userRegistry.registerPath({
    method: 'post',
    path: '/api/user/favorites/{apartmentId}',
    tags: ['User'],
    request: {
      params: z.object({ apartmentId: commonValidations.id }),
    },
    responses: createApiResponse(z.object({ favorited: z.boolean(), favorites: z.array(z.string()) }), 'Success'),
  });

  router.post('/favorites/:apartmentId', verifyAccessToken, controller.toggleFavorite);

  return router;
})();
