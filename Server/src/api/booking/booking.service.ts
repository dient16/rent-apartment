import fs from 'node:fs/promises';

import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import Apartment from '@/api/apartment/apartment.model';
import User, { User as IUser } from '@/api/user/user.model';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { sendMail } from '@/services/mail.service';

import Booking, { IBooking } from './booking.model';
import RoomModel from '../room/room.model';
import BookingModel from './booking.model';
import { env } from '@/config/env.config';
import ApartmentModel from '@/api/apartment/apartment.model';
const { SERVER_URL } = env;

const getUserBookings = async (userId: string) => {
  try {
    // Step 1: Find all apartments owned by the user
    const apartments = await ApartmentModel.find({ owner: userId }).exec();
    if (!apartments.length) {
      return new ServiceResponse(ResponseStatus.Success, 'No bookings found', [], StatusCodes.OK);
    }

    // Step 2: Find all rooms in those apartments
    const rooms = await RoomModel.find({ apartmentId: { $in: apartments.map((apartment) => apartment._id) } }).exec();

    // Step 3: Find all bookings related to those rooms
    const bookings = await BookingModel.find({
      'rooms.roomId': { $in: rooms.map((room) => room._id) },
    }).exec();

    return new ServiceResponse(ResponseStatus.Success, 'Bookings retrieved successfully', bookings, StatusCodes.OK);
  } catch (error) {
    console.error('Error retrieving user bookings:', error);
    return new ServiceResponse(
      ResponseStatus.Failed,
      'Error retrieving bookings',
      null,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};

const createBooking = async (bookingData: Partial<IBooking>): Promise<ServiceResponse<IBooking>> => {
  const { email, firstname, lastname, phone, arrivalTime, checkInTime, checkOutTime, totalPrice, rooms } = bookingData;

  if (!email || !rooms || rooms.length === 0 || !totalPrice || !checkInTime || !checkOutTime) {
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

    room.unavailableDateRanges.push({
      startDay: checkInTime,
      endDay: checkOutTime,
    });

    const [updateError] = await to(room.save());
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
    rooms: bookingData.rooms.map((roomData: { roomId: string; roomNumber: number }) => ({
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
    .replace('{{firstname}}', firstname)
    .replace('{{lastname}}', lastname)
    .replace('{{bookingId}}', newBooking._id.toString())
    .replace('{{checkInTime}}', checkInTime.toString())
    .replace('{{checkOutTime}}', checkOutTime.toString())
    .replace('{{totalPrice}}', `${totalPrice.toLocaleString()} VND`);

  const [mailError] = await to(sendMail({ email, html: htmlToSend, subject: 'Booking Confirmation' }));
  if (mailError) {
    return new ServiceResponse(ResponseStatus.Failed, 'Error sending email', null, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  return new ServiceResponse(ResponseStatus.Success, 'Booking successfully created', savedBooking, StatusCodes.CREATED);
};
const getBookings = async (userId: string): Promise<ServiceResponse> => {
  const [errFindUser, user] = await to(User.findById(userId).lean().exec());
  if (errFindUser || !user) {
    return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
  }

  const [errFindBookings, bookings] = await to(
    BookingModel.find({ email: user.email })
      .populate({
        path: 'rooms.roomId',
        select: 'roomType price amenities size images',
        model: RoomModel,
      })
      .lean()
      .exec()
  );

  if (errFindBookings) {
    return new ServiceResponse(
      ResponseStatus.Failed,
      'Error finding bookings',
      null,
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  const filteredBookingDetails = bookings.map((booking) => ({
    _id: booking._id,
    email: booking.email,
    firstname: booking.firstname,
    lastname: booking.lastname,
    phone: booking.phone,
    rooms: booking.rooms.map((room) => ({
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

  return new ServiceResponse(
    ResponseStatus.Success,
    'Bookings retrieved successfully',
    filteredBookingDetails,
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

  const apartmentIds = booking.rooms.map((room) => room.roomId.apartmentId);
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
  const apartment = apartments.find((ap) => ap._id.toString() === booking.rooms[0].roomId.apartmentId.toString());
  const bookingDetails = {
    _id: booking._id,
    checkIn: booking.checkInTime,
    checkOut: booking.checkOutTime,
    totalPrice: booking.totalPrice,
    apartmentName: apartment ? apartment.title : 'Unknown',
    address: apartment ? apartment.location : {},
    contact: apartment ? apartment.owner : {},
    rooms: booking.rooms.map((room) => {
      return {
        roomId: room.roomId._id,
        roomType: room.roomId.roomType,
        roomNumber: room.roomNumber,
        size: room.roomId.size,
        price: room.roomId.price,
        bedType: room.roomId.bedType,
        images: room.roomId.images.map((image) => `${process.env.SERVER_URL}/api/image/${image}`),
      };
    }),
  };

  return new ServiceResponse(ResponseStatus.Success, 'Booking retrieved successfully', bookingDetails, StatusCodes.OK);
};
const confirmBooking = async (bookingId: string): Promise<ServiceResponse<IBooking>> => {
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
    .replace('{{firstname}}', booking.firstname)
    .replace('{{lastname}}', booking.lastname)
    .replace('{{bookingId}}', booking._id.toString())
    .replace('{{checkInTime}}', booking.checkInTime.toString())
    .replace('{{checkOutTime}}', booking.checkOutTime.toString())
    .replace('{{totalPrice}}', `${booking.totalPrice.toLocaleString()} VND`);

  const [mailError] = await to(sendMail({ email: booking.email, html: htmlToSend, subject: 'Booking Confirmed' }));
  if (mailError) {
    return new ServiceResponse(ResponseStatus.Failed, 'Error sending email', null, StatusCodes.INTERNAL_SERVER_ERROR);
  }

  return new ServiceResponse(ResponseStatus.Success, 'Booking successfully confirmed', updatedBooking, StatusCodes.OK);
};

export const bookingService = {
  createBooking,
  getBookings,
  getBooking,
  getUserBookings,
  confirmBooking,
};
