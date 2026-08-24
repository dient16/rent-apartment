'use client';

import React from 'react';
import AppImage from '@/components/AppImage/AppImage';
import { Button, Result, Skeleton } from 'antd';
import {
   CalendarOutlined,
   CheckCircleFilled,
   EnvironmentOutlined,
   MoonOutlined,
   TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';
import { apiGetBooking } from '@/apis';
import { useNavigate, useParams } from '@/lib/router-compat';
import { path } from '@/utils/constant';

interface BookedRoom {
   roomId: string;
   roomType: string;
   roomNumber: number;
   bedType?: string;
   images?: string[];
}

const BookingCompletion: React.FC = () => {
   const navigate = useNavigate();
   const { bookingId } = useParams();

   const { data: { data: booking } = {}, isFetching } = useQuery({
      queryKey: ['booking-detail', bookingId],
      queryFn: () => apiGetBooking(bookingId as string),
      enabled: !!bookingId,
   });

   const nights = booking
      ? Math.max(moment(booking.checkOut).diff(moment(booking.checkIn), 'days'), 1)
      : 0;
   const rooms: BookedRoom[] = booking?.rooms || [];
   const totalRooms = rooms.reduce((sum, room) => sum + (room.roomNumber || 0), 0);
   const addressText = [
      booking?.address?.street,
      booking?.address?.ward,
      booking?.address?.district,
      booking?.address?.province,
   ]
      .filter(Boolean)
      .join(', ');

   const facts = [
      {
         icon: <CalendarOutlined />,
         label: 'Check-in',
         value: moment(booking?.checkIn).format('ddd, DD MMM YYYY'),
      },
      {
         icon: <CalendarOutlined />,
         label: 'Check-out',
         value: moment(booking?.checkOut).format('ddd, DD MMM YYYY'),
      },
      {
         icon: <MoonOutlined />,
         label: 'Duration',
         value: `${nights} night${nights > 1 ? 's' : ''}`,
      },
      {
         icon: <TeamOutlined />,
         label: 'Rooms',
         value: `${totalRooms} room${totalRooms > 1 ? 's' : ''}`,
      },
   ];

   const actions = (
      <div className="flex flex-col gap-3 sm:flex-row">
         <Button
            type="primary"
            size="large"
            className="bg-blue-500 rounded-full"
            onClick={() => navigate(`/${path.MY_BOOKING}`)}
         >
            View bookings and trips
         </Button>
         <Button size="large" className="rounded-full" onClick={() => navigate('/')}>
            Back to home
         </Button>
      </div>
   );

   if (!isFetching && !booking) {
      return (
         <div className="flex justify-center items-center min-h-screen bg-gray-50 font-main">
            <Result
               status="warning"
               title="We could not load this booking"
               subTitle="The reservation may have been removed, or the link is no longer valid."
               extra={actions}
            />
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-gray-50 font-main">
         <div className="px-5 py-10 mx-auto w-full max-w-3xl lg:px-7">
            <div className="flex flex-col items-center text-center">
               <span className="flex justify-center items-center mb-5 w-16 h-16 text-3xl text-green-600 bg-green-100 rounded-full">
                  <CheckCircleFilled />
               </span>
               <h1 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">
                  Your booking is confirmed
               </h1>
               <p className="max-w-md text-sm text-gray-500">
                  A confirmation email is on its way. You can review or cancel this
                  reservation any time from your trips.
               </p>
            </div>

            <div className="overflow-hidden mt-8 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
               {isFetching ? (
                  <div className="p-6">
                     <Skeleton active paragraph={{ rows: 5 }} />
                  </div>
               ) : (
                  <>
                     <div className="flex flex-wrap gap-4 justify-between items-start p-6 border-b border-gray-100">
                        <div className="min-w-0">
                           <p className="mb-1 text-xs font-semibold tracking-widest text-blue-500 uppercase">
                              Booking #{String(booking._id || '').slice(-8).toUpperCase()}
                           </p>
                           <h2 className="text-xl font-bold text-gray-900 truncate">
                              {booking.apartmentName}
                           </h2>
                           {addressText && (
                              <p className="flex gap-1.5 items-center mt-1 text-sm text-gray-500">
                                 <EnvironmentOutlined /> {addressText}
                              </p>
                           )}
                        </div>
                        <span className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold tracking-wide text-green-700 uppercase bg-green-50 rounded-full border border-green-200">
                           {booking.status}
                        </span>
                     </div>

                     <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                        {facts.map((fact) => (
                           <div key={fact.label} className="p-4 bg-white">
                              <p className="flex gap-1.5 items-center text-xs tracking-wide text-gray-400 uppercase">
                                 {fact.icon} {fact.label}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-gray-900">
                                 {fact.value}
                              </p>
                           </div>
                        ))}
                     </div>

                     <div className="p-6 space-y-3 border-t border-gray-100">
                        {rooms.map((room) => (
                           <div key={room.roomId} className="flex gap-4 items-center">
                              {room.images?.[0] && (
                                 <AppImage
                                    src={room.images[0]}
                                    alt={room.roomType}
                                    wrapperClassName="object-cover flex-shrink-0 w-20 h-16 rounded-xl"
                                 />
                              )}
                              <div className="min-w-0">
                                 <p className="font-medium text-gray-900 truncate">
                                    {room.roomType}
                                 </p>
                                 <p className="text-sm text-gray-500">
                                    {room.roomNumber} room
                                    {room.roomNumber > 1 ? 's' : ''}
                                    {room.bedType ? ` · ${room.bedType}` : ''}
                                 </p>
                              </div>
                           </div>
                        ))}
                     </div>

                     <div className="flex justify-between items-center p-6 bg-blue-50">
                        <span className="font-semibold text-gray-900">Total paid</span>
                        <div className="text-right">
                           <p className="text-2xl font-bold text-gray-900">
                              {(booking.totalPrice || 0).toLocaleString()} VND
                           </p>
                           <p className="text-xs text-gray-500">
                              Includes taxes and charges
                           </p>
                        </div>
                     </div>
                  </>
               )}
            </div>

            <div className="flex justify-center mt-8">{actions}</div>
         </div>
      </div>
   );
};

export default BookingCompletion;
