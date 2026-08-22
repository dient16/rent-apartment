import axios from './axiosConfig';

export const apiGetApartmentReviews = (
   apartmentId: string,
   params?: { page?: number; limit?: number },
): Promise<Res> =>
   axios({
      url: `/review/apartment/${apartmentId}`,
      method: 'get',
      params,
   });

export const apiGetReviewEligibility = (apartmentId: string): Promise<Res> =>
   axios({
      url: `/review/apartment/${apartmentId}/eligibility`,
      method: 'get',
   });

export const apiUpsertReview = (data: {
   apartmentId: string;
   categories: Record<string, number>;
   comment: string;
}): Promise<Res> =>
   axios({
      url: '/review',
      method: 'post',
      data,
   });

export const apiDeleteReview = (reviewId: string): Promise<Res> =>
   axios({
      url: `/review/${reviewId}`,
      method: 'delete',
   });
