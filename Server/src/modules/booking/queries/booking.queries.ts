import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { logger } from '@/utils/logger';
import { escapeRegex } from '@/utils/regex';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { env } from '@/config/env.config';

import { bookingRepository } from '../booking.repository';
import type { BookingListQuery } from '../booking.shared';

const { SERVER_URL } = env;

const getUserBookings = async (
  userId: string,
  { page = 1, limit = 10, status = 'all', search = '' }: BookingListQuery = {}
) => {
  try {
    // Apartments owned by the user.
    const apartments = await bookingRepository.findOwnedApartments(userId);
    if (!apartments.length) {
      return new ServiceResponse(
        ResponseStatus.Success,
        'No bookings found',
        {
          bookings: [],
          counts: {},
          stats: { revenue: 0, pending: 0, upcoming: 0, total: 0 },
          pagination: { page, limit, total: 0, totalPages: 1 },
        },
        StatusCodes.OK
      );
    }

    // Rooms in those apartments.
    const rooms = await bookingRepository.findRoomsInApartments(apartments.map((apartment) => apartment._id));

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
      bookingRepository.countsByStatus(baseFilter),
      bookingRepository.hostStats(baseFilter),
      bookingRepository.count(filter),
      bookingRepository.findHostBookingsPage(filter, page, limit),
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
const getBookings = async (
  userId: string,
  { page = 1, limit = 10, status = 'all' }: BookingListQuery = {}
): Promise<ServiceResponse<any>> => {
  const [errFindUser, user] = await to(bookingRepository.findUserById(userId));
  if (errFindUser || !user) {
    return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
  }

  const baseFilter: Record<string, any> = { email: user.email };
  const filter = status === 'all' ? baseFilter : { ...baseFilter, status };

  const [errCount, countRows] = await to(bookingRepository.countsByStatus(baseFilter));

  const [errTotal, total] = await to(bookingRepository.count(filter));

  const [errFindBookings, bookings] = await to(bookingRepository.findGuestBookingsPage(filter, page, limit));

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
  const [err, booking] = await to(bookingRepository.findDetailById(bookingId));

  if (err || !booking) {
    return new ServiceResponse(ResponseStatus.Failed, 'Booking not found', null, StatusCodes.NOT_FOUND);
  }

  const apartmentIds = booking.rooms.map((room: any) => room.roomId.apartmentId);
  const uniqueApartmentIds = [...new Set(apartmentIds)];

  const [errApartments, apartments] = await to(bookingRepository.findApartmentsWithOwnerContact(uniqueApartmentIds));

  if (errApartments || apartments.length === 0) {
    return new ServiceResponse(ResponseStatus.Failed, 'Apartments not found', null, StatusCodes.NOT_FOUND);
  }
  const apartment = apartments.find(
    (ap) => ap._id.toString() === (booking.rooms[0] as any).roomId.apartmentId.toString()
  );
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

/** Read side: host dashboard list, guest list, booking detail. */
export const bookingQueries = {
  getBookings,
  getBooking,
  getUserBookings,
};
