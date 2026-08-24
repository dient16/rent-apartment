import express from 'express';
import { z } from 'zod';

import { getPricingByRoomId, updatePricing } from '@/modules/pricing/pricing.controller';
import { verifyAccessToken } from '@/middlewares/verifyToken';
import { validateRequest } from '@/utils/httpHandlers';
import { updatePricingSchema } from '@/modules/pricing/pricing.dto';

const router = express.Router();
const getPricingByRoomIdSchema = z.object({
  params: z.object({
    roomId: z.string(),
  }),
});

router.get('/:roomId', verifyAccessToken, validateRequest(getPricingByRoomIdSchema), getPricingByRoomId);

router.put('/', verifyAccessToken, validateRequest(updatePricingSchema), updatePricing);

export const pricingRouter = router;
