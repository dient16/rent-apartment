import React from 'react';
import {
   Map,
   NavigationBarRoom,
   Reviews,
   RoomList,
   RoomPolices,
   ImageGallery,
   BookingSummary,
   SearchInfoBar,
   FavoriteButton,
} from '@/components';
import { Button, Result, Spin, message } from 'antd';
import { Controller, useForm, FormProvider } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiApartmentDetail, apiStartConversation } from '@/apis';
import moment from 'moment';
import { path } from '@/utils/constant';
import icons from '@/utils/icons';
import { IoChatbubbleEllipsesOutline } from 'react-icons/io5';
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
   const methods = useForm();
   const { isAuthenticated, setAuthModal } = useAuth();

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

   const { data: { data: apartment } = {}, isFetching } = useQuery({
      queryKey: ['apartment', apartmentId, searchParams.toString()],
      queryFn: () => apiApartmentDetail(apartmentId, searchParams.toString()),
      staleTime: 0,
   });

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

   const selectedRooms = methods.watch('selectedRooms', []);
   const handleBooking = (data: any) => {
      const queryParams = new URLSearchParams();

      selectedRooms.forEach((room: { roomId: string; count: number }) => {
         queryParams.append('roomIds[]', room.roomId);
         queryParams.append('roomNumbers[]', room.count.toString());
      });

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

   return isFetching ? (
      <div className="min-h-screen">
         <Spin spinning={isFetching} size="large" fullscreen={isFetching} />
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
               totalRoomCount={selectedRooms.reduce(
                  (acc: number, room: RoomValue) => acc + room.count,
                  0,
               )}
               numberOfNights={numberOfDays}
               startDate={startDate}
               endDate={endDate}
               handleDateChange={handleDateChange}
            />
            <form
               onSubmit={methods.handleSubmit(handleBooking)}
               className="flex flex-col gap-5 justify-center w-full max-w-main mx-auto px-5 lg:px-7"
            >
               <ImageGallery images={apartment?.rooms[0]?.images || []} />
               <div className="flex gap-5 items-start lg:mt-5">
                  <div className="flex flex-col w-full">
                     <div className="flex flex-col gap-2 justify-center lg:mt-5 mt-3 font-main">
                        <div className="flex gap-3 justify-between items-center">
                           <div className="text-3xl">{apartment?.title}</div>
                           <div className="flex gap-2 items-center">
                              <button
                                 type="button"
                                 onClick={handleMessageHost}
                                 className="flex gap-2 items-center px-4 h-10 text-sm font-medium text-gray-700 bg-white rounded-full border border-gray-300 transition-colors cursor-pointer hover:border-blue-500 hover:text-blue-600"
                              >
                                 <IoChatbubbleEllipsesOutline size={17} />
                                 Message host
                              </button>
                              <FavoriteButton apartmentId={apartmentId as string} />
                           </div>
                        </div>
                        <div className="flex gap-1 items-center text-sm font-light font-main">
                           <FaLocationDot color="#1640D6" size={15} />
                           <p className="hover:underline">
                              {`${apartment.location.street}, ${apartment.location.ward}, ${apartment.location.district}, ${apartment.location.province}`}
                           </p>
                        </div>
                     </div>
                     <NavigationBarRoom />
                     <div className="lg:mt-7 md:mt-4 mt-3">
                        <h3 id="overview" className="text-xl font-normal">
                           This place has something for you
                        </h3>
                        <div className="flex lg:gap-10 gap-5 mt-5 font-light flex-wrap">
                           {apartment.rooms[0]?.amenities.map(
                              (
                                 amenity: { name: string; icon: string },
                                 index: number,
                              ) => (
                                 <div
                                    className="flex gap-2 items-center py-1 flex-wrap"
                                    key={index}
                                 >
                                    <img
                                       className="h-4 object-cover"
                                       src={amenity.icon}
                                    />
                                    <span>{amenity.name}</span>
                                 </div>
                              ),
                           )}
                        </div>
                     </div>
                     <div className="mt-7">
                        <div className="text-sm font-light whitespace-pre-line">
                           {apartment.description}
                        </div>
                     </div>
                     <h3 id="rooms" className="my-5 text-xl font-normal">
                        Rooms
                     </h3>
                     <Controller
                        name="selectedRooms"
                        control={methods.control}
                        defaultValue={[]}
                        rules={{ required: 'Please select room' }}
                        render={({ field }) => (
                           <RoomList
                              roomList={apartment.rooms}
                              value={field.value}
                              onChange={field.onChange}
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
               <div className="relative z-0 my-5 w-full lg:h-[500px] h-[300px] h-128">
                  <h3 id="location" className="mb-5 ml-3 text-xl font-normal">
                     Where you will go
                  </h3>
                  <Map
                     selectPosition={{
                        lat: apartment?.location.lat,
                        lon: apartment?.location.long,
                     }}
                  />
               </div>
               <div id="policies" className="mt-4">
                  <RoomPolices />
               </div>
               <div id="reviews" className="mt-4">
                  <Reviews />
               </div>
            </form>
         </FormProvider>
      </div>
   );
};

export default ApartmentDetail;
