import { StatusCodes } from 'http-status-codes';
import mongoose from 'mongoose';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { logger } from '@/utils/logger';

import { userRepository } from '../user.repository';
import type { User } from '../user.dto';

/** Write side: profile updates and favorite toggling. */
export const userCommands = {
  update: async (id: string, updateData: Partial<User>): Promise<ServiceResponse<User | null>> => {
    try {
      const user = await userRepository.updateById(id, updateData);
      if (!user) {
        return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
      }
      return new ServiceResponse<User>(ResponseStatus.Success, 'User updated successfully', user, StatusCodes.OK);
    } catch (ex) {
      const errorMessage = `Error updating user with id ${id}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  },

  markHostWelcomeSeen: async (userId: string): Promise<ServiceResponse<null>> => {
    try {
      await userRepository.markHostWelcomeSeen(userId);
      return new ServiceResponse(ResponseStatus.Success, 'Host welcome marked as seen', null, StatusCodes.OK);
    } catch (ex) {
      const errorMessage = `Error marking host welcome for user ${userId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  },

  toggleFavorite: async (
    userId: string,
    apartmentId: string
  ): Promise<ServiceResponse<{ favorited: boolean; favorites: string[] } | null>> => {
    try {
      if (!mongoose.Types.ObjectId.isValid(apartmentId)) {
        return new ServiceResponse(ResponseStatus.Failed, 'Invalid apartment id', null, StatusCodes.BAD_REQUEST);
      }

      const apartment = await userRepository.apartmentExists(apartmentId);
      if (!apartment) {
        return new ServiceResponse(ResponseStatus.Failed, 'Apartment not found', null, StatusCodes.NOT_FOUND);
      }

      const user = await userRepository.findFavoritesRaw(userId);
      if (!user) {
        return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
      }

      const alreadyFavorited = (user.favorites as any[]).some((favorite) => favorite.toString() === apartmentId);
      const updatedUser = await userRepository.setFavorite(userId, apartmentId, !alreadyFavorited);

      return new ServiceResponse(
        ResponseStatus.Success,
        alreadyFavorited ? 'Removed from favorites' : 'Added to favorites',
        {
          favorited: !alreadyFavorited,
          favorites: (updatedUser?.favorites as any[]).map((favorite) => favorite.toString()),
        },
        StatusCodes.OK
      );
    } catch (ex) {
      const errorMessage = `Error toggling favorite for user ${userId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  },
};
