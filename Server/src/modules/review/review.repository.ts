import mongoose from 'mongoose';

import ApartmentModel from '@/modules/apartment/apartment.model';
import BookingModel from '@/modules/booking/booking.model';
import UserModel from '@/modules/user/user.model';

import ReviewModel, { REVIEW_CATEGORIES, type ReviewCategory } from './review.model';

/** All data access for reviews (and the cross-module reads they need) lives here. */
export const reviewRepository = {
  findApartmentOwner: (apartmentId: string) =>
    ApartmentModel.findById(apartmentId).select('owner').lean<{ owner?: mongoose.Types.ObjectId }>(),

  findApartmentRooms: (apartmentId: string) => ApartmentModel.findById(apartmentId).select('rooms').lean(),

  findUserEmail: (userId: string) => UserModel.findById(userId).select('email').lean(),

  /** Emails among `emails` that have a confirmed/completed booking of one of `roomIds`. */
  findBookedEmails: (emails: string[], roomIds: unknown[]) =>
    BookingModel.find({
      email: { $in: emails },
      status: { $in: ['confirmed', 'completed'] },
      'rooms.roomId': { $in: roomIds },
    } as any)
      .select('email')
      .lean(),

  /** Page of reviews + count + star distribution + category averages, one round trip. */
  findApartmentReviewsPage: (apartmentObjectId: mongoose.Types.ObjectId, page: number, limit: number) =>
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
    ]),

  upsertUserReview: (
    apartmentId: string,
    userId: string,
    data: { rating: number; categories: Record<ReviewCategory, number>; comment: string }
  ) =>
    ReviewModel.findOneAndUpdate(
      { apartment: apartmentId, user: userId },
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).populate('user', 'firstname lastname avatar email'),

  deleteUserReview: (reviewId: string, userId: string) => ReviewModel.findOneAndDelete({ _id: reviewId, user: userId }),
};
