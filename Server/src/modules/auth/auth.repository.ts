import UserModel from '@/modules/user/user.model';

/** Fields that must never leave the server. */
const SECRET_FIELDS = '-password -refreshToken -confirmationToken -resetPasswordToken -resetPasswordExpires';

/** All Mongoose access for authentication lives here. */
export const authRepository = {
  findByEmail: (email: string) => UserModel.findOne({ email }),

  findById: (userId: string) => UserModel.findById(userId),

  findByConfirmationToken: (token: string) => UserModel.findOne({ confirmationToken: token }),

  /** Only returns the user while the reset token is still valid. */
  findByResetToken: (token: string) =>
    UserModel.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: new Date() } }),

  findByIdAndRefreshToken: (userId: string, refreshToken: string) =>
    UserModel.findOne({ _id: userId, refreshToken } as any),

  create: (data: { email: string; confirmationToken: string }) => UserModel.create(data),

  /** First password after email confirmation: also consumes the confirmation token. */
  setCredentials: (userId: unknown, refreshToken: string, passwordHash: string) =>
    UserModel.findByIdAndUpdate(
      userId,
      { refreshToken, password: passwordHash, $unset: { confirmationToken: 1 } },
      { new: true }
    ).select(SECRET_FIELDS),

  setResetToken: (userId: unknown, token: string, expires: Date) =>
    UserModel.findByIdAndUpdate(userId, { resetPasswordToken: token, resetPasswordExpires: expires }),

  /** Replace the password, consume the reset token and start a fresh session. */
  resetPassword: (userId: unknown, passwordHash: string, refreshToken: string) =>
    UserModel.findByIdAndUpdate(
      userId,
      { password: passwordHash, refreshToken, $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } },
      { new: true }
    ).select(SECRET_FIELDS),

  updatePassword: (userId: unknown, passwordHash: string) =>
    UserModel.findByIdAndUpdate(userId, { password: passwordHash }, { new: true }).select(SECRET_FIELDS),

  setRefreshToken: (userId: unknown, refreshToken: string) =>
    UserModel.findByIdAndUpdate(userId, { refreshToken }, { new: true }),

  clearRefreshToken: (refreshToken: string) =>
    UserModel.findOneAndUpdate({ refreshToken }, { refreshToken: '' }, { new: true }),
};
