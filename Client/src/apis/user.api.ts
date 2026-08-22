import axios from './axiosConfig';

export const apiGetCurrentUser = (): Promise<Res> =>
   axios({
      url: '/user/current-user',
      method: 'get',
      withCredentials: true,
   });
export const apiEditUser = (data: FormData): Promise<Res> =>
   axios({
      url: '/user',
      method: 'put',
      data,
   });
export const apiGetFavorites = (): Promise<Res> =>
   axios({
      url: '/user/favorites',
      method: 'get',
   });
export const apiToggleFavorite = (apartmentId: string): Promise<Res> =>
   axios({
      url: `/user/favorites/${apartmentId}`,
      method: 'post',
   });
export const apiMarkHostWelcomeSeen = (): Promise<Res> =>
   axios({
      url: '/user/host-welcome-seen',
      method: 'post',
   });
