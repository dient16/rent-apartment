import { default as to } from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import PricingModel from './pricing.model';
import type { Pricing } from './pricing.dto';
import RoomModel from '../room/room.model';

export const pricingService = {
  async updatePricing(roomId: string, date: Date, price: number) {
    const [err, existingPricing] = await to(
      PricingModel.findOneAndUpdate({ roomId, date }, { price }, { new: true, upsert: true }).exec()
    );

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
  async getPricingByRoomId(roomId: string) {
    const [err, pricings] = await to(PricingModel.find({ roomId }).exec());

    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error fetching pricings',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const [roomErr, room] = await to(RoomModel.findById(roomId).select('price').exec());

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
