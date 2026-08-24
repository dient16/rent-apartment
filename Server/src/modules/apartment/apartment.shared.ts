import mongoose from 'mongoose';

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface PaginatedResult<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface Amenity {
  name: string;
  icon: string;
}

export interface ApartmentDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  location: {
    street: string;
    ward: string;
    district: string;
    province: string;
  };
  price: number;
  numberOfGuest: number;
  quantity: number;
  amenities: Amenity[];
  rating: {
    ratingAvg: number;
    totalRating: number;
  };
}
