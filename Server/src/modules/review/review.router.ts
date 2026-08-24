import express from 'express';

import * as controller from '@/modules/review/review.controller';
import { verifyAccessToken } from '@/middlewares/verifyToken';
import { validateRequest } from '@/utils/httpHandlers';

import { deleteReviewSchema, getApartmentReviewsSchema, upsertReviewSchema } from './review.dto';

const router = express.Router();

router.get(
  '/apartment/:apartmentId/eligibility',
  verifyAccessToken,
  validateRequest(getApartmentReviewsSchema),
  controller.checkEligibility
);
router.get('/apartment/:apartmentId', validateRequest(getApartmentReviewsSchema), controller.getApartmentReviews);
router.post('/', verifyAccessToken, validateRequest(upsertReviewSchema), controller.upsertReview);
router.delete('/:reviewId', verifyAccessToken, validateRequest(deleteReviewSchema), controller.deleteReview);

export const reviewRouter = router;
