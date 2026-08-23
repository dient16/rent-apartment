import axios from './axiosConfig';

export const apiCreateApartment = (data: Apartment): Promise<Res> =>
   axios({
      url: '/apartment',
      method: 'post',
      data,
   });
export const apiSearchRoom = (params: string): Promise<Res> =>
   axios({
      url: `/apartment/search?${params}`,
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
}): Promise<{ data: string; success?: boolean; message?: string }> =>
   axios({
      url: `/payment/create-payment-intent`,
      method: 'post',
      data,
      // The checkout screen shows its own error card with retry / fallback options.
      skipErrorToast: true,
   });
export const apiGetRoomCheckout = ({
   roomIds,
   roomNumbers,
   params,
}: {
   roomIds: string[];
   roomNumbers: number[];
   params: string;
}): Promise<Res> => {
   const roomParams = roomIds
      .map(
         (id, index) =>
            `roomIds[]=${encodeURIComponent(
               id,
            )}&roomNumbers[]=${encodeURIComponent(roomNumbers[index])}`,
      )
      .join('&');

   const url = `/apartment/get-room-checkout?${roomParams}&${params}`;

   return axios({
      url,
      method: 'get',
   });
};
export const apiGetApartmentByUser = (params?: {
   page?: number;
   limit?: number;
   search?: string;
}): Promise<Res> =>
   axios({
      url: `/apartment/by-user`,
      method: 'get',
      params,
   });
export const apiGetApartmentPopular = (): Promise<Res> =>
   axios({
      url: `/apartment/popular-rooms?limit=10`,
      method: 'get',
   });
export const apiGetRoomByApartmentId = (id: string): Promise<Res> =>
   axios({
      url: `/room/apartments/${id}`,
      method: 'get',
   });
export const apiGetPricingByRoomId = (id: string): Promise<Res> =>
   axios({
      url: `/pricing/${id}`,
      method: 'get',
   });
export const apiGetApartmentDetails = (apartmentId: string): Promise<Res> =>
   axios({
      url: `/room/apartments/${apartmentId}`,
      method: 'get',
   });
export const apiUpdatePricing = (
   roomId: string,
   date: string,
   price: number,
): Promise<Res> =>
   axios({
      url: `/pricing`,
      method: 'put',
      data: {
         roomId,
         date,
         price,
      },
   });
