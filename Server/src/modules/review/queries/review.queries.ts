import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { reviewRepository } from '../review.repository';
import { findVerifiedEmails, hasStayed } from '../review.shared';
import { REVIEW_CATEGORIES } from '../review.model';

/** Read side: review feed with distribution/averages, and eligibility check. */
export const reviewQueries = {
  async checkEligibility(userId: string, apartmentId: string) {
    const apartment = await reviewRepository.findApartmentOwner(apartmentId);
    if (!apartment) {
      return new ServiceResponse(ResponseStatus.Failed, 'Apartment not found', null, StatusCodes.NOT_FOUND);
    }
    const isOwner = String(apartment.owner) === String(userId);
    const user = await reviewRepository.findUserEmail(userId);
    const stayed = isOwner ? false : await hasStayed(apartmentId, user?.email);
    return new ServiceResponse(
      ResponseStatus.Success,
      'Eligibility retrieved successfully',
      { canReview: !isOwner && stayed, isOwner, hasStayed: stayed },
      StatusCodes.OK
    );
  },

  async getApartmentReviews(apartmentId: string, page: number, limit: number) {
    const apartmentObjectId = new mongoose.Types.ObjectId(apartmentId);

    const [error, result] = await to(reviewRepository.findApartmentReviewsPage(apartmentObjectId, page, limit));
    if (error) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error retrieving reviews',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const [reviews, total, buckets, categoryAggregate] = result;
    const categoryRow = (categoryAggregate as Record<string, number | null>[])[0] || {};
    const categoryAverages: Record<string, number> = {};
    for (const category of REVIEW_CATEGORIES) {
      const value = categoryRow[category];
      if (typeof value === 'number') categoryAverages[category] = Math.round(value * 10) / 10;
    }
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const bucket of buckets as { _id: number; count: number }[]) {
      distribution[bucket._id] = bucket.count;
    }

    const emails = reviews.map((review) => (review.user as { email?: string })?.email).filter(Boolean) as string[];
    const verifiedEmails = await findVerifiedEmails(apartmentId, emails);

    const items = reviews.map((review) => {
      const user = review.user as {
        _id: mongoose.Types.ObjectId;
        firstname?: string;
        lastname?: string;
        avatar?: string;
        email?: string;
      };
      return {
        _id: review._id,
        rating: review.rating,
        categories: review.categories ?? null,
        comment: review.comment,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        isVerifiedStay: user?.email ? verifiedEmails.has(user.email) : false,
        user: {
          _id: user?._id,
          firstname: user?.firstname ?? '',
          lastname: user?.lastname ?? '',
          avatar: user?.avatar ?? null,
        },
      };
    });

    return new ServiceResponse(
      ResponseStatus.Success,
      'Reviews retrieved successfully',
      {
        page,
        totalReviews: total,
        averageRating: typeof categoryRow.overall === 'number' ? Math.round(categoryRow.overall * 10) / 10 : 0,
        categoryAverages,
        distribution,
        reviews: items,
      },
      StatusCodes.OK
    );
  },
};
