import { z } from 'zod';

import { commonValidations } from '@/utils/commonValidation';

const categoryScore = z.coerce.number().int().min(1).max(5);

export const upsertReviewSchema = z.object({
  body: z.object({
    apartmentId: commonValidations.id,
    categories: z.object({
      staff: categoryScore,
      facilities: categoryScore,
      cleanliness: categoryScore,
      comfort: categoryScore,
      value: categoryScore,
      location: categoryScore,
    }),
    comment: z.string().trim().min(3, 'Comment is too short').max(2000),
  }),
});

export const getApartmentReviewsSchema = z.object({
  params: z.object({
    apartmentId: commonValidations.id,
  }),
  // validateRequest reassigns req.query from the parsed result — keep it
  query: z.object({ page: z.string().optional(), limit: z.string().optional() }).passthrough(),
});

export const deleteReviewSchema = z.object({
  params: z.object({
    reviewId: commonValidations.id,
  }),
});
