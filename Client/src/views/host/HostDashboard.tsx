import React, { useMemo } from 'react';
import { Link } from '@/lib/router-compat';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, message } from 'antd';
import {
   ArrowRightOutlined,
   CalendarOutlined,
   CheckOutlined,
   ClockCircleOutlined,
   DollarOutlined,
   EnvironmentOutlined,
   HomeOutlined,
   PlusOutlined,
   ScheduleOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import {
   apiConfirmBooking,
   apiGetApartmentByUser,
   apiGetUserBookings,
} from '@/apis';
import StatusBadge from '@/components/StatusBadge/StatusBadge';
import { path } from '@/utils/constant';
import {
   BookingRowsSkeleton,
   ListingRowsSkeleton,
   StatValueSkeleton,
} from './HostDashboardSkeleton';

const HostDashboard: React.FC = () => {
   const queryClient = useQueryClient();

   const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
      // `limit` is part of the key: the bookings page uses the same prefix with a
      // different page size, and sharing a cache entry showed it only 5 rows.
      queryKey: ['bookings-host', { page: 1, limit: 5, status: 'all', search: '' }],
      queryFn: () => apiGetUserBookings({ page: 1, limit: 5, status: 'all', search: '' }),
   });
   const { data: apartmentsData, isLoading: apartmentsLoading } = useQuery({
      queryKey: ['apartments-host', { page: 1, limit: 5, search: '' }],
      queryFn: () => apiGetApartmentByUser({ page: 1, limit: 5, search: '' }),
   });

   const confirmMutation = useMutation({
      mutationFn: apiConfirmBooking,
      onSuccess: (response) => {
         if (response.success) {
            message.success('Booking confirmed');
            queryClient.invalidateQueries({ queryKey: ['bookings-host'] });
         } else {
            message.error(response.message);
         }
      },
   });

   const bookings = useMemo(() => bookingsData?.data?.bookings || [], [bookingsData]);
   const apartments = apartmentsData?.data?.apartments || [];
   const apartmentTotal: number = apartmentsData?.data?.pagination?.total ?? 0;

   const stats = bookingsData?.data?.stats ?? {
      revenue: 0,
      pending: 0,
      upcoming: 0,
      total: 0,
   };

   const statCards = [
      {
         icon: <DollarOutlined />,
         label: 'Total revenue',
         value: `${stats.revenue.toLocaleString()} VND`,
         tone: 'text-green-600 bg-green-50',
      },
      {
         icon: <ScheduleOutlined />,
         label: 'Total bookings',
         value: stats.total,
         tone: 'text-blue-600 bg-blue-50',
      },
      {
         icon: <ClockCircleOutlined />,
         label: 'Pending requests',
         value: stats.pending,
         tone: 'text-amber-600 bg-amber-50',
      },
      {
         icon: <HomeOutlined />,
         label: 'Active listings',
         value: apartmentTotal,
         tone: 'text-purple-600 bg-purple-50',
      },
   ];

   const recentBookings = bookings;
   const isLoading = bookingsLoading || apartmentsLoading;

   return (
      <div className="min-h-screen bg-gray-50 font-main">
         <div className="px-5 pt-3 pb-8 mx-auto w-full max-w-main lg:px-7">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-7">
               <div>
                  <h1 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">
                     Dashboard
                  </h1>
               </div>
               <Link to={`${path.HOST_ROOT}${path.CREATE_APARTMENT}`}>
                  <Button
                     type="primary"
                     size="large"
                     icon={<PlusOutlined />}
                     className="h-11 bg-blue-500 rounded-full"
                  >
                     New listing
                  </Button>
               </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-7 lg:grid-cols-4">
               {statCards.map((card) => (
                  <div
                     key={card.label}
                     className="p-4 bg-white rounded-2xl border border-gray-100 shadow-card-sm md:p-5"
                  >
                     <span
                        className={`flex justify-center items-center mb-3 w-10 h-10 text-base rounded-xl md:mb-4 md:w-11 md:h-11 md:text-lg ${card.tone}`}
                     >
                        {card.icon}
                     </span>
                     <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                        {card.label}
                     </p>
                     {isLoading ? (
                        <StatValueSkeleton />
                     ) : (
                        <p className="mt-1 text-lg font-bold text-gray-900 truncate md:text-xl">
                           {card.value}
                        </p>
                     )}
                  </div>
               ))}
            </div>

            <div className="grid gap-6 items-start lg:grid-cols-3">
               {/* Recent bookings */}
               <div className="bg-white rounded-2xl border border-gray-100 lg:col-span-2 shadow-card-sm">
                  <div className="flex justify-between items-center p-5 border-b border-gray-100">
                     <h2 className="text-base font-bold text-gray-900">
                        Recent bookings
                     </h2>
                     <Link
                        to={`${path.HOST_ROOT}${path.HOST_BOOKINGS}`}
                        className="flex gap-1 items-center text-sm font-medium text-blue-600 hover:underline"
                     >
                        View all <ArrowRightOutlined />
                     </Link>
                  </div>

                  {isLoading ? (
                     <BookingRowsSkeleton />
                  ) : recentBookings.length === 0 ? (
                     <div className="py-16 text-center text-gray-400">
                        No bookings yet — they will appear here.
                     </div>
                  ) : (
                     <ul className="divide-y divide-gray-100">
                        {recentBookings.map((booking) => (
                           <li
                              key={booking._id}
                              className="flex flex-wrap gap-3 justify-between items-center p-5"
                           >
                              <div className="flex gap-3 items-center min-w-0">
                                 <Avatar className="flex-shrink-0 text-blue-600 bg-blue-100 font-semibold">
                                    {booking.guestName?.[0]?.toUpperCase() || '?'}
                                 </Avatar>
                                 <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                       {booking.guestName || 'Guest'}
                                       <span className="ml-2 font-normal text-gray-400">
                                          · {booking.apartmentName}
                                       </span>
                                    </p>
                                    <p className="flex gap-1.5 items-center text-xs text-gray-500">
                                       <CalendarOutlined />
                                       {moment(booking.checkInTime).format('DD MMM')} –{' '}
                                       {moment(booking.checkOutTime).format('DD MMM YYYY')}
                                       <span className="font-semibold text-gray-700">
                                          {booking.totalPrice?.toLocaleString()} VND
                                       </span>
                                    </p>
                                 </div>
                              </div>
                              <div className="flex gap-2 items-center">
                                 <StatusBadge status={booking.status} />
                                 {booking.status === 'pending' && (
                                    <Button
                                       type="primary"
                                       size="small"
                                       icon={<CheckOutlined />}
                                       loading={confirmMutation.isPending}
                                       className="bg-blue-500 rounded-lg"
                                       onClick={() =>
                                          confirmMutation.mutate(booking._id)
                                       }
                                    >
                                       Confirm
                                    </Button>
                                 )}
                              </div>
                           </li>
                        ))}
                     </ul>
                  )}
               </div>

               {/* Listings */}
               <div className="bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                  <div className="flex justify-between items-center p-5 border-b border-gray-100">
                     <h2 className="text-base font-bold text-gray-900">
                        Your listings
                     </h2>
                     <Link
                        to={`${path.HOST_ROOT}${path.HOST_LISTINGS}`}
                        className="flex gap-1 items-center text-sm font-medium text-blue-600 hover:underline"
                     >
                        Manage <ArrowRightOutlined />
                     </Link>
                  </div>
                  {isLoading ? (
                     <ListingRowsSkeleton />
                  ) : apartments.length === 0 ? (
                     <div className="px-5 py-16 text-center">
                        <p className="mb-4 text-gray-400">
                           You have no listings yet.
                        </p>
                        <Link to={`${path.HOST_ROOT}${path.CREATE_APARTMENT}`}>
                           <Button
                              type="primary"
                              className="bg-blue-500 rounded-full"
                           >
                              Create your first listing
                           </Button>
                        </Link>
                     </div>
                  ) : (
                     <ul className="divide-y divide-gray-100">
                        {apartments.map((apartment) => (
                           <li key={apartment._id}>
                              <Link
                                 to={`${path.HOST_ROOT}apartment-rooms/${apartment._id}`}
                                 className="flex gap-3 items-center p-5 transition-colors hover:bg-gray-50 group"
                              >
                                 <span className="flex flex-shrink-0 justify-center items-center w-10 h-10 text-blue-600 bg-blue-50 rounded-xl">
                                    <HomeOutlined />
                                 </span>
                                 <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600">
                                       {apartment.title}
                                    </p>
                                    <p className="flex gap-1 items-center text-xs text-gray-500 truncate">
                                       <EnvironmentOutlined />
                                       {apartment.location?.district},{' '}
                                       {apartment.location?.province}
                                       <span className="text-gray-300">·</span>
                                       {apartment.rooms?.length} room type
                                       {apartment.rooms?.length > 1 ? 's' : ''}
                                    </p>
                                 </div>
                              </Link>
                           </li>
                        ))}
                     </ul>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default HostDashboard;
