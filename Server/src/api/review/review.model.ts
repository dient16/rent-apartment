import type { Document } from 'mongoose';
import mongoose from 'mongoose';

const COLLECTION = 'reviews';
const DOCUMENT = 'Review';

export const REVIEW_CATEGORIES = ['staff', 'facilities', 'cleanliness', 'comfort', 'value', 'location'] as const;
export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number];

export interface ReviewDoc extends Document {
  apartment: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number;
  categories?: Partial<Record<ReviewCategory, number>>;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const categoryField = { type: Number, min: 1, max: 5 };

const reviewSchema = new mongoose.Schema(
  {
    apartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Apartment',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Overall score — computed from the category scores on save
    rating: { type: Number, required: true, min: 1, max: 5 },
    categories: {
      staff: categoryField,
      facilities: categoryField,
      cleanliness: categoryField,
      comfort: categoryField,
      value: categoryField,
      location: categoryField,
    },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

// One review per user per apartment (writing again updates it)
reviewSchema.index({ apartment: 1, user: 1 }, { unique: true });

const ReviewModel = mongoose.model<ReviewDoc>(DOCUMENT, reviewSchema, COLLECTION);

export default ReviewModel;
