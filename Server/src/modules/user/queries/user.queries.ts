import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { logger } from '@/utils/logger';
import { env } from '@/config/env.config';

import { userRepository } from '../user.repository';
import type { User } from '../user.dto';

const { SERVER_URL } = env;

/** Read side: user profiles and favorites. */
export const userQueries = {
  findAll: async (): Promise<ServiceResponse<User[] | null>> => {
    try {
      const users = await userRepository.findAll();
      if (!users || users.length === 0) {
        return new ServiceResponse(ResponseStatus.Failed, 'No Users found', null, StatusCodes.NOT_FOUND);
      }
      return new ServiceResponse<User[]>(ResponseStatus.Success, 'Users found', users, StatusCodes.OK);
    } catch (ex) {
      const errorMessage = `Error finding all users: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  },

  findById: async (id: string): Promise<ServiceResponse<User | null>> => {
    try {
      const user = await userRepository.findPublicById(id);
      if (!user) {
        return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
      }
      let avatarUrl = user.avatar;
      if (!avatarUrl?.startsWith('http')) {
        avatarUrl = `${SERVER_URL}/api/image/${avatarUrl}`;
      }
      return new ServiceResponse<User>(
        ResponseStatus.Success,
        'User found',
        {
          ...user.toObject(),
          avatar: avatarUrl,
        },
        StatusCodes.OK
      );
    } catch (ex) {
      const errorMessage = `Error finding user with id ${id}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  },

  getFavorites: async (
    userId: string,
    { page = 1, limit = 12 }: { page?: number; limit?: number } = {}
  ): Promise<ServiceResponse<any | null>> => {
    try {
      // The raw array lives on the user doc, so count it before populating a page of it.
      const owner = await userRepository.findFavoriteIds(userId);
      if (!owner) {
        return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
      }

      const total = (owner.favorites || []).length;

      const user = await userRepository.findFavoritesPage(userId, page, limit);
      if (!user) {
        return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
      }

      const favorites = (user.favorites as any[]).filter(Boolean).map((apartment) => {
        const rooms = apartment.rooms || [];
        const prices = rooms.map((room: any) => room.price).filter((price: number) => typeof price === 'number');
        const scores = rooms.flatMap((room: any) => (room.reviews || []).map((review: any) => review.score));
        const rawImages: string[] = apartment.images?.length ? apartment.images : rooms[0]?.images || [];

        return {
          _id: apartment._id,
          title: apartment.title,
          location: {
            district: apartment.location?.district,
            province: apartment.location?.province,
          },
          images: rawImages.map((image) => (image.startsWith('http') ? image : `${SERVER_URL}/api/image/${image}`)),
          price: prices.length ? Math.min(...prices) : null,
          avgRating: scores.length
            ? Math.round((scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length) * 10) / 10
            : 0,
        };
      });

      return new ServiceResponse(
        ResponseStatus.Success,
        'Favorites found',
        {
          favorites,
          pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
        },
        StatusCodes.OK
      );
    } catch (ex) {
      const errorMessage = `Error getting favorites for user ${userId}: ${(ex as Error).message}`;
      logger.error(errorMessage);
      return new ServiceResponse(ResponseStatus.Failed, errorMessage, null, StatusCodes.INTERNAL_SERVER_ERROR);
    }
  },
};
