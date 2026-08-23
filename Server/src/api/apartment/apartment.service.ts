import { default as to } from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import moment from 'moment';
import mongoose, { Types } from 'mongoose';

import ReviewModel from '@/api/review/review.model';
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
import type { Apartment, GetApartmentQuery, GetOwnerApartmentsQuery } from './apartment.dto';
const { SERVER_URL } = env;

/** Escape user input before embedding it in a RegExp. */
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  /**
   * Apartments guests actually liked.
   *
   * Ranking uses a Bayesian average rather than the raw mean, so a place with a single
   * 5-star review does not outrank one with fifty 4.8s: each apartment is padded with
   * PRIOR_WEIGHT imaginary reviews at the site-wide average, and only accumulates real
   * weight as genuine reviews come in.
   */
  async getPopularRooms(limit: number = 10) {
    const PRIOR_WEIGHT = 5;
    const FALLBACK_RATING = 4;
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    // Site-wide mean, used as the prior every apartment starts from.
    const [errAvg, globalRows] = await to(
      ReviewModel.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]).exec()
    );
    if (errAvg) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error fetching popular apartments',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    const priorRating: number = globalRows?.[0]?.avg ?? FALLBACK_RATING;

    const [err, apartments] = await to(
      ApartmentModel.aggregate([
        {
          // Cheapest room doubles as the "from" price and the image fallback.
          $lookup: {
            from: 'rooms',
            let: { apartmentId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$apartmentId', '$$apartmentId'] } } },
              { $sort: { price: 1 } },
              { $limit: 1 },
              { $project: { price: 1, images: 1, roomType: 1 } },
            ],
            as: 'cheapestRoom',
          },
        },
        { $unwind: '$cheapestRoom' },
        {
          $lookup: {
            from: 'reviews',
            let: { apartmentId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$apartment', '$$apartmentId'] } } },
              { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$rating' } } },
            ],
            as: 'reviewStats',
          },
        },
        {
          $addFields: {
            reviewCount: { $ifNull: [{ $first: '$reviewStats.count' }, 0] },
            avgRating: { $round: [{ $ifNull: [{ $first: '$reviewStats.avg' }, 0] }, 1] },
          },
        },
        {
          $addFields: {
            popularity: {
              $divide: [
                {
                  $add: [
                    { $multiply: [{ $ifNull: [{ $first: '$reviewStats.avg' }, 0] }, '$reviewCount'] },
                    priorRating * PRIOR_WEIGHT,
                  ],
                },
                { $add: ['$reviewCount', PRIOR_WEIGHT] },
              ],
            },
          },
        },
        // Nothing to show without a photo, so drop those before ranking.
        {
          $addFields: {
            gallery: {
              $cond: [{ $gt: [{ $size: { $ifNull: ['$images', []] } }, 0] }, '$images', '$cheapestRoom.images'],
            },
          },
        },
        { $match: { 'gallery.0': { $exists: true } } },
        { $sort: { popularity: -1, reviewCount: -1, price: 1, _id: 1 } },
        { $limit: safeLimit },
        {
          $project: {
            _id: 1,
            title: 1,
            'location.province': 1,
            'location.district': 1,
            price: '$cheapestRoom.price',
            roomType: '$cheapestRoom.roomType',
            avgRating: 1,
            reviewCount: 1,
            images: {
              $map: {
                input: { $slice: ['$gallery', 6] },
                as: 'image',
                in: {
                  $cond: [
                    { $regexMatch: { input: '$$image', regex: /^https?:\/\// } },
                    '$$image',
                    { $concat: [`${SERVER_URL}/api/image/`, '$$image'] },
                  ],
                },
              },
            },
          },
        },
      ]).exec()
    );

    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error fetching popular apartments',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return new ServiceResponse(
      ResponseStatus.Success,
      'Popular apartments retrieved successfully',
      apartments,
      StatusCodes.OK
    );
  },
  async getApartmentDetail(apartmentId: string, query: GetApartmentQuery['query']) {
    const { numberOfGuest, roomNumber, minPrice, maxPrice } = query;
    // No dates provided => default to today -> tomorrow
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
          ] as any[], // the model type comes from the request DTO, which has no `owner` field
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
        const roomResponse = await roomService.addRoomToApartment(apartmentId.toString(), room, session);

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

    // No dates => default today -> tomorrow (scan all availability)
    const start = startDate ? moment(startDate).toDate() : moment().startOf('day').toDate();
    const end =
      endDate && moment(endDate).isAfter(start) ? moment(endDate).toDate() : moment(start).add(1, 'day').toDate();

    const nights = moment(end).diff(moment(start), 'days');
    const totalNights = nights > 0 ? nights : 1;

    // Filter rooms up front (uses the {price, numberOfGuest, quantity} index):
    // enough capacity, free in the date range, within the price range
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

    // Full-text via Elasticsearch: tolerates unaccented input ("da nang" -> "Đà Nẵng")
    // and small typos (fuzziness AUTO). Returns null when ES is down
    // -> falls back to Mongo regex so search never dies.
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
      // Narrow the first stage using the apartmentId index
      (roomMatch as any).apartmentId = { $in: esApartmentIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }

    // Fallback (ES off): case-insensitive substring match on address + name.
    // (Mongo $text matches PER WORD, so "Thanh pho Ho Chi Minh" would hit other provinces too)
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

    // Single pipeline starting from rooms: filter -> group by apartment -> join.
    // Sort by price before $group so $first is always the CHEAPEST available room,
    // keeping the returned roomId/price/image consistent.
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
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'apartment',
          as: 'reviewDocs',
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
      // Amenities filter (the representative room must have every selected amenity)
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
                if: { $gt: [{ $size: '$reviewDocs' }, 0] },
                then: { $round: [{ $avg: '$reviewDocs.rating' }, 1] },
                else: 0,
              },
            },
            totalRating: { $size: '$reviewDocs' },
          },
          nights: { $literal: totalNights },
          totalPrice: { $multiply: ['$price', totalNights] },
        },
      },
      // Minimum-rating filter (applied after rating is projected)
      ...(minRating ? [{ $match: { 'rating.ratingAvg': { $gte: minRating } } }] : []),
      // Stable order so pagination never duplicates or skips items
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
  async getApartmentsByUserId(userId: string, { page = 1, limit = 12, search = '' }: Partial<GetOwnerApartmentsQuery> = {}) {
    const filter: Record<string, any> = { owner: userId };

    if (search.trim()) {
      // Reuse the shared escaper so a stray "(" from the search box cannot break the regex.
      const keyword = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ title: keyword }, { 'location.province': keyword }, { 'location.district': keyword }];
    }

    const skip = (page - 1) * limit;

    const [err, result] = await to(
      Promise.all([
        ApartmentModel.find(filter)
          .select('title location rooms images')
          // Rooms come back with the apartment so the host calendar does not need one
          // extra request per apartment to build its room rail.
          .populate({ path: 'rooms', select: 'images price roomType' })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        ApartmentModel.countDocuments(filter),
      ])
    );

    if (err) {
      return new ServiceResponse(ResponseStatus.Failed, err.message, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    const [apartments, total] = result;

    const toImageUrl = (image: string) => (image.startsWith('http') ? image : `${SERVER_URL}/api/image/${image}`);

    // No apartments is still a success with an empty list (a 404 would make the FE toast an error)
    const withImageUrls = (apartments || []).map((apartment: any) => {
      const rooms = (apartment.rooms || []).map((room: any) => ({
        ...room,
        images: (room.images || []).map(toImageUrl),
      }));
      // Apartment has no own images -> borrow the first room image as thumbnail
      const rawImages: string[] = apartment.images?.length ? apartment.images : apartment.rooms?.[0]?.images || [];
      const prices = rooms.map((room: any) => room.price).filter((price: number) => typeof price === 'number');
      return {
        ...apartment,
        rooms,
        images: rawImages.map(toImageUrl),
        minPrice: prices.length ? Math.min(...prices) : null,
      };
    });

    return new ServiceResponse(
      ResponseStatus.Success,
      'Apartments retrieved successfully',
      {
        apartments: withImageUrls,
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      },
      StatusCodes.OK
    );
  },
};
