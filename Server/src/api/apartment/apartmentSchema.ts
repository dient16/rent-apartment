import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { parseJson, stringToDate, stringToFloat, stringToNumber } from '@/common/utils/helpers';

import { userDecodeSchema } from '../user/userSchema';
import { locationSchema } from './locationSchema';

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
  query: z.object({
    startDate: stringToDate(z.date()).optional(),
    endDate: stringToDate(z.date()).optional(),
    numberOfGuest: stringToNumber(z.number()).optional().default(1),
    roomNumber: stringToNumber(z.number()).optional().default(1),
    minPrice: stringToFloat(z.number()).optional().default(0),
    maxPrice: stringToFloat(z.number()).optional().default(Number.MAX_VALUE),
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
  services: z.array(z.string()),
  description: z.string(),
  size: z.number(),
  price: z.number(),
  roomType: z.string(),
  numberOfGuest: z.number(),
  quantity: z.number(),
});
export const createApartmentSchema = z.object({
  body: z.object({
    title: parseJson(z.string()),
    rooms: parseJson(z.array(roomSchema)),
    location: parseJson(locationSchema),
  }),
  user: userDecodeSchema,
});

export type Apartment = z.infer<typeof apartmentSchema>;
export type SearchRoomType = z.infer<typeof searchRoomSchema>;
export type CreateApartmentType = z.infer<typeof createApartmentSchema>;
export type Location = z.infer<typeof locationSchema>;
export type getApartmentQuery = z.infer<typeof getApartmentQuerySchema>;
export type CreateRoom = z.infer<typeof roomSchema>;
