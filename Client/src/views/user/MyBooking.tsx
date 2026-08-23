import React, { useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button, Skeleton, Tooltip } from 'antd';
import {
   CalendarOutlined,
   EnvironmentOutlined,
   RightOutlined,
   MoonOutlined,
   HomeOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import { useNavigate } from '@/lib/router-compat';
import clsx from 'clsx';
import { apiGetMyBookings } from '@/apis';
import PaginationBar from '@/components/SearchResult/PaginationBar';
import { path } from '@/utils/constant';

type BookingStatus = 'pending' | 'confirmed' | 'canceled' | 'completed';

interface MyBookingItem {
   _id: string;
   apartmentName?: string;
   apartmentLocation?: string;
   rooms: { roomType: string; roomNumber: number; image: string }[];
   checkInTime: string;
   checkOutTime: string;
   totalPrice: number;
   status: BookingStatus;
}

const STATUS_STYLES: Record<BookingStatus, { badge: string; dot: string; label: string }> = {
   pending: {
      badge: 'bg-amber-50 text-amber-600 border-amber-200',
      dot: 'bg-amber-500',
      label: 'Pending',
   },
   confirmed: {
      badge: 'bg-green-50 text-green-600 border-green-200',
      dot: 'bg-green-500',
      label: 'Confirmed',
   },
   completed: {
      badge: 'bg-blue-50 text-blue-600 border-blue-200',
      dot: 'bg-blue-500',
      label: 'Completed',
   },
   canceled: {
      badge: 'bg-rose-50 text-rose-600 border-rose-200',
      dot: 'bg-rose-500',
      label: 'Canceled',
   },
};

const FILTERS: { key: 'all' | BookingStatus; label: string }[] = [
   { key: 'all', label: 'All trips' },
   { key: 'pending', label: 'Pending' },
   { key: 'confirmed', label: 'Confirmed' },
   { key: 'completed', label: 'Completed' },
   { key: 'canceled', label: 'Canceled' },
];

const PAGE_SIZE = 10;

const MyBooking: React.FC = () => {
   const navigate = useNavigate();
   const [filter, setFilter] = useState<'all' | BookingStatus>('all');
   const [page, setPage] = useState(1);

   // Switching tab restarts paging.
   const [lastFilter, setLastFilter] = useState(filter);
   if (lastFilter !== filter) {
      setLastFilter(filter);
      setPage(1);
   }

   const { data, isFetching } = useQuery({
      queryKey: ['my-booking', page, filter],
      queryFn: () => apiGetMyBookings({ page, limit: PAGE_SIZE, status: filter }),
      placeholderData: keepPreviousData,
   });

   const visibleBookings: MyBookingItem[] = useMemo(
      () => data?.data?.bookings || [],
      [data],
   );
   // Tab badges count the whole result set, not the page on screen.
   const counts: Record<string, number> = data?.data?.counts || {};
   const total: number = data?.data?.pagination?.total ?? 0;

   return (
      <div className="min-h-screen bg-gray-50 font-main">
         <div className="px-5 py-10 mx-auto w-full max-w-main lg:px-7">
            <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
               My bookings
            </h1>

            {/* Status filter */}
            <div className="flex overflow-x-auto gap-2 pb-4 mb-6 -mx-1 px-1">
               {FILTERS.map((item) => (
                  <button
                     key={item.key}
                     onClick={() => setFilter(item.key)}
                     className={clsx(
                        'px-4 py-2 whitespace-nowrap text-sm font-medium rounded-full border transition-colors cursor-pointer',
                        filter === item.key
                           ? 'bg-blue-500 text-white border-blue-500'
                           : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600',
                     )}
                  >
                     {item.label}
                     {counts[item.key] != null && (
                        <span
                           className={clsx(
                              'ml-2 px-1.5 py-0.5 text-xs rounded-full',
                              filter === item.key
                                 ? 'bg-white/25'
                                 : 'bg-gray-100',
                           )}
                        >
                           {counts[item.key] || 0}
                        </span>
                     )}
                  </button>
               ))}
            </div>

            {isFetching ? (
               <div className="space-y-4">
                  {[1, 2, 3].map((index) => (
                     <div
                        key={index}
                        className="flex gap-5 p-4 bg-white rounded-2xl shadow-card-sm"
                     >
                        <Skeleton.Image
                           active
                           className="w-56! h-36! rounded-xl! hidden md:block"
                        />
                        <Skeleton active paragraph={{ rows: 3 }} />
                     </div>
                  ))}
               </div>
            ) : visibleBookings.length === 0 ? (
               <div className="flex flex-col items-center py-24 text-center bg-white rounded-3xl shadow-card-sm">
                  <span className="flex justify-center items-center mb-6 w-20 h-20 text-3xl text-blue-400 bg-blue-50 rounded-full">
                     <CalendarOutlined />
                  </span>
                  <h2 className="mb-2 text-xl font-semibold text-gray-900">
                     {filter === 'all'
                        ? 'No trips booked yet'
                        : `No ${filter} bookings`}
                  </h2>
                  <p className="mb-6 max-w-md text-gray-500">
                     {filter === 'all'
                        ? 'Time to dust off your bags and start planning your next adventure.'
                        : 'Try another filter or book a new stay.'}
                  </p>
                  <Button
                     type="primary"
                     size="large"
                     className="px-8 h-11 bg-blue-500 rounded-full"
                     onClick={() => navigate(`/${path.LISTING}`)}
                  >
                     Start exploring
                  </Button>
               </div>
            ) : (
               <div className="space-y-4">
                  {visibleBookings.map((booking) => {
                     const nights = Math.max(
                        moment(booking.checkOutTime).diff(
                           moment(booking.checkInTime),
                           'days',
                        ),
                        1,
                     );
                     const totalRooms = booking.rooms.reduce(
                        (sum, room) => sum + (room.roomNumber || 1),
                        0,
                     );
                     const statusStyle =
                        STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending;

                     return (
                        <div
                           key={booking._id}
                           onClick={() =>
                              navigate(`/my-booking/${booking._id}`)
                           }
                           className="flex overflow-hidden flex-col bg-white rounded-2xl border border-gray-100 transition-all duration-300 cursor-pointer group md:flex-row shadow-card-sm hover:shadow-card-md hover:border-blue-200"
                        >
                           <div className="overflow-hidden flex-shrink-0 md:w-64">
                              <img
                                 src={booking.rooms[0]?.image}
                                 alt={booking.apartmentName || 'Booking'}
                                 className="object-cover w-full h-44 transition-transform duration-500 md:h-full group-hover:scale-105"
                              />
                           </div>

                           <div className="flex flex-col flex-1 gap-3 p-5">
                              <div className="flex flex-wrap gap-3 justify-between items-start">
                                 <div className="min-w-0">
                                    <Tooltip title={booking.apartmentName}>
                                       <h2 className="text-lg font-semibold text-gray-900 truncate max-w-[420px] group-hover:text-blue-600 transition-colors">
                                          {booking.apartmentName ||
                                             booking.rooms[0]?.roomType ||
                                             'Your stay'}
                                       </h2>
                                    </Tooltip>
                                    {booking.apartmentLocation && (
                                       <p className="flex gap-1.5 items-center mt-0.5 text-sm text-gray-500">
                                          <EnvironmentOutlined />
                                          <span className="truncate">
                                             {booking.apartmentLocation}
                                          </span>
                                       </p>
                                    )}
                                 </div>
                                 <span
                                    className={clsx(
                                       'inline-flex gap-1.5 items-center px-3 py-1 text-xs font-semibold rounded-full border',
                                       statusStyle.badge,
                                    )}
                                 >
                                    <span
                                       className={clsx(
                                          'w-1.5 h-1.5 rounded-full',
                                          statusStyle.dot,
                                       )}
                                    />
                                    {statusStyle.label}
                                 </span>
                              </div>

                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                                 <span className="flex gap-2 items-center">
                                    <CalendarOutlined className="text-gray-400" />
                                    {moment(booking.checkInTime).format(
                                       'DD MMM YYYY',
                                    )}
                                    <RightOutlined className="text-[10px] text-gray-400" />
                                    {moment(booking.checkOutTime).format(
                                       'DD MMM YYYY',
                                    )}
                                 </span>
                                 <span className="flex gap-2 items-center">
                                    <MoonOutlined className="text-gray-400" />
                                    {nights} night{nights > 1 ? 's' : ''}
                                 </span>
                                 <span className="flex gap-2 items-center">
                                    <HomeOutlined className="text-gray-400" />
                                    {totalRooms} room{totalRooms > 1 ? 's' : ''}
                                    {booking.rooms[0]?.roomType
                                       ? ` · ${booking.rooms[0].roomType}`
                                       : ''}
                                 </span>
                              </div>

                              <div className="flex flex-wrap gap-3 justify-between items-end pt-3 mt-auto border-t border-gray-100">
                                 <div>
                                    <p className="text-xs text-gray-400">
                                       Total price
                                    </p>
                                    <p className="text-lg font-bold text-gray-900">
                                       {booking.totalPrice.toLocaleString()}{' '}
                                       <span className="text-sm font-medium text-gray-500">
                                          VND
                                       </span>
                                    </p>
                                 </div>
                                 <span className="flex gap-1 items-center text-sm font-medium text-blue-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                    View details <RightOutlined />
                                 </span>
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            )}

            {!isFetching && total > 0 && (
               <PaginationBar
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onChange={(next) => {
                     setPage(next);
                     window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  itemLabel="booking"
               />
            )}
         </div>
      </div>
   );
};

export default MyBooking;
