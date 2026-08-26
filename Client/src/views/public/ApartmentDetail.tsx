'use client';

import React, { useState } from 'react';
import { BookingSummary, FavoriteButton, FullscreenLoader, GoogleMapEmbed, ImageGallery, NavigationBarRoom, Reviews, RoomList, RoomPolices, SearchInfoBar, UserAvatar } from '@/components';
import { Button, Result, message } from 'antd';
import { Controller, useForm, FormProvider } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from '@/lib/router-compat';
import { apiApartmentDetail, apiGetApartmentReviews, apiStartConversation } from '@/apis';
import moment from 'moment';
import { path } from '@/utils/constant';
import icons from '@/utils/icons';
import { IoChatbubbleEllipsesOutline, IoStar } from 'react-icons/io5';
import { useAuth } from '@/hooks';

type RoomValue = {
   roomId: string;
   count: number;
};
const { FaLocationDot } = icons;

const ApartmentDetail: React.FC = () => {
   const { apartmentId } = useParams();
   const [searchParams, setSearchParams] = useSearchParams();
   const navigate = useNavigate();
   const methods = useForm({ mode: 'onChange' });
   const { user, isAuthenticated, setAuthModal } = useAuth();
   const [descriptionExpanded, setDescriptionExpanded] = useState(false);

   const handleMessageHost = async () => {
      if (!isAuthenticated) {
         message.info('Please sign in to message the host');
         setAuthModal({ isOpen: true, activeTab: 'signin' });
         return;
      }
      const ownerId = apartment?.owner?._id;
      if (!ownerId) return;
      const response = await apiStartConversation(ownerId);
      if (response.success && response.data?._id) {
         navigate(`/messages?c=${response.data._id}`);
      } else {
         message.error(response.message || 'Cannot start conversation');
      }
   };

   // isLoading (no data yet) — not isFetching — so server-hydrated data renders on SSR
   const { data: { data: apartment } = {}, isLoading } = useQuery({
      queryKey: ['apartment', apartmentId, searchParams.toString()],
      queryFn: () => apiApartmentDetail(apartmentId, searchParams.toString()),
      staleTime: 0,
   });

   // Same query key as the Reviews section — served from the cache
   const { data: reviewsData } = useQuery({
      queryKey: ['reviews', apartmentId],
      queryFn: () => apiGetApartmentReviews(apartmentId as string, { limit: 50 }),
      enabled: !!apartmentId,
   });
   const averageRating: number = reviewsData?.data?.averageRating || 0;
   const totalReviews: number = reviewsData?.data?.totalReviews || 0;

   const parseDate = (dateString: string | null) => {
      const date = dateString ? moment(dateString, 'YYYY-MM-DD') : undefined;
      return date?.isValid() ? date.toDate() : undefined;
   };

   const startDate = parseDate(searchParams.get('startDate'));
   const endDate = parseDate(searchParams.get('endDate'));
   const numberOfGuest = parseInt(searchParams.get('numberOfGuest') || '1', 10);

   const numberOfDays =
      startDate && endDate
         ? moment(endDate).diff(moment(startDate), 'days')
         : 0;

   // The server rejects this too (403); checking here avoids a dead-end checkout page.
   const isOwner =
      !!user?._id &&
      !!apartment?.owner?._id &&
      String(user._id) === String(apartment.owner._id);

   const selectedRooms = methods.watch('selectedRooms', []);
   const totalRoomCount = selectedRooms.reduce(
      (acc: number, room: RoomValue) => acc + room.count,
      0,
   );
   const handleBooking = (data: any) => {
      if (isOwner) {
         message.warning('You cannot book your own apartment');
         return;
      }
      // Belt-and-braces: the form rule below already blocks this.
      if (totalRoomCount > numberOfGuest) {
         message.warning(
            `You cannot book more rooms (${totalRoomCount}) than guests (${numberOfGuest})`,
         );
         return;
      }

      const queryParams = new URLSearchParams();

      selectedRooms.forEach((room: { roomId: string; count: number }) => {
         queryParams.append('roomIds[]', room.roomId);
         queryParams.append('roomNumbers[]', room.count.toString());
      });

      queryParams.append('numberOfGuest', String(numberOfGuest));
      queryParams.append(
         'startDate',
         moment(data.searchDate[0]).format('YYYY-MM-DD'),
      );
      queryParams.append(
         'endDate',
         moment(data.searchDate[1]).format('YYYY-MM-DD'),
      );

      navigate(`/${path.BOOKING_CONFIRM}?${queryParams.toString()}`);
   };

   const handleDateChange = (dates: [Date, Date]) => {
      if (dates) {
         const params = new URLSearchParams(window.location.search);
         params.set('startDate', moment(dates[0]).format('YYYY-MM-DD'));
         params.set('endDate', moment(dates[1]).format('YYYY-MM-DD'));
         setSearchParams(params);
         methods.setValue('searchDate', dates);
      }
   };

   const scrollToReviews = () => {
      document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
   };

   // Gallery shows every photo of every room (deduped, first room first)
   const galleryImages: string[] = Array.from(
      new Set(
         ((apartment?.rooms || []) as { images?: string[] }[]).flatMap(
            (room) => room.images || [],
         ),
      ),
   );

   const description: string = apartment?.description || '';
   const isLongDescription = description.length > 420;

   return isLoading ? (
      <div className="min-h-screen">
         <FullscreenLoader spinning={isLoading} />
      </div>
   ) : !apartment ? (
      <div className="flex justify-center items-center min-h-screen">
         <Result
            status="500"
            title="500"
            subTitle="Sorry, something went wrong."
            extra={
               <Button
                  size="large"
                  className="bg-blue-500"
                  type="primary"
                  onClick={() => navigate(`/${path.HOME}`)}
               >
                  Back Home
               </Button>
            }
         />
      </div>
   ) : (
      <div className="relative w-full font-main apartment-detail">
         <FormProvider {...methods}>
            <SearchInfoBar
               numberOfGuest={numberOfGuest}
               totalRoomCount={totalRoomCount}
               numberOfNights={numberOfDays}
               startDate={startDate}
               endDate={endDate}
               handleDateChange={handleDateChange}
            />
            <form
               onSubmit={methods.handleSubmit(handleBooking)}
               className="flex flex-col gap-5 justify-center px-4 mx-auto w-full max-w-main pb-20 sm:px-5 lg:px-7 xl:pb-0"
            >
               <ImageGallery images={galleryImages} />
               <div className="flex gap-8 items-start lg:mt-5">
                  <div className="flex flex-col w-full min-w-0">
                     {/* ===== Title + meta ===== */}
                     <div className="flex flex-col gap-2 justify-center mt-3 lg:mt-4">
                        <div className="flex gap-3 justify-between items-start">
                           <h1 className="text-xl font-semibold leading-snug text-gray-900 sm:text-2xl lg:text-3xl">
                              {apartment?.title}
                           </h1>
                           <div className="flex flex-shrink-0 gap-2 items-center">
                              {/* Icon-only on phones; the host card below has the full "Contact host" button */}
                              <button
                                 type="button"
                                 onClick={handleMessageHost}
                                 aria-label="Message host"
                                 className="flex gap-2 justify-center items-center w-10 h-10 text-sm font-medium text-gray-700 bg-white rounded-full border border-gray-300 transition-colors cursor-pointer sm:px-4 sm:w-auto hover:border-blue-500 hover:text-blue-600"
                              >
                                 <IoChatbubbleEllipsesOutline size={17} />
                                 <span className="hidden sm:inline">Message host</span>
                              </button>
                              <FavoriteButton apartmentId={apartmentId as string} />
                           </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-sm text-gray-600">
                           {totalReviews > 0 && (
                              <button
                                 type="button"
                                 onClick={scrollToReviews}
                                 className="flex gap-1.5 items-center cursor-pointer hover:underline"
                              >
                                 <IoStar className="text-amber-400" />
                                 <span className="font-semibold text-gray-900">
                                    {averageRating.toFixed(1)}
                                 </span>
                                 <span className="text-gray-500">
                                    ({totalReviews} review{totalReviews > 1 ? 's' : ''})
                                 </span>
                              </button>
                           )}
                           <span className="flex gap-1 items-center">
                              <FaLocationDot color="#1640D6" size={14} />
                              {[apartment.location.street, apartment.location.ward, apartment.location.district, apartment.location.province].filter(Boolean).join(', ')}
                           </span>
                        </div>
                     </div>

                     <NavigationBarRoom />

                     {/* ===== Amenities ===== */}
                     <div id="overview" className="pt-5 lg:pt-8">
                        <h3 id="amenities" className="text-lg font-semibold text-gray-900 md:text-xl">
                           What this place offers
                        </h3>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 md:grid-cols-3 md:gap-x-8 md:gap-y-3 md:mt-4">
                           {apartment.rooms[0]?.amenities.map(
                              (
                                 amenity: { name: string; icon: string },
                                 index: number,
                              ) => (
                                 <div
                                    className="flex gap-2.5 items-center py-1 min-w-0 text-gray-700 md:gap-3 md:py-1.5"
                                    key={index}
                                 >
                                    <span className="flex flex-shrink-0 justify-center items-center w-10 h-10 bg-gray-100 rounded-xl border border-gray-200 md:w-12 md:h-12">
                                       <img
                                          className="object-contain h-5 md:h-6"
                                          src={amenity.icon}
                                          alt=""
                                       />
                                    </span>
                                    <span className="text-sm truncate md:text-[15px]">{amenity.name}</span>
                                 </div>
                              ),
                           )}
                        </div>
                     </div>

                     {/* ===== Description ===== */}
                     <div className="pt-5 mt-5 border-t border-gray-100 md:pt-6 md:mt-6">
                        <h3 className="mb-2 text-lg font-semibold text-gray-900 md:mb-3 md:text-xl">
                           About this place
                        </h3>
                        <div
                           className={`text-sm leading-relaxed text-gray-600 whitespace-pre-line ${
                              isLongDescription && !descriptionExpanded ? 'line-clamp-6' : ''
                           }`}
                        >
                           {description}
                        </div>
                        {isLongDescription && (
                           <button
                              type="button"
                              onClick={() => setDescriptionExpanded((expanded) => !expanded)}
                              className="mt-2 text-sm font-medium text-blue-600 cursor-pointer hover:underline"
                           >
                              {descriptionExpanded ? 'Show less' : 'Show more'}
                           </button>
                        )}
                     </div>

                     {/* ===== Host ===== */}
                     {apartment.owner && (
                        <div className="flex flex-col gap-3 p-4 mt-5 bg-gray-50 rounded-2xl border border-gray-100 sm:flex-row sm:justify-between sm:items-center sm:p-5 md:mt-6">
                           <div className="flex gap-3 items-center min-w-0 sm:gap-4">
                              <UserAvatar
                                 src={apartment.owner.avatar}
                                 name={`${apartment.owner.firstname || ''} ${apartment.owner.lastname || ''}`}
                                 size={48}
                              />
                              <div className="min-w-0">
                                 <p className="font-semibold text-gray-900 truncate">
                                    Hosted by {apartment.owner.firstname}{' '}
                                    {apartment.owner.lastname}
                                 </p>
                                 <p className="text-sm text-gray-500">
                                    Usually responds within a few hours
                                 </p>
                              </div>
                           </div>
                           <Button
                              size="large"
                              onClick={handleMessageHost}
                              className="flex-shrink-0 w-full rounded-xl sm:w-auto"
                           >
                              Contact host
                           </Button>
                        </div>
                     )}

                     {/* ===== Rooms ===== */}
                     <h3
                        id="rooms"
                        className="pt-5 mt-5 mb-3 text-lg font-semibold text-gray-900 border-t border-gray-100 md:pt-6 md:mt-6 md:mb-4 md:text-xl"
                     >
                        Choose your room
                     </h3>
                     <Controller
                        name="selectedRooms"
                        control={methods.control}
                        defaultValue={[]}
                        rules={{
                           validate: (rooms: RoomValue[] = []) => {
                              const total = rooms.reduce(
                                 (acc, room) => acc + room.count,
                                 0,
                              );
                              if (total < 1) return 'Please select room';
                              if (total > numberOfGuest) {
                                 return `You cannot book more rooms than guests (${numberOfGuest} guest${numberOfGuest > 1 ? 's' : ''})`;
                              }
                              return true;
                           },
                        }}
                        render={({ field }) => (
                           <RoomList
                              roomList={apartment.rooms}
                              value={field.value}
                              onChange={field.onChange}
                              maxTotalRooms={numberOfGuest}
                           />
                        )}
                     />
                  </div>
                  <BookingSummary
                     apartment={apartment}
                     numberOfGuest={numberOfGuest}
                     startDate={startDate}
                     endDate={endDate}
                     numberOfDays={numberOfDays}
                  />
               </div>

               {/* ===== Location ===== */}
               <div className="pt-5 mt-2 border-t border-gray-100 md:pt-6">
                  <h3 id="location" className="mb-3 text-lg font-semibold text-gray-900 md:mb-4 md:text-xl">
                     Where you&apos;ll be
                  </h3>
                  <p className="flex gap-2.5 items-center mb-3 text-sm text-gray-600 md:mb-4">
                     <span className="flex flex-shrink-0 justify-center items-center w-8 h-8 text-blue-600 bg-blue-50 rounded-full">
                        <FaLocationDot size={14} />
                     </span>
                     <span className="leading-snug">
                        {[apartment.location.street, apartment.location.ward, apartment.location.district, apartment.location.province].filter(Boolean).join(', ')}
                     </span>
                  </p>
                  <div className="relative z-0 w-full overflow-hidden rounded-2xl border border-gray-100 shadow-sm h-[240px] sm:h-[300px] lg:h-[480px]">
                     <GoogleMapEmbed
                        lat={apartment.location.lat}
                        lng={apartment.location.long}
                        label={apartment?.title}
                     />
                  </div>
               </div>

               {/* ===== Policies ===== */}
               <div id="policies" className="pt-5 mt-3 border-t border-gray-100 md:pt-6 md:mt-4">
                  <RoomPolices apartment={apartment} />
               </div>

               {/* ===== Reviews ===== */}
               <div id="reviews" className="pt-5 mt-3 mb-6 border-t border-gray-100 md:pt-6 md:mt-4 md:mb-10">
                  <Reviews apartmentId={apartmentId as string} />
               </div>
            </form>
         </FormProvider>
      </div>
   );
};

export default ApartmentDetail;
