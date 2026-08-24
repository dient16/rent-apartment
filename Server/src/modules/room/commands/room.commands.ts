import { default as to } from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import mongoose, { Types } from 'mongoose';

import type { CreateRoom, UpdateRoom } from '@/modules/room/room.dto';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { roomRepository } from '../room.repository';

/** Write side: create / update / delete rooms. */
export const roomCommands = {
  async addRoomToApartment(apartmentId: string, room: CreateRoom, session?: mongoose.ClientSession) {
    try {
      const amenities = room.amenities.map((amenity: any) => new Types.ObjectId(amenity));

      const [err, newRoom] = await to(roomRepository.create(apartmentId, room, amenities, session));

      if (err || !newRoom || newRoom.length === 0) {
        await session?.abortTransaction();
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
      await session?.abortTransaction();
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error adding room to apartment',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  },

  async updateRoom(roomId: string, roomData: UpdateRoom) {
    const [err, updatedRoom] = await to(roomRepository.updateById(roomId, roomData));

    if (err) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error updating room', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
    if (!updatedRoom) {
      return new ServiceResponse(ResponseStatus.Failed, 'Room not found', null, StatusCodes.NOT_FOUND);
    }

    return new ServiceResponse(ResponseStatus.Success, 'Room updated successfully', updatedRoom, StatusCodes.OK);
  },

  async deleteRoom(roomId: string) {
    const [err, deletedRoom] = await to(roomRepository.deleteById(roomId));

    if (err) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error deleting room', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
    if (!deletedRoom) {
      return new ServiceResponse(ResponseStatus.Failed, 'Room not found', null, StatusCodes.NOT_FOUND);
    }

    const [errUpdateApartment] = await to(roomRepository.pullRoomFromApartments(roomId));
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
};
