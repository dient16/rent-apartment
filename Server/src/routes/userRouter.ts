import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import type { Router } from 'express';
import express from 'express';

import * as controller from '@/api/user/userController';
import { UserSchema } from '@/api/user/userModel';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import upload from '@/common/middleware/uploadFile';
import { verifyAccessToken } from '@/common/middleware/verifyToken';

export const userRegistry = new OpenAPIRegistry();

userRegistry.register('User', UserSchema);

export const userRouter: Router = (() => {
  const router = express.Router();

  userRegistry.registerPath({
    method: 'get',
    security: [{ bearerauth: [] }],
    path: '/api/user/current-user',
    tags: ['User'],
    responses: createApiResponse(UserSchema, 'Success'),
  });

  router.get('/current-user', verifyAccessToken, controller.getCurrentUser);

  userRegistry.registerPath({
    method: 'put',
    security: [{ bearerauth: [] }],
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

  return router;
})();
