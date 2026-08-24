import fs from 'node:fs/promises';

import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { notificationCommands } from '@/modules/notification/commands/notification.commands';
import { sendMail } from '@/services/mail.service';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import type { Booking as IBooking } from '../booking.dto';
import { bookingRepository } from '../booking.repository';
import { bookingUrl, formatMailDate } from '../booking.shared';

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

    const [roomError, room] = await to(bookingRepository.findRoomById(roomId));
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

    const [updateError] = await to(bookingRepository.pushUnavailableRange(roomId, checkInTime, checkOutTime));
    if (updateError) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error updating room availability',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }

  const [saveError, savedBooking] = await to(
    bookingRepository.create({
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
    } as any)
  );
  if (saveError || !savedBooking) {
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
    .replaceAll('{{bookingId}}', savedBooking._id.toString().slice(-8).toUpperCase())
    .replaceAll('{{bookingUrl}}', bookingUrl(savedBooking._id.toString()))
    .replaceAll('{{checkInTime}}', formatMailDate(checkInTime))
    .replaceAll('{{checkOutTime}}', formatMailDate(checkOutTime))
    .replaceAll('{{totalPrice}}', `${totalPrice.toLocaleString()} VND`);

  const [mailError] = await to(sendMail({ email, html: htmlToSend, subject: 'Booking Confirmation' }));
  if (mailError) {
    return new ServiceResponse(ResponseStatus.Failed, 'Error sending email', null, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // Notify the host(s); never blocks the flow.
  (async () => {
    const roomIds = (savedBooking as any).rooms.map((room: any) => room.roomId);
    const bookedRooms = await bookingRepository.findRoomApartmentIds(roomIds);
    const apartmentIds = [...new Set(bookedRooms.map((room) => String(room.apartmentId)))];
    const apartments = await bookingRepository.findApartmentOwners(apartmentIds);
    const guestName = [firstname, lastname].filter(Boolean).join(' ');
    for (const apartment of apartments) {
      await notificationCommands.notify({
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
const confirmBooking = async (bookingId: string): Promise<ServiceResponse<IBooking | null>> => {
  const [findError, booking] = await to(bookingRepository.findById(bookingId));
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

  // Notify the guest, if the booking email has an account.
  (async () => {
    const guest = await bookingRepository.findUserIdByEmail(booking.email);
    if (guest) {
      await notificationCommands.notify({
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
  const [findUserError, user] = await to(bookingRepository.findUserById(userId));
  if (findUserError || !user) {
    return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
  }

  const [findError, booking] = await to(bookingRepository.findById(bookingId));
  if (findError || !booking) {
    return new ServiceResponse(ResponseStatus.Failed, 'Booking not found', null, StatusCodes.NOT_FOUND);
  }

  // Only the booking owner or the apartment's host may cancel.
  if (booking.email !== user.email) {
    const roomIds = (booking as any).rooms.map((room: any) => room.roomId);
    const [findRoomsError, bookedRooms] = await to(bookingRepository.findRoomApartmentIds(roomIds));
    if (findRoomsError) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error checking rooms', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
    const apartmentIds = [...new Set(bookedRooms.map((room) => String(room.apartmentId)))];
    const [findAptError, ownedCount] = await to(bookingRepository.countOwnedApartments(apartmentIds, userId));
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

  // Guest cancels -> notify host; host declines -> notify guest.
  (async () => {
    const dates = `${new Date(booking.checkInTime).toLocaleDateString('en-GB')} - ${new Date(booking.checkOutTime).toLocaleDateString('en-GB')}`;
    if (canceledByGuest) {
      const roomIds = (booking as any).rooms.map((room: any) => room.roomId);
      const bookedRooms = await bookingRepository.findRoomApartmentIds(roomIds);
      const apartmentIds = [...new Set(bookedRooms.map((room) => String(room.apartmentId)))];
      const apartments = await bookingRepository.findApartmentOwners(apartmentIds);
      const guestName = [booking.firstname, booking.lastname].filter(Boolean).join(' ');
      for (const apartment of apartments) {
        await notificationCommands.notify({
          userId: (apartment as any).owner,
          type: 'booking_canceled',
          title: 'Booking canceled by guest',
          message: `${guestName} canceled their booking at ${(apartment as any).title} (${dates}).`,
          link: '/host/bookings',
        });
      }
    } else {
      const guest = await bookingRepository.findUserIdByEmail(booking.email);
      if (guest) {
        await notificationCommands.notify({
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

/** Write side: create / confirm / cancel bookings (mail + notifications included). */
export const bookingCommands = {
  createBooking,
  confirmBooking,
  cancelBooking,
};
