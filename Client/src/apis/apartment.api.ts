import axios from './axiosConfig';

export const apiCreateApartment = (data: Apartment): Promise<Res> =>
   axios({
      url: '/apartment',
      method: 'post',
      data,
   });
export const apiSearchRoom = (params: string): Promise<Res> =>
   axios({
      url: `/apartment/search?limit=4&${params}`,
      method: 'get',
   });
export const apiApartmentDetail = (
   apartmentId: string,
   params: string,
): Promise<Res> =>
   axios({
      url: `/apartment/${apartmentId}?${params}`,
      method: 'get',
   });
export const apiCreateStripePayment = (data: {
   amount: number;
   description?: string;
   source?: string;
}): Promise<{ clientSecret: string }> =>
   axios({
      url: `/apartment/create-stripe-payment`,
      method: 'post',
      data,
   });
export const apiGetRoomCheckout = ({
   roomId,
   params,
}: {
   roomId: string;
   params: string;
}): Promise<Res> =>
   axios({
      url: `/apartment/room/${roomId}?${params}`,
      method: 'get',
   });
export const apiGetApartmentByUser = (): Promise<Res> =>
   axios({
      url: `/apartment/by-user`,
      method: 'get',
   });
export const apiGetApartmentPopular = (): Promise<Res> =>
   axios({
      url: `/apartment/popular-rooms`,
      method: 'get',
   });
