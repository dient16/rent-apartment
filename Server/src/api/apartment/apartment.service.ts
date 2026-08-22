import { default as to } from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import moment from 'moment';
import mongoose, { Types } from 'mongoose';

import RoomModel from '@/api/room/room.model';
import type { Room } from '@/api/room/room.dto';
import User from '@/api/user/user.model';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { env } from '@/config/env.config';

import {
  indexApartment,
  removeApartmentFromIndex,
  searchApartmentIds,
} from '@/services/apartmentSearch.service';

import { roomService } from '../room/room.service';
import ApartmentModel from './apartment.model';
import type { Apartment, GetApartmentQuery } from './apartment.dto';
const { SERVER_URL } = env;

interface PaginatedResult<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

interface Amenity {
  name: string;
  icon: string;
}

interface ApartmentDoc extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  location: {
    street: string;
    ward: string;
    district: string;
    province: string;
  };
  price: number;
  numberOfGuest: number;
  quantity: number;
  amenities: Amenity[];
  rating: {
    ratingAvg: number;
    totalRating: number;
  };
}
export const apartmentService = {
  async getAllApartments() {
    const [err, apartments] = await to(
      ApartmentModel.find({})
        .populate({
          path: 'rooms.services',
        })
        .populate({
          path: 'createBy',
        })
        .exec()
    );

    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error getting apartments',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return new ServiceResponse(ResponseStatus.Success, 'Apartments retrieved successfully', apartments, StatusCodes.OK);
  },
  async getUserApartments(userId: string) {
    const [err, apartments] = await to(
      ApartmentModel.find({ owner: new Types.ObjectId(userId) })
        .populate({
          path: 'rooms.amenities',
        })
        .select('title location')
        .exec()
    );

    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error getting user apartments',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return new ServiceResponse(
      ResponseStatus.Success,
      'User apartments retrieved successfully',
      apartments,
      StatusCodes.OK
    );
  },
  async getPopularRooms(limit: number = 10) {
    const [err, rooms] = await to(
      RoomModel.aggregate([
        {
          $sort: { price: -1, size: -1 },
        },
        {
          $lookup: {
            from: 'apartments',
            localField: 'apartmentId',
            foreignField: '_id',
            as: 'apartment',
          },
        },
        {
          $unwind: '$apartment',
        },
        {
          $group: {
            _id: '$apartment._id',
            roomId: { $first: '$_id' },
            roomType: { $first: '$roomType' },
            price: { $first: '$price' },
            images: { $first: '$images' },
            title: { $first: '$apartment.title' },
            location: { $first: '$apartment.location' },
            avgRating: { $avg: '$reviews.score' },
          },
        },
        {
          $project: {
            roomId: 1,
            roomType: 1,
            price: 1,
            images: {
              $map: {
                input: '$images',
                as: 'image',
                in: { $concat: [`${SERVER_URL}/api/image/`, '$$image'] },
              },
            },
            title: 1,
            'location.province': 1,
            'location.district': 1,
            avgRating: { $ifNull: ['$avgRating', 0] },
          },
        },
        {
          $limit: limit,
        },
      ]).exec()
    );

    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error fetching popular rooms',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return new ServiceResponse(ResponseStatus.Success, 'Popular rooms retrieved successfully', rooms, StatusCodes.OK);
  },
  async getApartmentDetail(apartmentId: string, query: GetApartmentQuery['query']) {
    const { numberOfGuest, roomNumber, minPrice, maxPrice } = query;
    // Khong truyen ngay => mac dinh hom nay -> ngay mai
    const startDate = query.startDate ? moment(query.startDate).toDate() : moment().startOf('day').toDate();
    const endDate =
      query.endDate && moment(query.endDate).isAfter(startDate)
        ? moment(query.endDate).toDate()
        : moment(startDate).add(1, 'day').toDate();

    const [err, apartment] = await to<Apartment | null>(
      ApartmentModel.findById(apartmentId)
        .populate({ path: 'owner', select: 'firstname lastname email avatar' })
        .select('-__v')
        .lean()
        .exec()
    );

    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error retrieving apartment',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    if (!apartment) {
      return new ServiceResponse(ResponseStatus.Failed, 'Apartment not found', null, StatusCodes.NOT_FOUND);
    }

    const roomsQuery = {
      apartmentId,
      numberOfGuest: { $gte: numberOfGuest },
      quantity: { $gte: roomNumber },
      price: { $gte: minPrice, $lte: maxPrice },
      $or: [
        { unavailableDateRanges: { $exists: false } },
        {
          unavailableDateRanges: {
            $not: {
              $elemMatch: {
                startDay: { $lt: endDate },
                endDay: { $gt: startDate },
              },
            },
          },
        },
      ],
    };

    const [roomErr, rooms] = await to<Room[]>(
      RoomModel.find(roomsQuery)
        .populate({ path: 'amenities', select: 'name icon' })
        .select('-apartmentId -__v -unavailableDateRanges')
        .lean()
        .exec()
    );

    if (roomErr) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error retrieving rooms',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const transformedRooms = rooms.map((room) => {
      const images = room.images.map((image: string) => `${SERVER_URL}/api/image/${image}`);
      const amenities = room.amenities.map((amenity: any) => ({
        name: amenity.name,
        icon: `${SERVER_URL}/api/image/${amenity.icon}`,
      }));
      const nights = Math.max(moment(endDate).diff(moment(startDate), 'days'), 1);
      const totalPrice = nights * room.price;
      return { ...room, images, amenities, totalPrice };
    });
    const apartmentWithRooms = {
      ...apartment,
      rooms: transformedRooms,
    };

    return new ServiceResponse(
      ResponseStatus.Success,
      'Apartment retrieved successfully',
      apartmentWithRooms,
      StatusCodes.OK
    );
  },

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
        ApartmentModel.create(
          [
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
          ],
          { session }
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
        const roomResponse = await roomService.addRoomToApartment(apartmentId, room, session);

        if (!roomResponse.success) {
          await session.abortTransaction();
          return roomResponse;
        }

        roomIds.push(roomResponse.data!._id);
      }

      const [errUpdateApartment] = await to(
        ApartmentModel.findByIdAndUpdate(apartmentId, { $set: { rooms: roomIds } }, { new: true, session })
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

      const [errUpdateUser] = await to(
        User.findByIdAndUpdate(createBy, { $push: { createApartments: apartmentId } }, { new: true, session })
      );

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

      const populatedRooms = await RoomModel.find({ _id: { $in: roomIds } }).populate('amenities');

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
  async searchApartments(query: any) {
    const {
      numberOfGuest,
      roomNumber,
      province,
      district,
      startDate,
      endDate,
      name,
      minPrice,
      maxPrice,
      limit,
      page,
      bedType,
      minRating,
      sortBy,
      amenities,
    } = query;

    const amenityList: string[] = String(amenities || '')
      .split(',')
      .map((amenity: string) => amenity.trim())
      .filter(Boolean);

    // Khong truyen ngay => mac dinh hom nay -> ngay mai (duyet tat ca cho con trong)
    const start = startDate ? moment(startDate).toDate() : moment().startOf('day').toDate();
    const end =
      endDate && moment(endDate).isAfter(start) ? moment(endDate).toDate() : moment(start).add(1, 'day').toDate();

    const nights = moment(end).diff(moment(start), 'days');
    const totalNights = nights > 0 ? nights : 1;

    // Loc phong ngay tu dau (dung index {price, numberOfGuest, quantity}):
    // chi nhung phong du cho, con trong trong khoang ngay, va nam trong khoang gia
    const roomMatch: Record<string, unknown> = {
      numberOfGuest: { $gte: numberOfGuest },
      quantity: { $gte: roomNumber },
      price: { $gte: minPrice, $lte: maxPrice },
      unavailableDateRanges: {
        $not: {
          $elemMatch: {
            startDay: { $lte: end },
            endDay: { $gte: start },
          },
        },
      },
    };
    if (bedType) {
      roomMatch.bedType = new RegExp(String(bedType).trim(), 'i');
    }

    // Full-text qua Elasticsearch: chiu duoc go khong dau ("da nang" -> "Đà Nẵng")
    // va sai chinh ta nhe (fuzziness AUTO). Tra ve null khi ES khong chay
    // -> fallback ve regex tren Mongo de search khong bao gio chet.
    const searchText = [province, district, name]
      .filter(Boolean)
      .map((value) => String(value).trim())
      .join(' ');
    const esApartmentIds = searchText ? await searchApartmentIds(searchText) : null;

    if (esApartmentIds !== null) {
      if (esApartmentIds.length === 0) {
        return new ServiceResponse(
          ResponseStatus.Success,
          'Apartments retrieved successfully',
          { page: page || 1, pageResults: 0, totalResults: 0, apartments: [] },
          StatusCodes.OK
        );
      }
      // Thu hep ngay tu stage dau tien bang index apartmentId
      (roomMatch as any).apartmentId = { $in: esApartmentIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }

    // Fallback (ES tat): match substring khong phan biet hoa thuong tren dia chi + ten.
    // ($text cua Mongo match theo TUNG TU nen "Thanh pho Ho Chi Minh" se dinh ca tinh khac)
    const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const apartmentMatch: Record<string, unknown>[] = [];
    if (esApartmentIds === null) {
      if (province) {
        const regex = new RegExp(escapeRegex(String(province).trim()), 'i');
        apartmentMatch.push({
          $or: [
            { 'apartment.location.province': regex },
            { 'apartment.location.district': regex },
            { 'apartment.location.ward': regex },
            { 'apartment.location.street': regex },
            { 'apartment.title': regex },
          ],
        });
      }
      if (district) {
        apartmentMatch.push({ 'apartment.location.district': new RegExp(escapeRegex(String(district).trim()), 'i') });
      }
      if (name) {
        apartmentMatch.push({ 'apartment.title': new RegExp(escapeRegex(String(name).trim()), 'i') });
      }
    }

    // Mot pipeline duy nhat bat dau tu rooms: loc -> gom theo apartment -> join.
    // Sort theo gia truoc khi $group de $first luon la PHONG RE NHAT con trong,
    // nen roomId/price/anh tra ve nhat quan cung mot phong.
    const aggregation: any[] = [
      { $match: roomMatch },
      { $sort: { price: 1, _id: 1 } },
      {
        $group: {
          _id: '$apartmentId',
          roomId: { $first: '$_id' },
          price: { $first: '$price' },
          numberOfGuest: { $first: '$numberOfGuest' },
          quantity: { $first: '$quantity' },
          reviews: { $first: '$reviews' },
          images: { $first: '$images' },
          amenityIds: { $first: '$amenities' },
        },
      },
      {
        $lookup: {
          from: 'apartments',
          localField: '_id',
          foreignField: '_id',
          as: 'apartment',
        },
      },
      { $unwind: '$apartment' },
      ...(apartmentMatch.length ? [{ $match: { $and: apartmentMatch } }] : []),
      {
        $lookup: {
          from: 'amenities',
          localField: 'amenityIds',
          foreignField: '_id',
          as: 'amenities',
        },
      },
      // Loc theo tien nghi (phong dai dien phai co du cac tien nghi da chon)
      ...(amenityList.length
        ? [{ $match: { 'amenities.name': { $all: amenityList.map((amenity) => new RegExp(`^${amenity}$`, 'i')) } } }]
        : []),
      {
        $project: {
          _id: 1,
          roomId: 1,
          name: '$apartment.title',
          address: {
            street: '$apartment.location.street',
            ward: '$apartment.location.ward',
            district: '$apartment.location.district',
            province: '$apartment.location.province',
          },
          image: {
            $concat: [`${SERVER_URL}/api/image/`, { $arrayElemAt: [{ $ifNull: ['$images', []] }, 0] }],
          },
          price: 1,
          numberOfGuest: 1,
          quantity: 1,
          amenities: {
            $map: {
              input: { $slice: ['$amenities', 6] },
              as: 'amenity',
              in: {
                name: '$$amenity.name',
                icon: { $concat: [`${SERVER_URL}/api/image/`, '$$amenity.icon'] },
              },
            },
          },
          rating: {
            ratingAvg: {
              $cond: {
                if: { $gt: [{ $size: { $ifNull: ['$reviews', []] } }, 0] },
                then: { $avg: '$reviews.score' },
                else: 0,
              },
            },
            totalRating: {
              $cond: {
                if: { $gt: [{ $size: { $ifNull: ['$reviews', []] } }, 0] },
                then: { $sum: '$reviews.score' },
                else: 0,
              },
            },
          },
          nights: { $literal: totalNights },
          totalPrice: { $multiply: ['$price', totalNights] },
        },
      },
      // Loc theo diem danh gia toi thieu (tinh sau khi project rating)
      ...(minRating ? [{ $match: { 'rating.ratingAvg': { $gte: minRating } } }] : []),
      // Thu tu on dinh de phan trang khong trung/lap giua cac trang
      {
        $sort:
          sortBy === 'price_desc'
            ? { price: -1 as const, _id: 1 as const }
            : sortBy === 'rating'
              ? { 'rating.ratingAvg': -1 as const, _id: 1 as const }
              : { price: 1 as const, _id: 1 as const },
      },
    ];

    const options = {
      page: page || 1,
      limit: limit || 10,
    };
    const [error, result] = await to<PaginatedResult<ApartmentDoc>>(
      (RoomModel as any).aggregatePaginate(RoomModel.aggregate(aggregation), options)
    );
    if (error) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error searching apartments',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return new ServiceResponse(
      ResponseStatus.Success,
      'Apartments retrieved successfully',
      {
        page: result.page,
        pageResults: result.docs.length,
        totalResults: result.totalDocs,
        apartments: result.docs,
      },
      StatusCodes.OK
    );
  },

  async updateApartment(apartmentId: string, updateData: any, updatedBy: string) {
    const roomsInApartment = updateData.rooms.map((room: any) => {
      return {
        ...room,
        services: room.services.map((service: any) => new mongoose.Types.ObjectId(service)),
      };
    });
    const [err, updatedApartment] = await to(
      ApartmentModel.findByIdAndUpdate(
        apartmentId,
        {
          title: updateData.title,
          updatedBy,
          rooms: roomsInApartment,
          updatedAt: new Date(),
        },
        { new: true }
      )
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
    const [err, deletedApartment] = await to(
      ApartmentModel.findOneAndDelete({
        _id: apartmentId,
        owner: ownerId,
      })
    );

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

    const [errUpdateUser] = await to(
      User.findByIdAndUpdate(ownerId, {
        $pull: { createApartments: apartmentId },
      })
    );

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
      ApartmentModel.findByIdAndUpdate(
        apartmentId,
        {
          $pull: { rooms: { _id: roomId } },
          updatedBy: removedBy,
          updatedAt: new Date(),
        },
        { new: true }
      )
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

  async getRoomsCheckout(roomIds: string[], roomNumbers: string[], query: any) {
    const { startDate, endDate } = query;

    const roomIdsObj = roomIds.map((id) => new mongoose.Types.ObjectId(id));

    const roomNumbersInt = roomNumbers.map((num) => parseInt(num, 10));

    const startDay = new Date(startDate);
    const endDay = new Date(endDate);

    if (Number.isNaN(startDay.getTime()) || Number.isNaN(endDay.getTime())) {
      return new ServiceResponse(ResponseStatus.Failed, 'Invalid start or end date', null, StatusCodes.BAD_REQUEST);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDay < today || endDay < today) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'The start date or end date cannot be earlier than the current date',
        null,
        StatusCodes.BAD_REQUEST
      );
    }

    const pipeline = [
      { $match: { _id: { $in: roomIdsObj } } },
      {
        $lookup: {
          from: 'apartments',
          localField: 'apartmentId',
          foreignField: '_id',
          as: 'apartment',
        },
      },
      { $unwind: '$apartment' },

      {
        $addFields: {
          matchingQuantity: {
            $arrayElemAt: [
              {
                $filter: {
                  input: {
                    $zip: { inputs: [roomIdsObj, roomNumbersInt] },
                  },
                  as: 'pair',
                  cond: { $eq: ['$$pair.0', '$_id'] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $match: {
          $expr: {
            $gte: ['$quantity', { $ifNull: [{ $arrayElemAt: ['$matchingQuantity.1', 0] }, 1] }],
          },
        },
      },
      {
        $project: {
          _id: 0,
          title: '$apartment.title',
          location: '$apartment.location',
          room: {
            _id: '$_id',
            price: '$price',
            size: '$size',
            roomType: '$roomType',
            bedType: '$bedType',
            numberOfGuest: '$numberOfGuest',
            quantity: '$quantity',
            reviews: '$reviews',
          },
        },
      },
      { $limit: roomIds.length },
    ];

    try {
      const result = await RoomModel.aggregate(pipeline).exec();

      if (!result || result.length === 0) {
        return new ServiceResponse(
          ResponseStatus.Failed,
          'Rooms not found or unavailable',
          null,
          StatusCodes.NOT_FOUND
        );
      }

      return new ServiceResponse(
        ResponseStatus.Success,
        'Rooms found',
        {
          title: result[0].title,
          location: result[0].location,
          rooms: result.map(({ room }) => room),
        },
        StatusCodes.OK
      );
    } catch (error) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'An error occurred while retrieving rooms',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  },
  async getApartmentsByUserId(userId: string) {
    const [err, apartments] = await to(
      ApartmentModel.find({ owner: userId })
        .select('title location rooms images')
        .populate({ path: 'rooms', select: 'images price' })
        .lean()
        .exec()
    );

    if (err) {
      return new ServiceResponse(ResponseStatus.Failed, err.message, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    // Chua co can nao van la thanh cong voi danh sach rong (404 lam FE toast loi)
    const withImageUrls = (apartments || []).map((apartment: any) => {
      const rooms = apartment.rooms || [];
      // Apartment khong co anh rieng -> muon anh phong dau tien lam thumbnail
      const rawImages: string[] = apartment.images?.length ? apartment.images : rooms[0]?.images || [];
      const prices = rooms.map((room: any) => room.price).filter((price: number) => typeof price === 'number');
      return {
        ...apartment,
        rooms,
        images: rawImages.map((image: string) =>
          image.startsWith('http') ? image : `${SERVER_URL}/api/image/${image}`
        ),
        minPrice: prices.length ? Math.min(...prices) : null,
      };
    });

    return new ServiceResponse(ResponseStatus.Success, 'Apartments retrieved successfully', withImageUrls, StatusCodes.OK);
  },
};
