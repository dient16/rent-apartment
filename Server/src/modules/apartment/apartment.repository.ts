import mongoose, { Types } from 'mongoose';

import AmenityModel from '@/modules/amenity/amenity.model';
import ReviewModel from '@/modules/review/review.model';
import RoomModel from '@/modules/room/room.model';
import type { Room } from '@/modules/room/room.dto';
import User from '@/modules/user/user.model';

import ApartmentModel from './apartment.model';
import type { Apartment } from './apartment.dto';
import type { ApartmentDoc, PaginatedResult } from './apartment.shared';

export const apartmentRepository = {
  findAllPopulated: () =>
    ApartmentModel.find({}).populate({ path: 'rooms.services' }).populate({ path: 'createBy' }).exec(),

  findByOwnerSummary: (userId: string) =>
    ApartmentModel.find({ owner: new Types.ObjectId(userId) })
      .populate({ path: 'rooms.amenities' })
      .select('title location')
      .exec(),

  findDetailById: (apartmentId: string) =>
    ApartmentModel.findById(apartmentId)
      .populate({ path: 'owner', select: 'firstname lastname email avatar' })
      .select('-__v')
      .lean<Apartment | null>()
      .exec(),

  findOwnerPage: (filter: Record<string, unknown>, page: number, limit: number) =>
    Promise.all([
      ApartmentModel.find(filter as any)
        .select('title location rooms images')
        .populate({ path: 'rooms', select: 'images price roomType' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      ApartmentModel.countDocuments(filter as any),
    ]),

  aggregate: (pipeline: mongoose.PipelineStage[]) => ApartmentModel.aggregate(pipeline).exec(),

  create: (data: Record<string, unknown>, session?: mongoose.ClientSession) =>
    ApartmentModel.create([data] as any[], { session }),

  updateById: (apartmentId: unknown, update: Record<string, unknown>, session?: mongoose.ClientSession) =>
    ApartmentModel.findByIdAndUpdate(apartmentId, update, { returnDocument: 'after', session }).exec(),

  deleteOwned: (apartmentId: string, ownerId: string) =>
    ApartmentModel.findOneAndDelete({ _id: apartmentId, owner: ownerId }).exec(),

  findRooms: (filter: Record<string, unknown>) =>
    RoomModel.find(filter as any)
      .populate({ path: 'amenities', select: 'name icon' })
      .select('-apartmentId -__v -unavailableDateRanges')
      .lean<Room[]>()
      .exec(),

  findRoomsByIdsWithAmenities: (roomIds: Types.ObjectId[]) =>
    RoomModel.find({ _id: { $in: roomIds } })
      .populate('amenities')
      .exec(),

  aggregateRooms: (pipeline: mongoose.PipelineStage[]) => RoomModel.aggregate(pipeline).exec(),

  aggregateRoomsPaginated: (pipeline: mongoose.PipelineStage[], options: Record<string, unknown>) =>
    (RoomModel as any).aggregatePaginate(RoomModel.aggregate(pipeline), options) as Promise<
      PaginatedResult<ApartmentDoc>
    >,

  findGlobalAverageRating: () =>
    ReviewModel.aggregate<{ avg: number | null }>([{ $group: { _id: null, avg: { $avg: '$rating' } } }]).exec(),

  findAmenityIdsByNames: (names: RegExp[]) =>
    AmenityModel.find({ name: { $in: names } } as any)
      .select('_id')
      .lean<{ _id: Types.ObjectId }[]>()
      .exec(),

  pushCreatedApartment: (userId: string, apartmentId: unknown, session?: mongoose.ClientSession) =>
    User.findByIdAndUpdate(userId, { $push: { createApartments: apartmentId } }, { returnDocument: 'after', session }).exec(),

  pullCreatedApartment: (userId: string, apartmentId: string) =>
    User.findByIdAndUpdate(userId, { $pull: { createApartments: apartmentId } }).exec(),
};
