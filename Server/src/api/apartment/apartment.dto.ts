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
    startDate: stringToDate(z.date()),
    endDate: stringToDate(z.date()),
    numberOfGuest: stringToNumber(z.number()).default(1),
    roomNumber: stringToNumber(z.number()).default(1),
    minPrice: stringToFloat(z.number()).default(0),
    maxPrice: stringToFloat(z.number()).default(Number.MAX_VALUE),
  }),
});

export const searchRoomSchema = z.object({
  query: z.object({
    numberOfGuest: stringToNumber(z.number()).optional().default(1),
    roomNumber: stringToNumber(z.number()).optional().default(1),
    province: z.string(),
    limit: stringToNumber(z.number()).optional().default(10),
    page: stringToNumber(z.number()).optional().default(1),
    district: z.string().optional(),
    ward: z.string().optional(),
    street: z.string().optional(),
    startDate: stringToDate(z.date()),
    endDate: stringToDate(z.date()),
    name: z.string().optional(),
    minPrice: stringToFloat(z.number()).optional().default(0),
    maxPrice: stringToFloat(z.number()).optional().default(Number.MAX_VALUE),
  }),
});

const roomSchema = z.object({
  amenities: z.array(z.string()),
  size: stringToNumber(z.number()),
  price: stringToNumber(z.number()),
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
export type CreateRoom = z.infer<typeof roomSchema>;
