import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';
import { logger } from '@/utils/logger';

import mongoose from 'mongoose';

import ApartmentModel from '@/api/apartment/apartment.model';

import UserModel from './user.model';
import type { User } from './user.dto';
import { env } from '@/config/env.config';
const { SERVER_URL } = env;
export const userService = {
  findAll: async (): Promise<ServiceResponse<User[] | null>> => {
    try {
      const users = await UserModel.find().exec();
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
      const user = await UserModel.findById(id)
        .select('-confirmationToken -password -createApartments -emailConfirmed -provider -isAdmin -refreshToken')
        .exec();
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

  update: async (id: string, updateData: Partial<User>): Promise<ServiceResponse<User | null>> => {
    try {
      const user = await UserModel.findByIdAndUpdate(id, updateData, {
        new: true,
      }).exec();
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
      await UserModel.findByIdAndUpdate(userId, { hasSeenHostWelcome: true }).exec();
      return new ServiceResponse(ResponseStatus.Success, 'Host welcome marked as seen', null, StatusCodes.OK);
    } catch (ex) {
      const errorMessage = `Error marking host welcome for user ${userId}: ${(ex as Error).message}`;
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
      const owner = await UserModel.findById(userId).select('favorites').lean().exec();

      if (!owner) {
        return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
      }

      const total = (owner.favorites || []).length;

      const user = await UserModel.findById(userId)
        .select('favorites')
        .populate({
          path: 'favorites',
          select: 'title location images rooms',
          options: { skip: (page - 1) * limit, limit },
          populate: { path: 'rooms', select: 'price images reviews' },
        })
        .exec();

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

  toggleFavorite: async (
    userId: string,
    apartmentId: string
  ): Promise<ServiceResponse<{ favorited: boolean; favorites: string[] } | null>> => {
    try {
      if (!mongoose.Types.ObjectId.isValid(apartmentId)) {
        return new ServiceResponse(ResponseStatus.Failed, 'Invalid apartment id', null, StatusCodes.BAD_REQUEST);
      }

      const apartment = await ApartmentModel.findById(apartmentId).select('_id').exec();
      if (!apartment) {
        return new ServiceResponse(ResponseStatus.Failed, 'Apartment not found', null, StatusCodes.NOT_FOUND);
      }

      const user = await UserModel.findById(userId).select('favorites').exec();
      if (!user) {
        return new ServiceResponse(ResponseStatus.Failed, 'User not found', null, StatusCodes.NOT_FOUND);
      }

      const alreadyFavorited = (user.favorites as any[]).some((favorite) => favorite.toString() === apartmentId);
      const updatedUser = await UserModel.findByIdAndUpdate(
        userId,
        alreadyFavorited ? { $pull: { favorites: apartmentId } } : { $addToSet: { favorites: apartmentId } },
        { new: true }
      )
        .select('favorites')
        .exec();

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
