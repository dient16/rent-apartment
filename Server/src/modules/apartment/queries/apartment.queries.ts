import { default as to } from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import moment from 'moment';
import mongoose, { Types } from 'mongoose';

import ReviewModel from '@/modules/review/review.model';
import RoomModel from '@/modules/room/room.model';
import type { Room } from '@/modules/room/room.dto';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { env } from '@/config/env.config';

import ApartmentModel from '../apartment.model';
import type { Apartment, GetApartmentQuery, GetOwnerApartmentsQuery } from '../apartment.dto';
import { escapeRegex } from '../apartment.shared';

const { SERVER_URL } = env;

/**
 * Read side. The aggregation pipelines ARE the read models here — each query
 * handler owns its own projection instead of going through a generic repository.
 */
export const apartmentQueries = {
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
  /** Bayesian average: one 5-star review must not outrank fifty 4.8s. */
  async getPopularRooms(limit: number = 10) {
    const PRIOR_WEIGHT = 5;
    const FALLBACK_RATING = 4;
    const safeLimit = Math.min(Math.max(limit, 1), 50);

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
    // Default range: today -> tomorrow.
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
  async getRoomsCheckout(roomIds: string[], roomNumbers: string[], query: any) {
    const { startDate, endDate } = query;

    const roomIdsObj = roomIds.map((id: string) => new mongoose.Types.ObjectId(id));

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
  async getApartmentsByUserId(
    userId: string,
    { page = 1, limit = 12, search = '' }: Partial<GetOwnerApartmentsQuery> = {}
  ) {
    const filter: Record<string, any> = { owner: userId };

    if (search.trim()) {
      const keyword = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [{ title: keyword }, { 'location.province': keyword }, { 'location.district': keyword }];
    }

    const skip = (page - 1) * limit;

    const [err, result] = await to(
      Promise.all([
        ApartmentModel.find(filter)
          .select('title location rooms images')
          // Rooms ship with the apartment so the host calendar needs one request.
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

    // Empty list is a success; a 404 would make the FE toast an error.
    const withImageUrls = (apartments || []).map((apartment: any) => {
      const rooms = (apartment.rooms || []).map((room: any) => ({
        ...room,
        images: (room.images || []).map(toImageUrl),
      }));
      // No apartment image -> use the first room image as thumbnail.
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
