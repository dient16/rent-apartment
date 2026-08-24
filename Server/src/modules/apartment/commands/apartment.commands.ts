import { default as to } from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import mongoose, { Types } from 'mongoose';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { indexApartment, removeApartmentFromIndex } from '@/services/search';

import { roomCommands } from '../../room/commands/room.commands';
import { apartmentRepository } from '../apartment.repository';

export const apartmentCommands = {
  async createApartment(createBy: string, body: any) {
    const {
      title,
      description,
      location,
      rooms,
      houseRules,
      checkInTime,
      checkOutTime,
      safetyInfo,
      cancellationPolicy,
      discounts,
    } = body;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const [errApartment, newApartment] = await to(
        apartmentRepository.create(
          {
            title,
            description,
            location,
            owner: createBy,
            rooms: [],
            images: [],
            houseRules,
            checkInTime,
            checkOutTime,
            safetyInfo,
            cancellationPolicy,
            discounts,
          },
          session
        )
      );

      if (errApartment || !newApartment || newApartment.length === 0) {
        await session.abortTransaction();
        return new ServiceResponse(
          ResponseStatus.Failed,
          'Failed to create apartment',
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      const apartmentId = newApartment[0]._id;
      const roomIds: Types.ObjectId[] = [];

      for (const room of rooms) {
        const roomResponse = await roomCommands.addRoomToApartment(apartmentId.toString(), room, session);

        if (!roomResponse.success) {
          await session.abortTransaction();
          return roomResponse;
        }

        roomIds.push(roomResponse.data!._id);
      }

      const [errUpdateApartment] = await to(
        apartmentRepository.updateById(apartmentId, { $set: { rooms: roomIds } }, session)
      );

      if (errUpdateApartment) {
        await session.abortTransaction();
        return new ServiceResponse(
          ResponseStatus.Failed,
          'Failed to update apartment with room IDs',
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      const [errUpdateUser] = await to(apartmentRepository.pushCreatedApartment(createBy, apartmentId, session));

      if (errUpdateUser) {
        await session.abortTransaction();
        return new ServiceResponse(
          ResponseStatus.Failed,
          'Failed to update user',
          null,
          StatusCodes.INTERNAL_SERVER_ERROR
        );
      }

      await session.commitTransaction();
      session.endSession();

      const populatedRooms = await apartmentRepository.findRoomsByIdsWithAmenities(roomIds);

      const response = {
        ...newApartment[0].toObject(),
        rooms: populatedRooms,
      };

      indexApartment(newApartment[0].toObject() as any);

      return new ServiceResponse(ResponseStatus.Success, 'Apartment created successfully', response, StatusCodes.OK);
    } catch (error) {
      try {
        await session.abortTransaction();
      } finally {
        session.endSession();
      }
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error creating apartment',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    } finally {
      session.endSession();
    }
  },
  async updateApartment(apartmentId: string, updateData: any, updatedBy: string) {
    const roomsInApartment = updateData.rooms.map((room: any) => {
      return {
        ...room,
        services: room.services.map((service: any) => new mongoose.Types.ObjectId(service)),
      };
    });
    const [err, updatedApartment] = await to(
      apartmentRepository.updateById(apartmentId, {
        title: updateData.title,
        updatedBy,
        rooms: roomsInApartment,
        updatedAt: new Date(),
      })
    );

    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error updating apartment',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    if (!updatedApartment) {
      return new ServiceResponse(ResponseStatus.Failed, 'Apartment not found', null, StatusCodes.NOT_FOUND);
    }

    indexApartment(updatedApartment.toObject() as any);

    return new ServiceResponse(
      ResponseStatus.Success,
      'Apartment updated successfully',
      updatedApartment,
      StatusCodes.OK
    );
  },
  async deleteApartment(apartmentId: string, ownerId: string) {
    const [err, deletedApartment] = await to(apartmentRepository.deleteOwned(apartmentId, ownerId));

    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error deleting apartment',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    if (!deletedApartment) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Apartment not found or you do not have permission to delete it',
        null,
        StatusCodes.NOT_FOUND
      );
    }

    const [errUpdateUser] = await to(apartmentRepository.pullCreatedApartment(ownerId, apartmentId));

    if (errUpdateUser) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error updating user', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    removeApartmentFromIndex(apartmentId);

    return new ServiceResponse(
      ResponseStatus.Success,
      'Apartment deleted successfully',
      deletedApartment,
      StatusCodes.OK
    );
  },
  async removeRoomFromApartment(apartmentId: string, roomId: string, removedBy: string) {
    const [err, updatedApartment] = await to(
      apartmentRepository.updateById(apartmentId, {
        $pull: { rooms: { _id: roomId } },
        updatedBy: removedBy,
        updatedAt: new Date(),
      })
    );

    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error removing room from apartment',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    if (!updatedApartment) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Apartment not found or you do not have permission to remove a room',
        null,
        StatusCodes.NOT_FOUND
      );
    }

    return new ServiceResponse(
      ResponseStatus.Success,
      'Room removed from apartment successfully',
      updatedApartment,
      StatusCodes.OK
    );
  },
};
