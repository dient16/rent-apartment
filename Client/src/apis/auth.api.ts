import axios from './axiosConfig';

export const apiSignUp = (data: ReqSignUp): Promise<Res> =>
   axios({
      url: '/auth/register',
      method: 'post',
      data,
   });

/** Checks the link from the confirmation email; the page renders the error itself. */
export const apiVerifySetPasswordToken = (
   token: string,
): Promise<Res<{ email: string }>> =>
   axios({
      url: `/auth/set-password/${encodeURIComponent(token)}`,
      method: 'get',
      skipErrorToast: true,
   });

export const apiSetPassword = (data: {
   token: string;
   password: string;
}): Promise<Res> =>
   axios({
      url: '/auth/set-password',
      method: 'post',
      data,
      skipErrorToast: true,
   });

export const apiForgotPassword = (data: { email: string }): Promise<Res> =>
   axios({
      url: '/auth/forgot-password',
      method: 'post',
      data,
      skipErrorToast: true,
   });

/** Checks the link from the reset email; the page renders the error itself. */
export const apiVerifyResetToken = (
   token: string,
): Promise<Res<{ email: string }>> =>
   axios({
      url: `/auth/reset-password/${encodeURIComponent(token)}`,
      method: 'get',
      skipErrorToast: true,
   });

export const apiResetPassword = (data: {
   token: string;
   password: string;
}): Promise<Res> =>
   axios({
      url: '/auth/reset-password',
      method: 'post',
      data,
      skipErrorToast: true,
   });

export const apiChangePassword = (data: {
   currentPassword?: string;
   newPassword: string;
}): Promise<Res> =>
   axios({
      url: '/auth/change-password',
      method: 'post',
      data,
      skipErrorToast: true,
   });

export const apiLogin = (data: ReqSignIn): Promise<Res> =>
   axios({
      url: '/auth/login',
      method: 'post',
      data,
   });
export const apiLoginGoogleSuccess = (data: { userId: string }): Promise<Res> =>
   axios({
      url: `/auth/signin-success/${data.userId}`,
      method: 'get',
   });
export const apiRefreshToken = (): Promise<Res> =>
   axios({
      url: '/auth/refresh-token',
      method: 'post',
   });
export const apiLogout = (): Promise<Res> =>
   axios({
      url: '/auth/logout',
      method: 'get',
   });
