import { default as to } from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import mongoose, { Types } from 'mongoose';

import ApartmentModel from '@/api/apartment/apartment.model';
import Room from '@/api/room/room.model';
import type { CreateRoom, UpdateRoom } from '@/api/room/room.dto';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { env } from '@/config/env.config';
const { SERVER_URL } = env;
export const roomService = {
  async addRoomToApartment(apartmentId: string, room: CreateRoom, session: mongoose.ClientSession) {
    try {
      const amenities = room.amenities.map((amenity: any) => new Types.ObjectId(amenity));

      const [err, newRoom] = await to(
        Room.create(
          [
            {
              ...room,
              amenities,
              apartmentId: new Types.ObjectId(apartmentId),
            },
          ],
          { session }
        )
      );

      if (err || !newRoom || newRoom.length === 0) {
        await session.abortTransaction();
        return new ServiceResponse(
          ResponseStatus.Failed,
          'Failed to create room',
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      return new ServiceResponse(
        ResponseStatus.Success,
        'Room added to apartment successfully',
        newRoom[0],
        StatusCodes.OK
      );
    } catch (error) {
      await session.abortTransaction();
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error adding room to apartment',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  },

  async findRoomById(roomId: string) {
    const [err, room] = await to(Room.findById(roomId).populate('amenities').exec());

    if (err) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error finding room', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if (!room) {
      return new ServiceResponse(ResponseStatus.Failed, 'Room not found', null, StatusCodes.NOT_FOUND);
    }

    return new ServiceResponse(ResponseStatus.Success, 'Room found successfully', room, StatusCodes.OK);
  },

  async updateRoom(roomId: string, roomData: UpdateRoom) {
    const [err, updatedRoom] = await to(Room.findByIdAndUpdate(roomId, roomData, { new: true }).exec());

    if (err) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error updating room', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if (!updatedRoom) {
      return new ServiceResponse(ResponseStatus.Failed, 'Room not found', null, StatusCodes.NOT_FOUND);
    }

    return new ServiceResponse(ResponseStatus.Success, 'Room updated successfully', updatedRoom, StatusCodes.OK);
  },

  async deleteRoom(roomId: string) {
    const [err, deletedRoom] = await to(Room.findByIdAndDelete(roomId).exec());

    if (err) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error deleting room', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if (!deletedRoom) {
      return new ServiceResponse(ResponseStatus.Failed, 'Room not found', null, StatusCodes.NOT_FOUND);
    }

    const [errUpdateApartment] = await to(
      ApartmentModel.updateMany({ rooms: roomId }, { $pull: { rooms: roomId } }).exec()
    );

    if (errUpdateApartment) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Failed to update apartment',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return new ServiceResponse(ResponseStatus.Success, 'Room deleted successfully', deletedRoom, StatusCodes.OK);
  },
  async getRoomsByApartmentId(apartmentId: string) {
    // Fetch apartment details (address and description)
    const [apartmentErr, apartment] = await to(ApartmentModel.findById(apartmentId).lean().exec());

    if (apartmentErr || !apartment) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error getting apartment details',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    // Fetch rooms for the apartment
    const [err, rooms] = await to(Room.find({ apartmentId }).populate('amenities').lean().exec());

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

    // Update room images with full URLs
    const updatedRooms = rooms.map((room) => ({
      ...room,
      images: room.images.map((image) => `${SERVER_URL}/api/image/${image}`),
    }));

    // Return the combined data: apartment details and rooms
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
