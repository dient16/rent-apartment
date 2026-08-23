import axios from './axiosConfig';

export const apiBooking = (data: CreateBooking): Promise<Res> =>
   axios({
      url: '/booking',
      method: 'post',
      data,
   });
export interface BookingListParams {
   page?: number;
   limit?: number;
   status?: string;
   search?: string;
}

export const apiGetMyBookings = (params?: BookingListParams): Promise<Res> =>
   axios({
      url: '/booking',
      method: 'get',
      params,
   });
export const apiGetBooking = (bookingId: string): Promise<Res> =>
   axios({
      url: `/booking/${bookingId}`,
      method: 'get',
   });
export const apiGetUserBookings = (params?: BookingListParams): Promise<Res> =>
   axios({
      url: '/booking/user/bookings',
      method: 'get',
      params,
   });
export const apiConfirmBooking = (bookingId: string): Promise<Res> =>
   axios({
      url: `/booking/${bookingId}/confirm`,
      method: 'post',
   });
export const apiCancelBooking = (bookingId: string): Promise<Res> =>
   axios({
      url: `/booking/${bookingId}/cancel`,
      method: 'post',
   });
