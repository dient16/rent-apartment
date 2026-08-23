'use client';

import React, { useState } from 'react';
import { Button, Empty, Input, Popconfirm, Progress, Rate, Spin, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';
import { IoShieldCheckmarkOutline, IoStar } from 'react-icons/io5';
import {
   apiDeleteReview,
   apiGetApartmentReviews,
   apiGetReviewEligibility,
   apiUpsertReview,
} from '@/apis';
import { UserAvatar } from '@/components';
import { useAuth } from '@/hooks';

const CATEGORIES = [
   { key: 'staff', label: 'Staff' },
   { key: 'facilities', label: 'Facilities' },
   { key: 'cleanliness', label: 'Cleanliness' },
   { key: 'comfort', label: 'Comfort' },
   { key: 'value', label: 'Value for money' },
   { key: 'location', label: 'Location' },
] as const;

type CategoryScores = Record<string, number>;

interface ReviewItem {
   _id: string;
   rating: number;
   categories: CategoryScores | null;
   comment: string;
   createdAt: string;
   isVerifiedStay: boolean;
   user: {
      _id: string;
      firstname: string;
      lastname: string;
      avatar: string | null;
   };
}

interface ReviewsProps {
   apartmentId: string;
}

const DEFAULT_SCORES: CategoryScores = {
   staff: 5,
   facilities: 5,
   cleanliness: 5,
   comfort: 5,
   value: 5,
   location: 5,
};

const scoreLabel = (score: number) => {
   if (score >= 4.5) return 'Excellent';
   if (score >= 4) return 'Very good';
   if (score >= 3) return 'Good';
   if (score > 0) return 'Fair';
   return 'No reviews yet';
};

const Reviews: React.FC<ReviewsProps> = ({ apartmentId }) => {
   const { isAuthenticated, user, setAuthModal } = useAuth();
   const queryClient = useQueryClient();
   const [visible, setVisible] = useState(4);
   const [formOpen, setFormOpen] = useState(false);
   const [scores, setScores] = useState<CategoryScores>({ ...DEFAULT_SCORES });
   const [comment, setComment] = useState('');

   const { data, isLoading } = useQuery({
      queryKey: ['reviews', apartmentId],
      queryFn: () => apiGetApartmentReviews(apartmentId, { limit: 50 }),
      enabled: !!apartmentId,
   });

   // Only guests who completed a stay may write a review
   const { data: eligibilityData } = useQuery({
      queryKey: ['review-eligibility', apartmentId],
      queryFn: () => apiGetReviewEligibility(apartmentId),
      enabled: !!apartmentId && isAuthenticated,
   });
   const canReview: boolean = eligibilityData?.data?.canReview || false;

   const summary = data?.data;
   const reviews: ReviewItem[] = summary?.reviews || [];
   const myReview = reviews.find((review) => review.user?._id === user?._id);

   // Editing an existing review pre-fills the form
   const [prefilledReviewId, setPrefilledReviewId] = useState<string | undefined>();
   if (myReview && myReview._id !== prefilledReviewId) {
      setPrefilledReviewId(myReview._id);
      setScores({ ...DEFAULT_SCORES, ...(myReview.categories || {}) });
      setComment(myReview.comment);
   }

   const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', apartmentId] });
      queryClient.invalidateQueries({ queryKey: ['apartment'] });
   };

   const overallPreview =
      Math.round(
         (CATEGORIES.reduce((total, { key }) => total + (scores[key] || 0), 0) /
            CATEGORIES.length) *
            10,
      ) / 10;

   const saveMutation = useMutation({
      mutationFn: () =>
         apiUpsertReview({
            apartmentId,
            categories: scores,
            comment: comment.trim(),
         }),
      onSuccess: (response) => {
         if (response.success) {
            message.success(myReview ? 'Review updated' : 'Thanks for your review!');
            setFormOpen(false);
            refresh();
         } else {
            message.error(response.message || 'Cannot save review');
         }
      },
   });

   const deleteMutation = useMutation({
      mutationFn: (reviewId: string) => apiDeleteReview(reviewId),
      onSuccess: (response) => {
         if (response.success) {
            message.success('Review deleted');
            setScores({ ...DEFAULT_SCORES });
            setComment('');
            setFormOpen(false);
            refresh();
         } else {
            message.error(response.message || 'Cannot delete review');
         }
      },
   });

   const handleWriteClick = () => {
      if (!isAuthenticated) {
         message.info('Please sign in to write a review');
         setAuthModal({ isOpen: true, activeTab: 'signin' });
         return;
      }
      if (!canReview && !myReview) {
         message.info('Only guests who have completed a stay can write a review');
         return;
      }
      setFormOpen((open) => !open);
   };

   const average: number = summary?.averageRating || 0;
   const total: number = summary?.totalReviews || 0;
   const distribution: Record<number, number> = summary?.distribution || {};
   const categoryAverages: CategoryScores = summary?.categoryAverages || {};

   return (
      <section className="font-main">
         <div className="flex gap-2 justify-between items-center mb-5">
            <h3 className="flex gap-2 items-center text-xl font-semibold text-gray-900">
               <IoStar className="text-amber-400" />
               {total > 0 ? (
                  <>
                     {average.toFixed(1)} · {total} review{total > 1 ? 's' : ''}
                  </>
               ) : (
                  'Guest reviews'
               )}
            </h3>
            {/* Only shown to guests who completed a stay (or already reviewed) */}
            {isAuthenticated && (canReview || myReview) && (
               <Button
                  type={formOpen ? 'default' : 'primary'}
                  size="large"
                  className={formOpen ? '' : 'bg-blue-500'}
                  onClick={handleWriteClick}
               >
                  {formOpen ? 'Close' : myReview ? 'Edit your review' : 'Write a review'}
               </Button>
            )}
         </div>

         {isLoading ? (
            <div className="flex justify-center py-10">
               <Spin size="large" />
            </div>
         ) : (
            <>
               {/* Summary: overall + star distribution + per-category bars */}
               {total > 0 && (
                  <div className="p-6 mb-6 bg-gray-50 rounded-2xl border border-gray-100">
                     <div className="flex flex-col gap-8 lg:flex-row">
                        <div className="lg:w-72 flex-shrink-0">
                           <div className="flex gap-4 items-center">
                              <span className="flex justify-center items-center w-16 h-16 text-2xl font-bold text-white bg-blue-600 rounded-2xl rounded-br-md">
                                 {average.toFixed(1)}
                              </span>
                              <div>
                                 <p className="text-lg font-semibold text-gray-900">
                                    {scoreLabel(average)}
                                 </p>
                                 <p className="text-sm text-gray-500">
                                    {total} review{total > 1 ? 's' : ''}
                                 </p>
                              </div>
                           </div>
                           <div className="mt-4">
                              {[5, 4, 3, 2, 1].map((star) => (
                                 <div key={star} className="flex gap-3 items-center">
                                    <span className="w-12 text-xs text-gray-500">
                                       {star} star{star > 1 ? 's' : ''}
                                    </span>
                                    <Progress
                                       percent={
                                          total
                                             ? Math.round(((distribution[star] || 0) / total) * 100)
                                             : 0
                                       }
                                       strokeColor="#f59e0b"
                                       size="small"
                                       format={() => (
                                          <span className="text-xs text-gray-400">
                                             {distribution[star] || 0}
                                          </span>
                                       )}
                                    />
                                 </div>
                              ))}
                           </div>
                        </div>

                        {/* Category averages */}
                        {Object.keys(categoryAverages).length > 0 && (
                           <div className="flex-1">
                              <p className="mb-3 text-sm font-semibold text-gray-900">
                                 Rating breakdown
                              </p>
                              <div className="grid grid-cols-1 gap-x-10 gap-y-3 md:grid-cols-2">
                                 {CATEGORIES.map(({ key, label }) => {
                                    const value = categoryAverages[key];
                                    if (typeof value !== 'number') return null;
                                    return (
                                       <div key={key}>
                                          <div className="flex justify-between mb-1 text-sm">
                                             <span className="text-gray-600">{label}</span>
                                             <span className="font-semibold text-gray-900">
                                                {value.toFixed(1)}
                                             </span>
                                          </div>
                                          <Progress
                                             percent={(value / 5) * 100}
                                             strokeColor="#2563eb"
                                             showInfo={false}
                                             size="small"
                                          />
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {/* Write / edit form */}
               {formOpen && (
                  <div className="p-6 mb-6 bg-white rounded-2xl border border-blue-100 shadow-sm">
                     <div className="flex gap-3 justify-between items-center mb-4">
                        <div className="flex gap-3 items-center">
                           <UserAvatar
                              src={user?.avatar}
                              name={`${user?.firstname || ''} ${user?.lastname || ''}`}
                              size={40}
                           />
                           <p className="font-medium text-gray-900">
                              {user?.firstname} {user?.lastname}
                           </p>
                        </div>
                        <span className="flex gap-1.5 items-center px-3 py-1.5 text-sm font-semibold text-blue-700 bg-blue-50 rounded-full">
                           <IoStar className="text-amber-400" />
                           {overallPreview.toFixed(1)} · {scoreLabel(overallPreview)}
                        </span>
                     </div>
                     <div className="grid grid-cols-2 gap-3 mb-4 md:grid-cols-3">
                        {CATEGORIES.map(({ key, label }) => (
                           <div
                              key={key}
                              className="flex flex-col gap-1.5 items-center p-3 bg-gray-50 rounded-xl border border-gray-100 transition-colors hover:border-blue-200"
                           >
                              <span className="text-sm font-medium text-gray-700">
                                 {label}
                              </span>
                              <Rate
                                 value={scores[key]}
                                 className="!text-lg"
                                 onChange={(value) =>
                                    setScores((current) => ({ ...current, [key]: value || 1 }))
                                 }
                              />
                           </div>
                        ))}
                     </div>
                     <Input.TextArea
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        placeholder="Share your experience: cleanliness, location, host..."
                        autoSize={{ minRows: 3, maxRows: 6 }}
                        maxLength={2000}
                        showCount
                     />
                     <div className="flex gap-2 justify-end mt-4">
                        {myReview && (
                           <Popconfirm
                              title="Delete your review?"
                              onConfirm={() => deleteMutation.mutate(myReview._id)}
                              okButtonProps={{ danger: true }}
                           >
                              <Button danger loading={deleteMutation.isPending}>
                                 Delete
                              </Button>
                           </Popconfirm>
                        )}
                        <Button
                           type="primary"
                           className={
                              comment.trim().length < 3
                                 ? '!bg-gray-100 !text-gray-400'
                                 : 'bg-blue-500'
                           }
                           loading={saveMutation.isPending}
                           disabled={comment.trim().length < 3}
                           onClick={() => saveMutation.mutate()}
                        >
                           {myReview ? 'Update review' : 'Submit review'}
                        </Button>
                     </div>
                  </div>
               )}

               {/* Review list */}
               {total === 0 ? (
                  <Empty
                     description="No reviews yet — be the first to share your stay!"
                     className="py-8"
                  />
               ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                     {reviews.slice(0, visible).map((review) => (
                        <div
                           key={review._id}
                           className="flex flex-col gap-3 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm"
                        >
                           <div className="flex gap-3 justify-between items-start">
                              <div className="flex gap-3 items-center min-w-0">
                                 <UserAvatar
                                    src={review.user?.avatar}
                                    name={`${review.user?.firstname || ''} ${review.user?.lastname || 'Guest'}`}
                                    size={42}
                                 />
                                 <div className="min-w-0">
                                    <p className="font-medium text-gray-900 truncate">
                                       {review.user?.firstname} {review.user?.lastname}
                                       {review.user?._id === user?._id && (
                                          <span className="ml-2 text-xs font-normal text-blue-500">
                                             (you)
                                          </span>
                                       )}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                       {moment(review.createdAt).format('MMM D, YYYY')}
                                    </p>
                                 </div>
                              </div>
                              <div className="flex flex-shrink-0 gap-2 items-center">
                                 {review.isVerifiedStay && (
                                    <span className="flex gap-1 items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded-full">
                                       <IoShieldCheckmarkOutline size={13} />
                                       Verified stay
                                    </span>
                                 )}
                                 <span className="flex justify-center items-center px-2 h-7 text-sm font-bold text-white bg-blue-600 rounded-lg rounded-br-sm">
                                    {Number(review.rating).toFixed(1)}
                                 </span>
                              </div>
                           </div>
                           <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-line">
                              {review.comment}
                           </p>
                        </div>
                     ))}
                  </div>
               )}

               {reviews.length > visible && (
                  <div className="flex justify-center mt-6">
                     <Button size="large" onClick={() => setVisible((count) => count + 4)}>
                        Show more reviews
                     </Button>
                  </div>
               )}
            </>
         )}
      </section>
   );
};

export default Reviews;
