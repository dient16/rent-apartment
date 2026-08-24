import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { logger } from '@/utils/logger';

import { amenityRepository } from '../amenity.repository';
import type { Amenity } from '../amenity.dto';

/** Write side: create / update / delete amenities. */
export const amenityCommands = {
  async createAmenity(name: string, description?: string, icon?: string): Promise<ServiceResponse<Amenity | null>> {
    const [errExisting, existing] = await to(amenityRepository.findByName(name));
    if (errExisting) {
      logger.error('Error finding amenity');
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error finding amenity',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    if (existing) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Amenity with the same name already exists',
        null,
        StatusCodes.BAD_REQUEST
      );
    }

    const [errCreate, newAmenity] = await to(amenityRepository.create({ name, description, icon }));
    if (errCreate) {
      logger.error('Error creating amenity');
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error creating amenity',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return new ServiceResponse<Amenity>(
      ResponseStatus.Success,
      'Amenity created successfully',
      newAmenity,
      StatusCodes.CREATED
    );
  },

  async updateAmenity(
    aid: string,
    name: string,
    description?: string,
    icon?: string
  ): Promise<ServiceResponse<Amenity | null>> {
    const [errFind, amenity] = await to(amenityRepository.findById(aid));
    if (errFind) {
      logger.error('Internal server error');
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Internal server error',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    if (!amenity) {
      return new ServiceResponse(ResponseStatus.Failed, 'Amenity does not exist', null, StatusCodes.NOT_FOUND);
    }

    const [errUpdate, updated] = await to(amenityRepository.updateById(aid, { name, description, icon }));
    if (errUpdate) {
      logger.error('Error updating amenity');
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error updating amenity',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return new ServiceResponse(ResponseStatus.Success, 'Amenity updated successfully', updated, StatusCodes.OK);
  },

  async deleteAmenity(aid: string): Promise<ServiceResponse<Amenity | null>> {
    const [errFind, amenity] = await to(amenityRepository.findById(aid));
    if (errFind) {
      logger.error('Error finding amenity');
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error finding amenity',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }
    if (!amenity) {
      return new ServiceResponse(ResponseStatus.Failed, 'Amenity does not exist', null, StatusCodes.NOT_FOUND);
    }

    const [errDelete] = await to(amenityRepository.deleteById(aid));
    if (errDelete) {
      logger.error('Error deleting amenity');
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error deleting amenity',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    return new ServiceResponse<Amenity>(
      ResponseStatus.Success,
      'Amenity deleted successfully',
      amenity,
      StatusCodes.OK
    );
  },
};
