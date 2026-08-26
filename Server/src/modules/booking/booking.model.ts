import type { Document } from 'mongoose';
import mongoose from 'mongoose';
import type { Booking } from './booking.dto';

const COLLECTION: string = 'bookings';
const DOCUMENT: string = 'Booking';
const bookingMongooseSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    phone: { type: String, required: true },
    rooms: [
      {
        roomId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Room',
          required: true,
        },
        roomNumber: { type: Number, required: true },
      },
    ],
    numberOfGuest: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'canceled', 'completed'],
      default: 'pending',
      required: true,
    },
    arrivalTime: { type: String, required: true },
    checkInTime: { type: Date, required: true },
    checkOutTime: { type: Date, required: true },
    totalPrice: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

const BookingModel = mongoose.model<Booking & Document>(DOCUMENT, bookingMongooseSchema, COLLECTION);

export default BookingModel;
