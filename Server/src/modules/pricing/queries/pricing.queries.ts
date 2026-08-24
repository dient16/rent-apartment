import { default as to } from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { pricingRepository } from '../pricing.repository';

/** Read side: calendar pricing per room. */
export const pricingQueries = {
  async getPricingByRoomId(roomId: string) {
    const [err, pricings] = await to(pricingRepository.findByRoomId(roomId));

    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error fetching pricings',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const [roomErr, room] = await to(pricingRepository.findRoomDefaultPrice(roomId));

    if (roomErr || !room) {
      return new ServiceResponse(ResponseStatus.Failed, 'Error fetching default price', null, StatusCodes.NOT_FOUND);
    }

    const responseData = {
      defaultPrice: room.price,
      pricings: pricings || [],
    };

    return new ServiceResponse<typeof responseData>(
      ResponseStatus.Success,
      'Pricings and default price retrieved successfully',
      responseData,
      StatusCodes.OK
    );
  },
};
