import mongoose, { Types } from 'mongoose';

import ApartmentModel from '@/modules/apartment/apartment.model';

import RoomModel from './room.model';
import type { CreateRoom, UpdateRoom } from './room.dto';

/** All Mongoose access for rooms lives here. */
export const roomRepository = {
  create: (apartmentId: string, room: CreateRoom, amenities: Types.ObjectId[], session?: mongoose.ClientSession) =>
    RoomModel.create(
      [
        {
          ...room,
          amenities,
          apartmentId: new Types.ObjectId(apartmentId),
        },
      ] as any[], // the model type comes from the request DTO, where ids are strings
      { session }
    ),

  findByIdWithAmenities: (roomId: string) => RoomModel.findById(roomId).populate('amenities').exec(),

  updateById: (roomId: string, data: UpdateRoom) => RoomModel.findByIdAndUpdate(roomId, data, { returnDocument: 'after' }).exec(),

  deleteById: (roomId: string) => RoomModel.findByIdAndDelete(roomId).exec(),

  pullRoomFromApartments: (roomId: string) =>
    ApartmentModel.updateMany({ rooms: roomId }, { $pull: { rooms: roomId } }).exec(),

  findApartmentLean: (apartmentId: string) => ApartmentModel.findById(apartmentId).lean().exec(),

  findByApartmentId: (apartmentId: string) => RoomModel.find({ apartmentId }).populate('amenities').lean().exec(),
};
