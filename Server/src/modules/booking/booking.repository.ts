import ApartmentModel from '@/modules/apartment/apartment.model';
import RoomModel from '@/modules/room/room.model';
import User from '@/modules/user/user.model';

import BookingModel from './booking.model';
import type { Booking as IBooking } from './booking.dto';

/** All Mongoose access for bookings (and the cross-module reads they need) lives here. */
export const bookingRepository = {
  /* ---------- users ---------- */
  findUserById: (userId: string) => User.findById(userId).lean().exec(),
  findUserIdByEmail: (email: string) => User.findOne({ email }).select('_id').lean(),

  /* ---------- rooms / apartments ---------- */
  findRoomById: (roomId: unknown) => RoomModel.findById(roomId).exec(),

  /** Atomic $push: skips revalidating legacy docs and avoids booking races. */
  pushUnavailableRange: (roomId: unknown, startDay: unknown, endDay: unknown) =>
    RoomModel.findByIdAndUpdate(roomId, {
      $push: { unavailableDateRanges: { startDay, endDay } },
    }).exec(),

  findRoomApartmentIds: (roomIds: unknown[]) =>
    RoomModel.find({ _id: { $in: roomIds } } as any)
      .select('apartmentId')
      .lean(),

  findApartmentOwners: (apartmentIds: string[]) =>
    ApartmentModel.find({ _id: { $in: apartmentIds } })
      .select('owner title')
      .lean(),

  findApartmentsWithOwnerContact: (apartmentIds: unknown[]) =>
    ApartmentModel.find({ _id: { $in: apartmentIds } } as any)
      .populate({ path: 'owner', select: 'phone email' })
      .lean()
      .exec(),

  findOwnedApartments: (userId: string) => ApartmentModel.find({ owner: userId }).select('_id title').lean().exec(),

  findRoomsInApartments: (apartmentIds: unknown[]) =>
    RoomModel.find({ apartmentId: { $in: apartmentIds } } as any)
      .select('_id apartmentId')
      .lean()
      .exec(),

  countOwnedApartments: (apartmentIds: string[], userId: string) =>
    ApartmentModel.countDocuments({ _id: { $in: apartmentIds }, owner: userId }).exec(),

  /* ---------- bookings ---------- */
  create: (data: Partial<IBooking>) => new BookingModel(data).save(),

  findById: (bookingId: string) => BookingModel.findById(bookingId).exec(),

  countsByStatus: (baseFilter: Record<string, unknown>) =>
    BookingModel.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),

  hostStats: (baseFilter: Record<string, unknown>) =>
    BookingModel.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          revenue: {
            $sum: { $cond: [{ $in: ['$status', ['confirmed', 'completed']] }, '$totalPrice', 0] },
          },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          upcoming: {
            $sum: {
              $cond: [{ $and: [{ $eq: ['$status', 'confirmed'] }, { $gt: ['$checkInTime', new Date()] }] }, 1, 0],
            },
          },
          total: { $sum: 1 },
        },
      },
    ]),

  count: (filter: Record<string, unknown>) => BookingModel.countDocuments(filter),

  findHostBookingsPage: (filter: Record<string, unknown>, page: number, limit: number) =>
    BookingModel.find(filter as any)
      .populate({
        path: 'rooms.roomId',
        select: 'roomType apartmentId',
        model: RoomModel,
        populate: { path: 'apartmentId', select: 'title', model: ApartmentModel },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),

  findGuestBookingsPage: (filter: Record<string, unknown>, page: number, limit: number) =>
    BookingModel.find(filter as any)
      .populate({
        path: 'rooms.roomId',
        select: 'roomType price amenities size images apartmentId',
        model: RoomModel,
        populate: { path: 'apartmentId', select: 'title location.province location.district', model: ApartmentModel },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec(),

  findDetailById: (bookingId: string) =>
    BookingModel.findById(bookingId)
      .populate({
        path: 'rooms.roomId',
        select: 'apartmentId roomType images size price bedType',
      })
      .lean()
      .exec(),
};
