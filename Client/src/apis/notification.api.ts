import axios from './axiosConfig';

export const apiGetNotifications = (params?: {
   filter?: 'all' | 'unread' | 'read';
   page?: number;
   limit?: number;
}): Promise<Res> =>
   axios({
      url: '/notification',
      method: 'get',
      params,
   });

export const apiMarkNotificationRead = (notificationId: string): Promise<Res> =>
   axios({
      url: `/notification/${notificationId}/read`,
      method: 'post',
   });

export const apiMarkAllNotificationsRead = (): Promise<Res> =>
   axios({
      url: '/notification/read-all',
      method: 'post',
   });
