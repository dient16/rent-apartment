import { default as to } from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { env } from '@/config/env.config';

import { roomRepository } from '../room.repository';

const { SERVER_URL } = env;

/** Read side: room details and per-apartment room listings. */
export const roomQueries = {
  async findRoomById(roomId: string) {
    const [err, room] = await to(roomRepository.findByIdWithAmenities(roomId));

    if (err) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error finding room', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
    if (!room) {
      return new ServiceResponse(ResponseStatus.Failed, 'Room not found', null, StatusCodes.NOT_FOUND);
    }

    return new ServiceResponse(ResponseStatus.Success, 'Room found successfully', room, StatusCodes.OK);
  },

  async getRoomsByApartmentId(apartmentId: string) {
    const [apartmentErr, apartment] = await to(roomRepository.findApartmentLean(apartmentId));

    if (apartmentErr || !apartment) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error getting apartment details',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const [err, rooms] = await to(roomRepository.findByApartmentId(apartmentId));

    if (err) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error getting rooms', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
    if (!rooms || rooms.length === 0) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'No rooms found for this apartment.',
        null,
        StatusCodes.NOT_FOUND
      );
    }

    const updatedRooms = rooms.map((room) => ({
      ...room,
      images: room.images.map((image) => `${SERVER_URL}/api/image/${image}`),
    }));

    return new ServiceResponse(
      ResponseStatus.Success,
      'Rooms retrieved successfully',
      {
        title: (apartment as any).title,
        address: apartment.location,
        description: apartment.description,
        houserules: (apartment as any).houserules || [],
        checkInTime: (apartment as any).checkInTime,
        checkOutTime: (apartment as any).checkOutTime,
        rooms: updatedRooms,
      },
      StatusCodes.OK
    );
  },
};
