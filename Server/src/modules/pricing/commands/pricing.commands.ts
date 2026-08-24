import { default as to } from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { pricingRepository } from '../pricing.repository';
import type { Pricing } from '../pricing.dto';

/** Write side: per-date price overrides. */
export const pricingCommands = {
  async updatePricing(roomId: string, date: Date, price: number) {
    const [err, existingPricing] = await to(pricingRepository.upsertPrice(roomId, date, price));

    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error updating pricing',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    if (!existingPricing) {
      return new ServiceResponse(ResponseStatus.Failed, 'Failed to update pricing', null, StatusCodes.NOT_FOUND);
    }

    return new ServiceResponse<Pricing>(
      ResponseStatus.Success,
      'Pricing updated successfully',
      existingPricing,
      StatusCodes.OK
    );
  },
};
