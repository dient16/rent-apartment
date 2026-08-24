import UserModel from '@/modules/user/user.model';

/** All Mongoose access for authentication lives here. */
export const authRepository = {
  findByEmail: (email: string) => UserModel.findOne({ email }),

  findById: (userId: string) => UserModel.findById(userId),

  findByConfirmationToken: (token: string) => UserModel.findOne({ confirmationToken: token }),

  findByIdAndRefreshToken: (userId: string, refreshToken: string) =>
    UserModel.findOne({ _id: userId, refreshToken } as any),

  create: (data: { email: string; confirmationToken: string }) => UserModel.create(data),

  setCredentials: (userId: unknown, refreshToken: string, passwordHash: string) =>
    UserModel.findByIdAndUpdate(userId, { refreshToken, password: passwordHash }, { new: true }).select(
      '-password -refreshToken'
    ),

  setRefreshToken: (userId: unknown, refreshToken: string) =>
    UserModel.findByIdAndUpdate(userId, { refreshToken }, { new: true }),

  clearRefreshToken: (refreshToken: string) =>
    UserModel.findOneAndUpdate({ refreshToken }, { refreshToken: '' }, { new: true }),
};
