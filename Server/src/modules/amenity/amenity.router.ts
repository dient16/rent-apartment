import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import * as controller from '@/modules/amenity/amenity.controller';
import { amenitySchema } from '@/modules/amenity/amenity.dto';
import { createApiResponses, objectId, PUBLIC } from '@/api-docs/openAPIResponseBuilders';
import { verifyAccessToken, verifyIsAdmin } from '@/middlewares/verifyToken';
import { validateRequest } from '@/utils/httpHandlers';

import upload from '@/middlewares/uploadFile';
import { commonValidations } from '@/utils/commonValidation';

export const amenityRegistry = new OpenAPIRegistry();

amenityRegistry.register('Amenity', amenitySchema);

const AmenityFields = amenitySchema.omit({ _id: true, createdAt: true, updatedAt: true });

const CreateAmenityBody = AmenityFields.omit({ icon: true })
  .extend({
    icon: z.any().openapi({ type: 'string', format: 'binary', description: 'Icon image file' }),
  })
  .openapi('CreateAmenityBody');

const UpdateAmenityBody = AmenityFields.openapi('UpdateAmenityBody');

const amenityIdParam = z.object({ aid: objectId('Amenity id') });

const ADMIN_NOTE = 'Requires an admin account.';

export const amenityRouter: Router = (() => {
  const router = Router();

  amenityRegistry.registerPath({
    method: 'get',
    path: '/api/amenity',
    tags: ['Amenity'],
    summary: 'List all amenities',
    security: PUBLIC,
    responses: createApiResponses(amenitySchema.array(), 'Amenities found'),
  });

  router.get('/', controller.getAmenities);

  amenityRegistry.registerPath({
    method: 'post',
    path: '/api/amenity',
    tags: ['Amenity'],
    summary: 'Create an amenity',
    description: 'Upload the icon as `multipart/form-data` field `icon`.',
    security: PUBLIC,
    request: {
      body: { content: { 'multipart/form-data': { schema: CreateAmenityBody } } },
    },
    responses: createApiResponses(amenitySchema, 'Amenity created', {
      status: StatusCodes.CREATED,
      errors: [StatusCodes.BAD_REQUEST],
    }),
  });

  router.post(
    '/',
    upload.single('icon'),
    validateRequest(
      z.object({
        body: amenitySchema.omit({ _id: true, createdAt: true, updatedAt: true }),
        image: z.object({ filename: z.string() }),
      })
    ),
    controller.createAmenity
  );

  amenityRegistry.registerPath({
    method: 'put',
    path: '/api/amenity/{aid}',
    tags: ['Amenity'],
    summary: 'Update an amenity',
    description: ADMIN_NOTE,
    request: {
      params: amenityIdParam,
      body: { content: { 'application/json': { schema: UpdateAmenityBody } } },
    },
    responses: createApiResponses(amenitySchema, 'Amenity updated', {
      auth: true,
      errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND],
    }),
  });

  router.put(
    '/:aid',
    verifyAccessToken,
    verifyIsAdmin,
    validateRequest(
      z.object({
        body: amenitySchema.omit({ _id: true, createdAt: true, updatedAt: true }),
        params: z.object({ aid: z.string() }),
      })
    ),
    controller.updateAmenity
  );

  amenityRegistry.registerPath({
    method: 'delete',
    path: '/api/amenity/{aid}',
    tags: ['Amenity'],
    summary: 'Delete an amenity',
    description: ADMIN_NOTE,
    request: { params: amenityIdParam },
    responses: createApiResponses(amenitySchema, 'Amenity deleted', {
      auth: true,
      errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND],
    }),
  });

  router.delete(
    '/:aid',
    verifyAccessToken,
    verifyIsAdmin,
    validateRequest(
      z.object({
        params: z.object({ aid: commonValidations.id }),
      })
    ),
    controller.deleteAmenity
  );
  return router;
})();
