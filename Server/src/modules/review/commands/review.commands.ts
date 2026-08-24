import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { reviewRepository } from '../review.repository';
import { findVerifiedEmails, hasStayed } from '../review.shared';
import { REVIEW_CATEGORIES, type ReviewCategory } from '../review.model';

/** Write side: upsert / delete the caller's review. */
export const reviewCommands = {
  /** Create or update the caller's single review of an apartment */
  async upsertReview(userId: string, apartmentId: string, categories: Record<ReviewCategory, number>, comment: string) {
    // Overall score = mean of the six category scores
    const scores = REVIEW_CATEGORIES.map((category) => categories[category]);
    const rating = Math.round((scores.reduce((total, score) => total + score, 0) / scores.length) * 10) / 10;

    const apartment = await reviewRepository.findApartmentOwner(apartmentId);
    if (!apartment) {
      return new ServiceResponse(ResponseStatus.Failed, 'Apartment not found', null, StatusCodes.NOT_FOUND);
    }
    if (String(apartment.owner) === String(userId)) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Hosts cannot review their own apartment',
        null,
        StatusCodes.FORBIDDEN
      );
    }

    const author = await reviewRepository.findUserEmail(userId);
    if (!(await hasStayed(apartmentId, author?.email))) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Only guests who have completed a stay can write a review',
        null,
        StatusCodes.FORBIDDEN
      );
    }

    const [error, review] = await to(
      reviewRepository.upsertUserReview(apartmentId, userId, { rating, categories, comment })
    );
    if (error || !review) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error saving review', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    const user = await reviewRepository.findUserEmail(userId);
    const verifiedEmails = user?.email ? await findVerifiedEmails(apartmentId, [user.email]) : new Set<string>();

    return new ServiceResponse(
      ResponseStatus.Success,
      'Review saved successfully',
      {
        _id: review._id,
        rating: review.rating,
        categories: review.categories ?? null,
        comment: review.comment,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        isVerifiedStay: user?.email ? verifiedEmails.has(user.email) : false,
      },
      StatusCodes.OK
    );
  },

  async deleteReview(userId: string, reviewId: string) {
    const [error, deleted] = await to(reviewRepository.deleteUserReview(reviewId, userId));
    if (error) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error deleting review',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    if (!deleted) {
      return new ServiceResponse(ResponseStatus.Failed, 'Review not found', null, StatusCodes.NOT_FOUND);
    }
    return new ServiceResponse(ResponseStatus.Success, 'Review deleted successfully', null, StatusCodes.OK);
  },
};
