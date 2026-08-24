import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import * as controller from '@/modules/image/image.controller';
import { createApiResponses, errorResponses, PUBLIC } from '@/api-docs/openAPIResponseBuilders';
import upload from '@/middlewares/uploadFile';
import { verifyAccessToken } from '@/middlewares/verifyToken';

const router = Router();
export const imageRegistry = new OpenAPIRegistry();

const binaryFile = z.any().openapi({ type: 'string', format: 'binary' });

imageRegistry.registerPath({
  method: 'post',
  path: '/api/image',
  tags: ['Image'],
  summary: 'Upload one image',
  description: 'Form field name: `image`. Returns the GridFS filename to store on apartments / rooms / users.',
  request: {
    body: {
      content: {
        'multipart/form-data': { schema: z.object({ image: binaryFile }).openapi('UploadImageBody') },
      },
    },
  },
  responses: createApiResponses(z.object({ link: z.string() }).openapi('UploadImageResult'), 'Image uploaded', {
    auth: true,
    errors: [StatusCodes.BAD_REQUEST],
  }),
});

router.post('/', verifyAccessToken, upload.single('image'), controller.uploadImage);

imageRegistry.registerPath({
  method: 'post',
  path: '/api/image/multiple',
  tags: ['Image'],
  summary: 'Upload up to 10 images',
  description: 'Repeat the form field `image` once per file.',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({ image: z.array(binaryFile).max(10) }).openapi('UploadImagesBody'),
        },
      },
    },
  },
  responses: createApiResponses(
    z.object({ filenames: z.array(z.string()) }).openapi('UploadImagesResult'),
    'Images uploaded',
    { auth: true, errors: [StatusCodes.BAD_REQUEST] }
  ),
});

router.post('/multiple', verifyAccessToken, upload.array('image', 10), controller.uploadMultipleFiles);

imageRegistry.registerPath({
  method: 'get',
  path: '/api/image/{filename}',
  tags: ['Image'],
  summary: 'Download / display an image',
  security: PUBLIC,
  request: {
    params: z.object({ filename: z.string().openapi({ example: '1723456789012-photo.jpg' }) }),
  },
  responses: {
    [StatusCodes.OK]: {
      description: 'The image binary',
      content: { 'image/*': { schema: binaryFile } },
    },
    ...errorResponses(StatusCodes.NOT_FOUND),
  },
});

router.get('/:filename', controller.openImageBrowser);

imageRegistry.registerPath({
  method: 'delete',
  path: '/api/image/{id}',
  tags: ['Image'],
  summary: 'Delete an image',
  request: {
    params: z.object({ id: z.string().openapi({ description: 'GridFS file id or filename' }) }),
  },
  responses: createApiResponses(z.null(), 'Image deleted', { auth: true, errors: [StatusCodes.NOT_FOUND] }),
});

router.delete('/:id', verifyAccessToken, controller.deleteFileByFileName);

export const imageRouter = router;
