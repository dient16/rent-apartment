import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import * as controller from '@/modules/review/review.controller';
import { createApiResponses, objectId, PUBLIC } from '@/api-docs/openAPIResponseBuilders';
import { verifyAccessToken } from '@/middlewares/verifyToken';
import { validateRequest } from '@/utils/httpHandlers';

import { REVIEW_CATEGORIES } from './review.model';
import { deleteReviewSchema, getApartmentReviewsSchema, upsertReviewSchema } from './review.dto';

export const reviewRegistry = new OpenAPIRegistry();

const score = z.number().int().min(1).max(5);

const CategoryScoresSchema = z
  .object(
    Object.fromEntries(REVIEW_CATEGORIES.map((category) => [category, score])) as Record<
      (typeof REVIEW_CATEGORIES)[number],
      typeof score
    >
  )
  .openapi('ReviewCategoryScores');

const ReviewSchema = z
  .object({
    _id: z.string(),
    rating: z.number().openapi({ description: 'Overall score, computed from the category scores' }),
    categories: CategoryScoresSchema.nullable(),
    comment: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    isVerifiedStay: z.boolean().openapi({ description: '`true` when the reviewer has a completed booking here' }),
    user: z.object({
      _id: z.string(),
      firstname: z.string(),
      lastname: z.string(),
      avatar: z.string().nullable(),
    }),
  })
  .openapi('Review');

const ReviewFeedSchema = z
  .object({
    page: z.number().int(),
    totalReviews: z.number().int(),
    averageRating: z.number(),
    categoryAverages: z.record(z.enum(REVIEW_CATEGORIES), z.number()),
    distribution: z
      .object({
        1: z.number().int(),
        2: z.number().int(),
        3: z.number().int(),
        4: z.number().int(),
        5: z.number().int(),
      })
      .openapi({ description: 'Number of reviews per star rating' }),
    reviews: z.array(ReviewSchema),
  })
  .openapi('ReviewFeed');

const UpsertReviewBody = upsertReviewSchema.shape.body
  .extend({ apartmentId: objectId('Apartment id'), categories: CategoryScoresSchema })
  .openapi('UpsertReviewBody');

const apartmentIdParam = z.object({ apartmentId: objectId('Apartment id') });

const router = express.Router();

reviewRegistry.registerPath({
  method: 'get',
  path: '/api/review/apartment/{apartmentId}/eligibility',
  tags: ['Review'],
  summary: 'Can the current user review this apartment?',
  description: 'A user can review only after a completed stay and never their own apartment.',
  request: { params: apartmentIdParam },
  responses: createApiResponses(
    z.object({ canReview: z.boolean(), isOwner: z.boolean(), hasStayed: z.boolean() }).openapi('ReviewEligibility'),
    'Eligibility retrieved successfully',
    { auth: true, errors: [StatusCodes.BAD_REQUEST, StatusCodes.NOT_FOUND] }
  ),
});

router.get(
  '/apartment/:apartmentId/eligibility',
  verifyAccessToken,
  validateRequest(getApartmentReviewsSchema),
  controller.checkEligibility
);

reviewRegistry.registerPath({
  method: 'get',
  path: '/api/review/apartment/{apartmentId}',
  tags: ['Review'],
  summary: 'List reviews of an apartment with rating summary',
  security: PUBLIC,
  request: {
    params: apartmentIdParam,
    query: z.object({
      page: z.number().int().min(1).default(1).optional(),
      limit: z.number().int().min(1).max(50).default(5).optional(),
    }),
  },
  responses: createApiResponses(ReviewFeedSchema, 'Reviews retrieved successfully', {
    errors: [StatusCodes.BAD_REQUEST],
  }),
});

router.get('/apartment/:apartmentId', validateRequest(getApartmentReviewsSchema), controller.getApartmentReviews);

reviewRegistry.registerPath({
  method: 'post',
  path: '/api/review',
  tags: ['Review'],
  summary: 'Create or update my review of an apartment',
  description: 'One review per user per apartment - posting again updates the existing one.',
  request: {
    body: { content: { 'application/json': { schema: UpsertReviewBody } } },
  },
  responses: createApiResponses(ReviewSchema, 'Review saved', {
    auth: true,
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.FORBIDDEN, StatusCodes.NOT_FOUND],
  }),
});

router.post('/', verifyAccessToken, validateRequest(upsertReviewSchema), controller.upsertReview);

reviewRegistry.registerPath({
  method: 'delete',
  path: '/api/review/{reviewId}',
  tags: ['Review'],
  summary: 'Delete my review',
  request: { params: z.object({ reviewId: objectId('Review id') }) },
  responses: createApiResponses(z.null(), 'Review deleted', {
    auth: true,
    errors: [StatusCodes.BAD_REQUEST, StatusCodes.FORBIDDEN, StatusCodes.NOT_FOUND],
  }),
});

router.delete('/:reviewId', verifyAccessToken, validateRequest(deleteReviewSchema), controller.deleteReview);

export const reviewRouter = router;
