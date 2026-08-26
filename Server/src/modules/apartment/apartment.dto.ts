import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { stringToDate, stringToFloat, stringToNumber } from '@/utils/zodTransforms';

import { userDecodeSchema } from '../user/user.dto';
import { locationSchema } from './location.dto';

extendZodWithOpenApi(z);

export const apartmentSchema = z.object({
  title: z.string(),
  description: z.string(),
  location: locationSchema,
  createBy: z.string(),
  rooms: z.array(z.string()).optional(),
  images: z.array(z.string()),
  houseRules: z.array(z.string()).optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  safetyInfo: z.array(z.string()).optional(),
  cancellationPolicy: z.string().optional(),
  discountPolicies: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const getApartmentQuerySchema = z.object({
  params: z.object({ apartmentId: z.string() }),
  query: z.object({
    startDate: stringToDate(z.date()).optional(),
    endDate: stringToDate(z.date()).optional(),
    numberOfGuest: stringToNumber(z.number()).default(1),
    roomNumber: stringToNumber(z.number()).default(1),
    minPrice: stringToFloat(z.number()).default(0),
    maxPrice: stringToFloat(z.number()).default(Number.MAX_VALUE),
  }),
});

export const getOwnerApartmentsSchema = z.object({
  query: z.object({
    page: stringToNumber(z.number().int().min(1)).default(1),
    limit: stringToNumber(z.number().int().min(1).max(50)).default(12),
    search: z.string().trim().default(''),
  }),
});

export const searchRoomSchema = z.object({
  query: z.object({
    numberOfGuest: stringToNumber(z.number()).optional().default(1),
    roomNumber: stringToNumber(z.number()).optional().default(1),
    province: z.string().optional(),
    limit: stringToNumber(z.number().int().min(1).max(50)).optional().default(10),
    page: stringToNumber(z.number().int().min(1)).optional().default(1),
    district: z.string().optional(),
    ward: z.string().optional(),
    street: z.string().optional(),
    startDate: stringToDate(z.date()).optional(),
    endDate: stringToDate(z.date()).optional(),
    name: z.string().optional(),
    minPrice: stringToFloat(z.number()).optional().default(0),
    maxPrice: stringToFloat(z.number()).optional().default(Number.MAX_VALUE),
    bedType: z.string().optional(),
    amenities: z.string().optional(),
    minRating: stringToFloat(z.number()).optional(),
    // "near this place": centre + radius in km (from a geocoder suggestion)
    lat: stringToFloat(z.number().min(-90).max(90)).optional(),
    lng: stringToFloat(z.number().min(-180).max(180)).optional(),
    radius: stringToFloat(z.number().min(0.5).max(100)).optional().default(10),
    sortBy: z.enum(['price_asc', 'price_desc', 'rating', 'distance']).optional().default('price_asc'),
  }),
});

const roomSchema = z.object({
  amenities: z.array(z.string()),
  size: stringToNumber(z.number()),
  price: stringToNumber(z.number().int().min(10000)),
  images: z.array(z.string()),
  roomType: z.string(),
  bedType: z.string().optional(),
  numberOfGuest: stringToNumber(z.number()),
  quantity: stringToNumber(z.number()),
});
export const createApartmentSchema = z.object({
  body: z.object({
    title: z.string(),
    description: z.string(),
    location: locationSchema,
    rooms: z.array(roomSchema),
    houseRules: z.array(z.string()).optional(),
    checkInTime: z.string().optional(),
    checkOutTime: z.string().optional(),
    safetyInfo: z.array(z.string()).optional(),
  }),

  user: userDecodeSchema,
});

export type Apartment = z.infer<typeof apartmentSchema>;
export type SearchRoomType = z.infer<typeof searchRoomSchema>;
export type CreateApartmentType = z.infer<typeof createApartmentSchema>;
export type Location = z.infer<typeof locationSchema>;
export type GetApartmentQuery = z.infer<typeof getApartmentQuerySchema>;
export type GetOwnerApartmentsQuery = z.infer<typeof getOwnerApartmentsSchema>['query'];
export type CreateRoom = z.infer<typeof roomSchema>;
