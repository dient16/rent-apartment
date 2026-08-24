import { z } from 'zod';

export const userSignUpSchema = z.object({
  email: z.string().email(),
});

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
