import ApartmentModel from '@/modules/apartment/apartment.model';

import UserModel from './user.model';
import type { User } from './user.dto';

/** All Mongoose access for users lives here. */
export const userRepository = {
  findAll: () => UserModel.find().exec(),

  findPublicById: (userId: string) =>
    UserModel.findById(userId)
      .select('-confirmationToken -password -createApartments -emailConfirmed -provider -isAdmin -refreshToken')
      .exec(),

  updateById: (userId: string, data: Partial<User>) => UserModel.findByIdAndUpdate(userId, data, { new: true }).exec(),

  markHostWelcomeSeen: (userId: string) => UserModel.findByIdAndUpdate(userId, { hasSeenHostWelcome: true }).exec(),

  findFavoriteIds: (userId: string) => UserModel.findById(userId).select('favorites').lean().exec(),

  findFavoritesPage: (userId: string, page: number, limit: number) =>
    UserModel.findById(userId)
      .select('favorites')
      .populate({
        path: 'favorites',
        select: 'title location images rooms',
        options: { skip: (page - 1) * limit, limit },
        populate: { path: 'rooms', select: 'price images reviews' },
      })
      .exec(),

  apartmentExists: (apartmentId: string) => ApartmentModel.findById(apartmentId).select('_id').exec(),

  findFavoritesRaw: (userId: string) => UserModel.findById(userId).select('favorites').exec(),

  setFavorite: (userId: string, apartmentId: string, add: boolean) =>
    UserModel.findByIdAndUpdate(
      userId,
      add ? { $addToSet: { favorites: apartmentId } } : { $pull: { favorites: apartmentId } },
      { new: true }
    )
      .select('favorites')
      .exec(),
};
