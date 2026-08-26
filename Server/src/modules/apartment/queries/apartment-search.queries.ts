import { default as to } from 'await-to-js';
import { StatusCodes } from 'http-status-codes';
import moment from 'moment';
import mongoose from 'mongoose';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { env } from '@/config/env.config';
import { searchApartmentIds } from '@/services/search';

import { apartmentRepository } from '../apartment.repository';
import { escapeRegex } from '../apartment.shared';

const { SERVER_URL } = env;

/** The search read model: Elasticsearch (or regex fallback) + one aggregation pipeline. */
export const apartmentSearchQueries = {
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
      lat,
      lng,
      radius,
    } = query;

    // A picked geocoder place (lake, market, street...) is searched by distance, not by name:
    // its name is almost never part of a listing's address.
    const near =
      typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)
        ? { lat, lng, radiusKm: radius || 10 }
        : null;

    const amenityList: string[] = String(amenities || '')
      .split(',')
      .map((amenity: string) => amenity.trim())
      .filter(Boolean);

    // Default range: today -> tomorrow.
    const start = startDate ? moment(startDate).toDate() : moment().startOf('day').toDate();
    const end =
      endDate && moment(endDate).isAfter(start) ? moment(endDate).toDate() : moment(start).add(1, 'day').toDate();

    const nights = moment(end).diff(moment(start), 'days');
    const totalNights = nights > 0 ? nights : 1;

    // Filter rooms up front, on the {price, numberOfGuest, quantity} index.
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
      roomMatch.bedType = new RegExp(escapeRegex(String(bedType).trim()), 'i');
    }

    // Amenities are stored as ObjectId refs: resolve the names first so the filter
    // runs on the rooms themselves (any room of the apartment), not only the cheapest one.
    if (amenityList.length) {
      const matchedAmenities = await apartmentRepository.findAmenityIdsByNames(
        amenityList.map((amenity) => new RegExp(`^${escapeRegex(amenity)}$`, 'i'))
      );
      if (matchedAmenities.length < amenityList.length) {
        return new ServiceResponse(
          ResponseStatus.Success,
          'Apartments retrieved successfully',
          { page: Math.max(1, page || 1), pageResults: 0, totalResults: 0, apartments: [] },
          StatusCodes.OK
        );
      }
      roomMatch.amenities = { $all: matchedAmenities.map((amenity) => amenity._id) };
    }

    // "Quy Nhơn, Gia Lai" -> one place per comma part; each must match an address field, in the
    // stored (pre-2025) names or in `location.current` (post-2025), so both "Bình Định" and
    // "Gia Lai" find the same listings.
    const places: string[] = near
      ? []
      : [
          ...String(province || '')
            .split(',')
            .map((part) => part.trim())
            .filter((part) => part.length >= 2),
          ...(district ? [String(district).trim()] : []),
        ];

    // The search backend handles unaccented input and typos; null = fall back to regex.
    const searchText = name ? String(name).trim() : '';
    const esApartmentIds = searchText || places.length ? await searchApartmentIds(searchText, 500, places) : null;

    if (esApartmentIds !== null) {
      if (esApartmentIds.length === 0) {
        return new ServiceResponse(
          ResponseStatus.Success,
          'Apartments retrieved successfully',
          { page: Math.max(1, page || 1), pageResults: 0, totalResults: 0, apartments: [] },
          StatusCodes.OK
        );
      }
      // Narrow the first stage on the apartmentId index.
      (roomMatch as any).apartmentId = { $in: esApartmentIds.map((id: string) => new mongoose.Types.ObjectId(id)) };
    }

    // Fallback: substring match, since Mongo $text matches per word and over-hits.
    const apartmentMatch: Record<string, unknown>[] = [];
    if (near) {
      // Bounding box around the point (1 deg lat = 111 km); the exact distance is
      // projected below for sorting and display.
      const dLat = near.radiusKm / 111;
      const dLng = near.radiusKm / (111 * Math.cos((near.lat * Math.PI) / 180));
      apartmentMatch.push({
        'apartment.location.lat': { $gte: near.lat - dLat, $lte: near.lat + dLat },
        'apartment.location.long': { $gte: near.lng - dLng, $lte: near.lng + dLng },
      });
    }
    if (esApartmentIds === null) {
      // Each place must match some address field (stored or current name) or the title.
      for (const place of places) {
        const regex = new RegExp(escapeRegex(place), 'i');
        apartmentMatch.push({
          $or: [
            { 'apartment.location.province': regex },
            { 'apartment.location.district': regex },
            { 'apartment.location.ward': regex },
            { 'apartment.location.street': regex },
            { 'apartment.location.current.province': regex },
            { 'apartment.location.current.ward': regex },
            { 'apartment.title': regex },
          ],
        });
      }
      if (name) {
        apartmentMatch.push({ 'apartment.title': new RegExp(escapeRegex(String(name).trim()), 'i') });
      }
    }

    // rooms: filter -> group -> join. Sort before $group so $first is the cheapest room.
    const aggregation: mongoose.PipelineStage[] = [
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
          // Coordinates power the "explore on map" view on the client
          coords: {
            lat: '$apartment.location.lat',
            long: '$apartment.location.long',
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
          ...(near
            ? {
                // equirectangular approximation - plenty for a few km
                distanceKm: {
                  $round: [
                    {
                      $sqrt: {
                        $add: [
                          { $pow: [{ $multiply: [{ $subtract: ['$apartment.location.lat', near.lat] }, 111] }, 2] },
                          {
                            $pow: [
                              {
                                $multiply: [
                                  { $subtract: ['$apartment.location.long', near.lng] },
                                  111 * Math.cos((near.lat * Math.PI) / 180),
                                ],
                              },
                              2,
                            ],
                          },
                        ],
                      },
                    },
                    1,
                  ],
                },
              }
            : {}),
        },
      },
      // Radius is a circle, the pre-filter above was its bounding square.
      ...(near ? [{ $match: { distanceKm: { $lte: near.radiusKm } } }] : []),
      // Minimum rating, after rating is projected.
      ...(minRating ? [{ $match: { 'rating.ratingAvg': { $gte: minRating } } }] : []),
      // Stable order so pagination never duplicates or skips.
      {
        $sort:
          sortBy === 'price_desc'
            ? { price: -1 as const, _id: 1 as const }
            : sortBy === 'rating'
              ? { 'rating.ratingAvg': -1 as const, _id: 1 as const }
              : sortBy === 'distance' && near
                ? { distanceKm: 1 as const, _id: 1 as const }
                : { price: 1 as const, _id: 1 as const },
      },
    ];

    const options = {
      page: page || 1,
      limit: limit || 10,
      // The facet optimization hoists every $match before the $facet, which breaks
      // matches on fields created later in the pipeline (rating, joined apartment)
      // and counts rooms instead of grouped apartments (phantom extra pages).
      useFacet: false,
    };
    const [error, result] = await to(apartmentRepository.aggregateRoomsPaginated(aggregation, options));
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
};
