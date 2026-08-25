import { z } from 'zod';

/** Same rule on every screen that creates a password (set / reset / change). */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-zA-Z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

export const userSignUpSchema = z.object({
  email: z.string().email(),
});

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const setPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: passwordSchema,
});
