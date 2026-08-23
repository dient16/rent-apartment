import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { env } from '@/config/env.config';
import { logger } from '@/utils/logger';

import AmenityModel from './amenity.model';
import type { Amenity } from './amenity.dto';
const { SERVER_URL } = env;
export const amenityService = {
  async createAmenity(name: string, description?: string, icon?: string): Promise<ServiceResponse<Amenity | null>> {
    const [errExistingAmenity, existingAmenity] = await to(AmenityModel.findOne({ name }).exec());

    if (errExistingAmenity) {
      const errorMessage = 'Error finding amenity';
      logger.error(errorMessage);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if (existingAmenity) {
      const errorMessage = 'Amenity with the same name already exists';
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.BAD_REQUEST);
    }

    const [errCreateAmenity, newAmenity] = await to(AmenityModel.create({ name, description, icon }));

    if (errCreateAmenity) {
      const errorMessage = 'Error creating amenity';
      logger.error(errorMessage);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return new ServiceResponse<Amenity>(
      ResponseStatus.Success,
      'Amenity created successfully',
      newAmenity,
      StatusCodes.CREATED
    );
  },

  async getAmenities(): Promise<ServiceResponse<Amenity[] | null>> {
    const [errGetAmenities, amenities] = await to(AmenityModel.find({}).exec());

    if (errGetAmenities) {
      const errorMessage = 'Error getting amenities';
      logger.error(errGetAmenities);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
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

  async updateAmenity(
    aid: string,
    name: string,
    description?: string,
    icon?: string
  ): Promise<ServiceResponse<Amenity | null>> {
    const [errFindAmenity, amenity] = await to(AmenityModel.findById(aid).exec());

    if (errFindAmenity) {
      const errorMessage = 'Internal server error';
      logger.error(errorMessage);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if (!amenity) {
      return new ServiceResponse(ResponseStatus.Failed, 'Amenity does not exist', null, StatusCodes.NOT_FOUND);
    }

    const [errUpdateAmenity, updatedAmenity] = await to(
      AmenityModel.findByIdAndUpdate(aid, { name, description, icon }, { new: true }).exec()
    );

    if (errUpdateAmenity) {
      const errorMessage = 'Error updating amenity';
      logger.error(errorMessage);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return new ServiceResponse(ResponseStatus.Success, 'Amenity updated successfully', updatedAmenity, StatusCodes.OK);
  },

  async deleteAmenity(aid: string): Promise<ServiceResponse<Amenity | null>> {
    const [errFindAmenity, amenity] = await to(AmenityModel.findById(aid).exec());

    if (errFindAmenity) {
      const errorMessage = 'Error finding amenity';
      logger.error(errorMessage);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    if (!amenity) {
      return new ServiceResponse(ResponseStatus.Failed, 'Amenity does not exist', null, StatusCodes.NOT_FOUND);
    }

    const [errDeleteAmenity] = await to(AmenityModel.findByIdAndDelete(aid).exec());

    if (errDeleteAmenity) {
      const errorMessage = 'Error deleting amenity';
      logger.error(errorMessage);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }

    return new ServiceResponse<Amenity>(
      ResponseStatus.Success,
      'Amenity deleted successfully',
      amenity,
      StatusCodes.OK
    );
  },
};
