import axios from './axiosConfig';

export const apiBooking = (data: CreateBooking): Promise<Res> =>
   axios({
      url: '/booking',
      method: 'post',
      data,
   });
export const apiGetMyBookings = (): Promise<Res> =>
   axios({
      url: '/booking',
      method: 'get',
   });
export const apiGetBooking = (bookingId: string): Promise<Res> =>
   axios({
      url: `/booking/${bookingId}`,
      method: 'get',
   });
export const apiGetUserBookings = (): Promise<Res> =>
   axios({
      url: '/booking/user/bookings',
      method: 'get',
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
