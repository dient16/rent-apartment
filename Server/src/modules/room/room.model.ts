import type { Document } from 'mongoose';
import mongoose from 'mongoose';
import aggregatePaginate from 'mongoose-aggregate-paginate-v2';

import type { Room } from './room.dto';

const COLLECTION = 'rooms';
const DOCUMENT = 'Room';

const roomMongooseSchema = new mongoose.Schema(
  {
    apartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Apartment',
      index: true,
    },
    roomType: { type: String, required: true },
    amenities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Amenity', required: true }],
    size: { type: Number, required: true },
    price: { type: Number, required: true },
    images: [{ type: String, required: true }],
    unavailableDateRanges: [{ startDay: { type: Date }, endDay: { type: Date } }],
    numberOfGuest: { type: Number, required: true },
    bedType: { type: String, required: true },
    reviews: [
      {
        score: { type: Number },
        comment: { type: String },
        postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    quantity: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);
roomMongooseSchema.methods.isAvailable = function (date: Date): boolean {
  if (!this.unavailableDateRanges) {
    return true;
  }
  return !this.unavailableDateRanges.some(
    (range: { startDay: Date; endDay: Date }) => date >= range.startDay && date <= range.endDay
  );
};
// For search: filter by price/guests/quantity before grouping by apartment
roomMongooseSchema.index({ price: 1, numberOfGuest: 1, quantity: 1 });
roomMongooseSchema.plugin(aggregatePaginate);

const RoomModel = mongoose.model<Room & Document & { isAvailable: (date: Date) => boolean }>(
  DOCUMENT,
  roomMongooseSchema,
  COLLECTION
);

export default RoomModel;
