import type { NextFunction, Request, Response } from '@/types/http';

import { handleServiceResponse } from '@/utils/httpHandlers';

import { reviewCommands } from './commands/review.commands';
import { reviewQueries } from './queries/review.queries';

export const getApartmentReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apartmentId } = req.params;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 50);

    const serviceResponse = await reviewQueries.getApartmentReviews(apartmentId, page, limit);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const checkEligibility = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const { apartmentId } = req.params;

    const serviceResponse = await reviewQueries.checkEligibility(userId, apartmentId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const upsertReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const { apartmentId, categories, comment } = req.body;

    const serviceResponse = await reviewCommands.upsertReview(userId, apartmentId, categories, comment);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { _id: userId } = req.user as UserDecode;
    const { reviewId } = req.params;

    const serviceResponse = await reviewCommands.deleteReview(userId, reviewId);
    handleServiceResponse(serviceResponse, res);
  } catch (error) {
    next(error);
  }
};
