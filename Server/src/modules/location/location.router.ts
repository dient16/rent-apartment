import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import * as controller from '@/modules/location/location.controller';
import { createApiResponses, PUBLIC } from '@/api-docs/openAPIResponseBuilders';

export const locationRegistry = new OpenAPIRegistry();

const SuggestionSchema = z
  .object({
    label: z.string().openapi({ example: 'Quận 1' }),
    description: z.string().openapi({ example: 'Hồ Chí Minh' }),
    value: z.string().openapi({ description: 'Full address string to use for geocoding' }),
  })
  .openapi('AddressSuggestion');

const PlaceSchema = z
  .object({
    lat: z.number(),
    long: z.number(),
    province: z.string(),
    district: z.string(),
    ward: z.string().optional(),
    street: z.string(),
    displayName: z.string().optional(),
  })
  .passthrough()
  .openapi('Place');

const router = express.Router();

locationRegistry.registerPath({
  method: 'get',
  path: '/api/location/suggest',
  tags: ['Location'],
  summary: 'Autocomplete Vietnamese addresses',
  description: 'Returns an empty list for queries shorter than 2 characters or when the geocoder is unavailable.',
  security: PUBLIC,
  request: {
    query: z.object({ q: z.string().min(2).openapi({ example: 'Quận 1' }) }),
  },
  responses: createApiResponses(z.array(SuggestionSchema), 'Suggestions'),
});

router.get('/suggest', controller.suggestAddresses);

locationRegistry.registerPath({
  method: 'get',
  path: '/api/location/geocode',
  tags: ['Location'],
  summary: 'Address → coordinates',
  security: PUBLIC,
  request: {
    query: z.object({ q: z.string().openapi({ example: '1 Nguyễn Huệ, Quận 1, Hồ Chí Minh' }) }),
  },
  responses: createApiResponses(z.array(PlaceSchema), 'Places'),
});

router.get('/geocode', controller.geocode);

locationRegistry.registerPath({
  method: 'get',
  path: '/api/location/reverse',
  tags: ['Location'],
  summary: 'Coordinates → address',
  security: PUBLIC,
  request: {
    query: z.object({
      lat: z.number().min(-90).max(90).openapi({ example: 10.7769 }),
      lon: z.number().min(-180).max(180).openapi({ example: 106.7009 }),
    }),
  },
  responses: createApiResponses(PlaceSchema.nullable(), 'Address', { errors: [StatusCodes.BAD_REQUEST] }),
});

router.get('/reverse', controller.reverseGeocode);

export const locationRouter = router;
