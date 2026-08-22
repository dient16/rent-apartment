import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const UserSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  password: z.string().optional(),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.date().optional(),
  nationality: z.string().optional(),
  gender: z.string().optional(),
  personalId: z.string().optional(),
  isAdmin: z.boolean().default(false),
  address: z.string().optional(),
  aboutMe: z.string().optional(),
  favorites: z.array(z.string()).optional(),
  createApartments: z.array(z.string()).optional(),
  confirmationToken: z.string().optional(),
  emailConfirmed: z.boolean().default(false),
  refreshToken: z.string().optional(),
  provider: z.enum(['Email', 'Google', 'Facebook']).default('Email'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const userDecodeSchema = z.object({
  _id: z.string(),
  isAdmin: z.boolean().default(false),
});

export type User = z.infer<typeof UserSchema>;
