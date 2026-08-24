import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import { z } from 'zod';

import * as controller from '@/modules/image/image.controller';
import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import upload from '@/middlewares/uploadFile';
import { verifyAccessToken } from '@/middlewares/verifyToken';

const router = Router();
export const imageRegistry = new OpenAPIRegistry();

imageRegistry.registerPath({
  method: 'post',
  path: '/api/image',
  tags: ['Image'],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            image: z.any(),
          }),
        },
      },
    },
  },
  responses: createApiResponse(z.object({ link: z.string() }), 'Success'),
});

router.post('/', verifyAccessToken, upload.single('image'), controller.uploadImage);

imageRegistry.registerPath({
  method: 'post',
  path: '/api/image/multiple',
  tags: ['Image'],
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.array(z.any()),
        },
      },
    },
  },
  responses: createApiResponse(z.object({ filenames: z.array(z.string()) }), 'Success'),
});

router.post('/multiple', verifyAccessToken, upload.array('image', 10), controller.uploadMultipleFiles);

imageRegistry.registerPath({
  method: 'get',
  path: '/api/image/:filename',
  tags: ['Image'],
  request: {
    params: z.object({
      filename: z.string(),
    }),
  },
  responses: createApiResponse(z.any(), 'Success'),
});

router.get('/:filename', controller.openImageBrowser);

imageRegistry.registerPath({
  method: 'delete',
  path: '/api/image/:id',
  tags: ['Image'],
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: createApiResponse(z.object({ message: z.string() }), 'Success'),
});

router.delete('/:id', verifyAccessToken, controller.deleteFileByFileName);

export const imageRouter = router;
