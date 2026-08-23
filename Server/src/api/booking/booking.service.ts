import fs from 'node:fs/promises';

import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import moment from 'moment';

import User from '@/api/user/user.model';
import { logger } from '@/utils/logger';
import { escapeRegex } from '@/utils/regex';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { notificationService } from '@/api/notification/notification.service';
import { sendMail } from '@/services/mail.service';

import type { Booking as IBooking } from './booking.dto';
import RoomModel from '../room/room.model';
import BookingModel from './booking.model';
import { env } from '@/config/env.config';
import ApartmentModel from '@/api/apartment/apartment.model';
const { SERVER_URL } = env;

/** Dates go straight into emails, so render them readably instead of Date.toString(). */
const formatMailDate = (value: Date | string) => moment(value).format('ddd, DD MMM YYYY');

const bookingUrl = (bookingId: string) => `${env.CLIENT_URL}/my-booking/${bookingId}`;


type BookingListQuery = { page?: number; limit?: number; status?: string; search?: string };


const getUserBookings = async (userId: string, { page = 1, limit = 10, status = 'all', search = '' }: BookingListQuery = {}) => {
  try {
    // Step 1: Find all apartments owned by the user
    const apartments = await ApartmentModel.find({ owner: userId }).select('_id title').lean().exec();
    if (!apartments.length) {
      return new ServiceResponse(
        ResponseStatus.Success,
        'No bookings found',
        { bookings: [], counts: {}, stats: { revenue: 0, pending: 0, upcoming: 0, total: 0 }, pagination: { page, limit, total: 0, totalPages: 1 } },
        StatusCodes.OK
      );
    }

    // Step 2: Find all rooms in those apartments
    const rooms = await RoomModel.find({
      apartmentId: { $in: apartments.map((apartment) => apartment._id) },
    } as any)
      .select('_id apartmentId')
      .lean()
      .exec();

    const baseFilter: Record<string, any> = { 'rooms.roomId': { $in: rooms.map((room) => room._id) } };

    if (search.trim()) {
      const keyword = new RegExp(escapeRegex(search.trim()), 'i');
      const matchedRoomIds = rooms
        .filter((room: any) =>
          apartments.some((apartment: any) => apartment._id.equals(room.apartmentId) && keyword.test(apartment.title))
        )
        .map((room: any) => room._id);

      baseFilter.$or = [
        { firstname: keyword },
        { lastname: keyword },
        { email: keyword },
        ...(matchedRoomIds.length ? [{ 'rooms.roomId': { $in: matchedRoomIds } }] : []),
      ];
    }

    const filter = status === 'all' ? baseFilter : { ...baseFilter, status };

    const [countRows, statRows, total, bookings] = await Promise.all([
      BookingModel.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
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
      BookingModel.countDocuments(filter),
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
    ]);

    const counts: Record<string, number> = { all: 0 };
    countRows.forEach((row: any) => {
      counts[row._id] = row.count;
      counts.all += row.count;
    });

    const hostBookings = bookings.map((booking: any) => ({
      _id: booking._id,
      guestName: [booking.firstname, booking.lastname].filter(Boolean).join(' '),
      email: booking.email,
      phone: booking.phone,
      apartmentName: booking.rooms[0]?.roomId?.apartmentId?.title || 'Apartment',
      rooms: booking.rooms.map((room: any) => ({
        roomType: room.roomId?.roomType,
        roomNumber: room.roomNumber,
      })),
      checkInTime: booking.checkInTime,
      checkOutTime: booking.checkOutTime,
      totalPrice: booking.totalPrice,
      status: booking.status,
      createdAt: booking.createdAt,
    }));

    return new ServiceResponse(
      ResponseStatus.Success,
      'Bookings retrieved successfully',
      {
        bookings: hostBookings,
        counts,
        stats: statRows[0]
          ? {
              revenue: statRows[0].revenue,
              pending: statRows[0].pending,
              upcoming: statRows[0].upcoming,
              total: statRows[0].total,
            }
          : { revenue: 0, pending: 0, upcoming: 0, total: 0 },
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      StatusCodes.OK
    );
  } catch (error) {
    logger.error({ err: error }, 'Error retrieving user bookings');
    return new ServiceResponse(
      ResponseStatus.Failed,
      'Error retrieving bookings',
      null,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

const createBooking = async (bookingData: Partial<IBooking>): Promise<ServiceResponse<IBooking | null>> => {
  const { email, firstname, lastname, phone, arrivalTime, checkInTime, checkOutTime, totalPrice, rooms } = bookingData;

  if (!email || !firstname || !lastname || !rooms || rooms.length === 0 || !totalPrice || !checkInTime || !checkOutTime) {
    return new ServiceResponse(ResponseStatus.Failed, 'Missing required fields', null, StatusCodes.BAD_REQUEST);
  }

  for (const roomData of rooms) {
    const { roomId } = roomData;

    if (!roomId) {
      return new ServiceResponse(ResponseStatus.Failed, 'Missing room ID', null, StatusCodes.BAD_REQUEST);
    }

    const [roomError, room] = await to(RoomModel.findById(roomId).exec());
    if (roomError || !room) {
      return new ServiceResponse(ResponseStatus.Failed, 'Room not found', null, StatusCodes.NOT_FOUND);
    }

    if (!room.isAvailable(checkInTime)) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        `Room ${roomId} is not available for the selected dates`,
        null,
        StatusCodes.BAD_REQUEST
      );
    }

    // Atomic $push: skips re-validating existing fields (legacy docs may lack newly
    // required ones like bedType) and avoids races between concurrent bookings
    const [updateError] = await to(
      RoomModel.findByIdAndUpdate(roomId, {
        $push: { unavailableDateRanges: { startDay: checkInTime, endDay: checkOutTime } },
      }).exec()
    );
    if (updateError) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error updating room availability',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  const newBooking = new BookingModel({
    email,
    firstname,
    lastname,
    phone,
    arrivalTime,
    checkInTime,
    checkOutTime,
    totalPrice,
    status: 'pending',
    rooms: rooms.map((roomData) => ({
      roomId: roomData.roomId,
      roomNumber: roomData.roomNumber,
    })),
  });

  const [saveError, savedBooking] = await to(newBooking.save());
  if (saveError) {
    return new ServiceResponse(ResponseStatus.Failed, 'Error saving booking', null, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  const [readError, htmlTemplate] = await to(fs.readFile('templates/bookingConfirmationTemplate.html', 'utf-8'));
  if (readError) {
    return new ServiceResponse(
      ResponseStatus.Failed,
      'Error reading email template',
      null,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const htmlToSend = htmlTemplate
    .replaceAll('{{firstname}}', firstname)
    .replaceAll('{{lastname}}', lastname)
    .replaceAll('{{bookingId}}', newBooking._id.toString().slice(-8).toUpperCase())
    .replaceAll('{{bookingUrl}}', bookingUrl(newBooking._id.toString()))
    .replaceAll('{{checkInTime}}', formatMailDate(checkInTime))
    .replaceAll('{{checkOutTime}}', formatMailDate(checkOutTime))
    .replaceAll('{{totalPrice}}', `${totalPrice.toLocaleString()} VND`);

  const [mailError] = await to(sendMail({ email, html: htmlToSend, subject: 'Booking Confirmation' }));
  if (mailError) {
    return new ServiceResponse(ResponseStatus.Failed, 'Error sending email', null, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // Notify the owning host(s) about the new booking (never blocks the flow)
  (async () => {
    const roomIds = (newBooking as any).rooms.map((room: any) => room.roomId);
    const bookedRooms = await RoomModel.find({ _id: { $in: roomIds } })
      .select('apartmentId')
      .lean();
    const apartmentIds = [...new Set(bookedRooms.map((room) => String(room.apartmentId)))];
    const apartments = await ApartmentModel.find({ _id: { $in: apartmentIds } })
      .select('owner title')
      .lean();
    const guestName = [firstname, lastname].filter(Boolean).join(' ');
    for (const apartment of apartments) {
      await notificationService.notify({
        userId: (apartment as any).owner,
        type: 'booking_created',
        title: 'New booking request',
        message: `${guestName} requested a booking at ${(apartment as any).title} (${new Date(checkInTime as any).toLocaleDateString('en-GB')} - ${new Date(checkOutTime as any).toLocaleDateString('en-GB')}, ${totalPrice.toLocaleString()} VND). Please confirm or decline.`,
        link: '/host/bookings',
      });
    }
  })().catch(() => {});

  return new ServiceResponse(ResponseStatus.Success, 'Booking successfully created', savedBooking, StatusCodes.CREATED);
};
const getBookings = async (
  userId: string,
  { page = 1, limit = 10, status = 'all' }: BookingListQuery = {}
): Promise<ServiceResponse<any>> => {
  const [errFindUser, user] = await to(User.findById(userId).lean().exec());
  if (errFindUser || !user) {
    return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
  }

  const baseFilter: Record<string, any> = { email: user.email };
  const filter = status === 'all' ? baseFilter : { ...baseFilter, status };

  const [errCount, countRows] = await to(
    BookingModel.aggregate([{ $match: baseFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }])
  );

  const [errTotal, total] = await to(BookingModel.countDocuments(filter));

  const [errFindBookings, bookings] = await to(
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
      .exec()
  );

  if (errFindBookings || errCount || errTotal) {
    return new ServiceResponse(
      ResponseStatus.Failed,
      'Error finding bookings',
      null,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const filteredBookingDetails = bookings.map((booking) => ({
    _id: booking._id,
    apartmentName: ((booking as any).rooms[0]?.roomId as any)?.apartmentId?.title || 'Apartment',
    apartmentLocation: [
      ((booking as any).rooms[0]?.roomId as any)?.apartmentId?.location?.district,
      ((booking as any).rooms[0]?.roomId as any)?.apartmentId?.location?.province,
    ]
      .filter((part, index, parts) => Boolean(part) && parts.indexOf(part) === index)
      .join(', '),
    email: booking.email,
    firstname: booking.firstname,
    lastname: booking.lastname,
    phone: booking.phone,
    rooms: booking.rooms.map((room: any) => ({
      roomId: room.roomId._id,
      roomType: room.roomId.roomType,
      roomNumber: room.roomNumber,
      price: room.roomId.price,
      size: room.roomId.size,
      image: `${SERVER_URL}/api/image/${room.roomId.images[0]}`,
    })),
    arrivalTime: booking.arrivalTime,
    checkInTime: booking.checkInTime,
    checkOutTime: booking.checkOutTime,
    totalPrice: booking.totalPrice,
    status: booking.status,
  }));

  const counts: Record<string, number> = { all: 0 };
  (countRows || []).forEach((row: any) => {
    counts[row._id] = row.count;
    counts.all += row.count;
  });

  return new ServiceResponse(
    ResponseStatus.Success,
    'Bookings retrieved successfully',
    {
      bookings: filteredBookingDetails,
      counts,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    },
    StatusCodes.OK
  );
};

const getBooking = async (bookingId: string): Promise<ServiceResponse<any>> => {
  const [err, booking] = await to(
    BookingModel.findById(bookingId)
      .populate({
        path: 'rooms.roomId',
        select: 'apartmentId roomType images size price bedType',
      })
      .lean()
      .exec()
  );

  if (err || !booking) {
    return new ServiceResponse(ResponseStatus.Failed, 'Booking not found', null, StatusCodes.NOT_FOUND);
  }

  const apartmentIds = booking.rooms.map((room: any) => room.roomId.apartmentId);
  const uniqueApartmentIds = [...new Set(apartmentIds)];

  const [errApartments, apartments] = await to(
    ApartmentModel.find({ _id: { $in: uniqueApartmentIds } })
      .populate({ path: 'owner', select: 'phone email' })
      .lean()
      .exec()
  );

  if (errApartments || apartments.length === 0) {
    return new ServiceResponse(ResponseStatus.Failed, 'Apartments not found', null, StatusCodes.NOT_FOUND);
  }
  const apartment = apartments.find((ap) => ap._id.toString() === (booking.rooms[0] as any).roomId.apartmentId.toString());
  const bookingDetails = {
    _id: booking._id,
    status: booking.status,
    arrivalTime: booking.arrivalTime,
    guest: {
      firstname: booking.firstname,
      lastname: booking.lastname,
      email: booking.email,
      phone: booking.phone,
    },
    checkIn: booking.checkInTime,
    checkOut: booking.checkOutTime,
    totalPrice: booking.totalPrice,
    apartmentName: apartment ? apartment.title : 'Unknown',
    address: apartment ? apartment.location : {},
    contact: apartment ? (apartment as any).owner : {},
    rooms: booking.rooms.map((room: any) => {
      return {
        roomId: room.roomId._id,
        roomType: room.roomId.roomType,
        roomNumber: room.roomNumber,
        size: room.roomId.size,
        price: room.roomId.price,
        bedType: room.roomId.bedType,
        images: room.roomId.images.map((image: string) => `${process.env.SERVER_URL}/api/image/${image}`),
      };
    }),
  };

  return new ServiceResponse(ResponseStatus.Success, 'Booking retrieved successfully', bookingDetails, StatusCodes.OK);
};
const confirmBooking = async (bookingId: string): Promise<ServiceResponse<IBooking | null>> => {
  const [findError, booking] = await to(BookingModel.findById(bookingId).exec());
  if (findError || !booking) {
    return new ServiceResponse(ResponseStatus.Failed, 'Booking not found', null, StatusCodes.NOT_FOUND);
  }

  if (booking.status !== 'pending') {
    return new ServiceResponse(
      ResponseStatus.Failed,
      'Booking is already confirmed or canceled',
      null,
      StatusCodes.BAD_REQUEST
    );
  }

  booking.status = 'confirmed';

  const [updateError, updatedBooking] = await to(booking.save());
  if (updateError) {
    return new ServiceResponse(
      ResponseStatus.Failed,
      'Error updating booking status',
      null,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const [readError, htmlTemplate] = await to(fs.readFile('templates/bookingStatusConfirmationTemplate.html', 'utf-8'));

  if (readError) {
    return new ServiceResponse(
      ResponseStatus.Failed,
      'Error reading email template',
      null,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const htmlToSend = htmlTemplate
    .replaceAll('{{firstname}}', booking.firstname)
    .replaceAll('{{lastname}}', booking.lastname)
    .replaceAll('{{bookingId}}', booking._id.toString().slice(-8).toUpperCase())
    .replaceAll('{{bookingUrl}}', bookingUrl(booking._id.toString()))
    .replaceAll('{{checkInTime}}', formatMailDate(booking.checkInTime))
    .replaceAll('{{checkOutTime}}', formatMailDate(booking.checkOutTime))
    .replaceAll('{{totalPrice}}', `${booking.totalPrice.toLocaleString()} VND`);

  const [mailError] = await to(sendMail({ email: booking.email, html: htmlToSend, subject: 'Booking Confirmed' }));
  if (mailError) {
    return new ServiceResponse(ResponseStatus.Failed, 'Error sending email', null, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // Notify the guest (if the booking email has an account)
  (async () => {
    const guest = await User.findOne({ email: booking.email }).select('_id').lean();
    if (guest) {
      await notificationService.notify({
        userId: (guest as any)._id,
        type: 'booking_confirmed',
        title: 'Booking confirmed',
        message: `Your booking (${new Date(booking.checkInTime).toLocaleDateString('en-GB')} - ${new Date(booking.checkOutTime).toLocaleDateString('en-GB')}) has been confirmed by the host. Have a great stay!`,
        link: `/my-booking/${booking._id}`,
      });
    }
  })().catch(() => {});

  return new ServiceResponse(ResponseStatus.Success, 'Booking successfully confirmed', updatedBooking, StatusCodes.OK);
};

const cancelBooking = async (bookingId: string, userId: string): Promise<ServiceResponse<IBooking | null>> => {
  const [findUserError, user] = await to(User.findById(userId).lean().exec());
  if (findUserError || !user) {
    return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
  }

  const [findError, booking] = await to(BookingModel.findById(bookingId).exec());
  if (findError || !booking) {
    return new ServiceResponse(ResponseStatus.Failed, 'Booking not found', null, StatusCodes.NOT_FOUND);
  }

  // Only the booking owner (this email) or the host owning the apartment may cancel
  if (booking.email !== user.email) {
    const roomIds = (booking as any).rooms.map((room: any) => room.roomId);
    const [findRoomsError, bookedRooms] = await to(
      RoomModel.find({ _id: { $in: roomIds } })
        .select('apartmentId')
        .lean()
        .exec()
    );
    if (findRoomsError) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error checking rooms', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
    const apartmentIds = [...new Set(bookedRooms.map((room) => String(room.apartmentId)))];
    const [findAptError, ownedCount] = await to(
      ApartmentModel.countDocuments({ _id: { $in: apartmentIds }, owner: userId }).exec()
    );
    if (findAptError || ownedCount === 0) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'You do not have permission to cancel this booking',
        null,
        StatusCodes.FORBIDDEN
      );
    }
  }

  if (booking.status === 'canceled') {
    return new ServiceResponse(ResponseStatus.Failed, 'Booking is already canceled', null, StatusCodes.BAD_REQUEST);
  }
  if (booking.status === 'completed') {
    return new ServiceResponse(
      ResponseStatus.Failed,
      'A completed booking cannot be canceled',
      null,
      StatusCodes.BAD_REQUEST
    );
  }

  const canceledByGuest = booking.email === user.email;

  booking.status = 'canceled';
  const [updateError, updatedBooking] = await to(booking.save());
  if (updateError) {
    return new ServiceResponse(
      ResponseStatus.Failed,
      'Error canceling booking',
      null,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  // Guest cancels -> notify host; host declines -> notify guest (if they have an account)
  (async () => {
    const dates = `${new Date(booking.checkInTime).toLocaleDateString('en-GB')} - ${new Date(booking.checkOutTime).toLocaleDateString('en-GB')}`;
    if (canceledByGuest) {
      const roomIds = (booking as any).rooms.map((room: any) => room.roomId);
      const bookedRooms = await RoomModel.find({ _id: { $in: roomIds } })
        .select('apartmentId')
        .lean();
      const apartmentIds = [...new Set(bookedRooms.map((room) => String(room.apartmentId)))];
      const apartments = await ApartmentModel.find({ _id: { $in: apartmentIds } })
        .select('owner title')
        .lean();
      const guestName = [booking.firstname, booking.lastname].filter(Boolean).join(' ');
      for (const apartment of apartments) {
        await notificationService.notify({
          userId: (apartment as any).owner,
          type: 'booking_canceled',
          title: 'Booking canceled by guest',
          message: `${guestName} canceled their booking at ${(apartment as any).title} (${dates}).`,
          link: '/host/bookings',
        });
      }
    } else {
      const guest = await User.findOne({ email: booking.email }).select('_id').lean();
      if (guest) {
        await notificationService.notify({
          userId: (guest as any)._id,
          type: 'booking_canceled',
          title: 'Booking declined',
          message: `Unfortunately your booking (${dates}) was declined by the host. You have not been charged.`,
          link: `/my-booking/${booking._id}`,
        });
      }
    }
  })().catch(() => {});

  return new ServiceResponse(ResponseStatus.Success, 'Booking canceled successfully', updatedBooking, StatusCodes.OK);
};

export const bookingService = {
  createBooking,
  getBookings,
  getBooking,
  getUserBookings,
  confirmBooking,
  cancelBooking,
};
