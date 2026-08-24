import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { env } from '@/config/env.config';
import { logger } from '@/utils/logger';

import { amenityRepository } from '../amenity.repository';
import type { Amenity } from '../amenity.dto';

const { SERVER_URL } = env;

/** Read side: list amenities with absolute icon URLs. */
export const amenityQueries = {
  async getAmenities(): Promise<ServiceResponse<Amenity[] | null>> {
    const [errGet, amenities] = await to(amenityRepository.findAll());
    if (errGet) {
      logger.error(errGet);
      return new ServiceResponse(ResponseStatus.Failed, 'Error getting amenities', null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
    if (!amenities || amenities.length === 0) {
      return new ServiceResponse(ResponseStatus.Failed, 'No amenities found', null, StatusCodes.NOT_FOUND);
    }

    const updatedAmenities = amenities.map((amenity) => ({
      ...amenity.toObject(),
      icon: `${SERVER_URL}/api/image/${amenity.icon}`,
    }));
    return new ServiceResponse<Amenity[]>(
      ResponseStatus.Success,
      'Get amenities successfully',
      updatedAmenities,
      StatusCodes.OK
    );
  },
};
