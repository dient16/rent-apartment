import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import ApartmentModel from '@/api/apartment/apartment.model';
import BookingModel from '@/api/booking/booking.model';
import UserModel from '@/api/user/user.model';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import ReviewModel, { REVIEW_CATEGORIES, type ReviewCategory } from './review.model';

/** Users who booked a room of this apartment (confirmed/completed) get a "Verified stay" badge */
const findVerifiedEmails = async (apartmentId: string, emails: string[]): Promise<Set<string>> => {
  if (emails.length === 0) return new Set();
  const apartment = await ApartmentModel.findById(apartmentId).select('rooms').lean();
  if (!apartment?.rooms?.length) return new Set();
  const bookings = await BookingModel.find({
    email: { $in: emails },
    status: { $in: ['confirmed', 'completed'] },
    'rooms.roomId': { $in: apartment.rooms },
  })
    .select('email')
    .lean();
  return new Set(bookings.map((b) => b.email));
};

/** Only guests with a confirmed/completed booking of this apartment may review it */
const hasStayed = async (apartmentId: string, email?: string | null): Promise<boolean> => {
  if (!email) return false;
  return (await findVerifiedEmails(apartmentId, [email])).size > 0;
};

export const reviewService = {
  async checkEligibility(userId: string, apartmentId: string) {
    const apartment = await ApartmentModel.findById(apartmentId)
      .select('owner')
      .lean<{ owner?: mongoose.Types.ObjectId }>();
    if (!apartment) {
      return new ServiceResponse(ResponseStatus.Failed, 'Apartment not found', null, StatusCodes.NOT_FOUND);
    }
    const isOwner = String(apartment.owner) === String(userId);
    const user = await UserModel.findById(userId).select('email').lean();
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

    const [error, result] = await to(
      Promise.all([
        ReviewModel.find({ apartment: apartmentObjectId })
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('user', 'firstname lastname avatar email')
          .lean(),
        ReviewModel.countDocuments({ apartment: apartmentObjectId }),
        ReviewModel.aggregate([
          { $match: { apartment: apartmentObjectId } },
          // Ratings can be fractional (category mean) — bucket by rounded star
          { $group: { _id: { $round: ['$rating', 0] }, count: { $sum: 1 } } },
        ]),
        ReviewModel.aggregate([
          { $match: { apartment: apartmentObjectId } },
          {
            $group: {
              _id: null,
              overall: { $avg: '$rating' },
              ...Object.fromEntries(REVIEW_CATEGORIES.map((c) => [c, { $avg: `$categories.${c}` }])),
            },
          },
        ]),
      ])
    );
    if (error) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error retrieving reviews', null, StatusCodes.INTERNAL_SERVER_ERROR);
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
      const user = review.user as { _id: mongoose.Types.ObjectId; firstname?: string; lastname?: string; avatar?: string; email?: string };
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

  /** Create or update the caller's single review of an apartment */
  async upsertReview(userId: string, apartmentId: string, categories: Record<ReviewCategory, number>, comment: string) {
    // Overall score = mean of the six category scores
    const scores = REVIEW_CATEGORIES.map((category) => categories[category]);
    const rating = Math.round((scores.reduce((total, score) => total + score, 0) / scores.length) * 10) / 10;
    const apartment = await ApartmentModel.findById(apartmentId)
      .select('owner')
      .lean<{ owner?: mongoose.Types.ObjectId }>();
    if (!apartment) {
      return new ServiceResponse(ResponseStatus.Failed, 'Apartment not found', null, StatusCodes.NOT_FOUND);
    }
    if (String(apartment.owner) === String(userId)) {
      return new ServiceResponse(ResponseStatus.Failed, 'Hosts cannot review their own apartment', null, StatusCodes.FORBIDDEN);
    }

    const author = await UserModel.findById(userId).select('email').lean();
    if (!(await hasStayed(apartmentId, author?.email))) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Only guests who have completed a stay can write a review',
        null,
        StatusCodes.FORBIDDEN
      );
    }

    const [error, review] = await to(
      ReviewModel.findOneAndUpdate(
        { apartment: apartmentId, user: userId },
        { $set: { rating, categories, comment } },
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
      ).populate('user', 'firstname lastname avatar email')
    );
    if (error || !review) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error saving review', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    const user = await UserModel.findById(userId).select('email').lean();
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
    const [error, deleted] = await to(ReviewModel.findOneAndDelete({ _id: reviewId, user: userId }));
    if (error) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error deleting review', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
    if (!deleted) {
      return new ServiceResponse(ResponseStatus.Failed, 'Review not found', null, StatusCodes.NOT_FOUND);
    }
    return new ServiceResponse(ResponseStatus.Success, 'Review deleted successfully', null, StatusCodes.OK);
  },
};
