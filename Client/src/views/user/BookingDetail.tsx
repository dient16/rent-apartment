import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Carousel, message, Popconfirm, Spin, Tooltip } from 'antd';
import {
   ArrowLeftOutlined,
   CalendarOutlined,
   ClockCircleOutlined,
   EnvironmentOutlined,
   MailOutlined,
   MoonOutlined,
   PhoneOutlined,
   UserOutlined,
} from '@ant-design/icons';
import { FaBed, FaRulerCombined, FaDoorOpen } from 'react-icons/fa';
import moment from 'moment';
import { Link, useParams } from '@/lib/router-compat';
import clsx from 'clsx';
import { apiCancelBooking, apiGetBooking } from '@/apis';
import { path } from '@/utils/constant';

type BookingStatus = 'pending' | 'confirmed' | 'canceled' | 'completed';

const STATUS_STYLES: Record<BookingStatus, { badge: string; dot: string; label: string }> = {
   pending: { badge: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-500', label: 'Pending' },
   confirmed: { badge: 'bg-green-50 text-green-600 border-green-200', dot: 'bg-green-500', label: 'Confirmed' },
   completed: { badge: 'bg-blue-50 text-blue-600 border-blue-200', dot: 'bg-blue-500', label: 'Completed' },
   canceled: { badge: 'bg-rose-50 text-rose-600 border-rose-200', dot: 'bg-rose-500', label: 'Canceled' },
};

const BookingDetail: React.FC = () => {
   const { bookingId } = useParams();
   const queryClient = useQueryClient();

   const { data: { data = {} } = {}, isFetching } = useQuery({
      queryKey: ['booking-detail', bookingId],
      queryFn: () => apiGetBooking(bookingId),
   });

   const cancelMutation = useMutation({
      mutationFn: () => apiCancelBooking(bookingId as string),
      onSuccess: (response) => {
         if (response.success) {
            message.success('Your booking has been canceled');
            queryClient.invalidateQueries({ queryKey: ['booking-detail', bookingId] });
            queryClient.invalidateQueries({ queryKey: ['my-booking'] });
         } else {
            message.error(response.message);
         }
      },
   });

   if (isFetching) {
      return (
         <div className="min-h-screen">
            <Spin spinning fullscreen size="large" />
         </div>
      );
   }

   const status: BookingStatus = data.status || 'pending';
   const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
   const nights = Math.max(moment(data.checkOut).diff(moment(data.checkIn), 'days'), 1);
   const canCancel = status === 'pending' || status === 'confirmed';
   const addressText = [
      data.address?.street,
      data.address?.ward,
      data.address?.district,
      data.address?.province,
   ]
      .filter(Boolean)
      .join(', ');

   const stayFacts = [
      {
         icon: <CalendarOutlined />,
         label: 'Check-in',
         value: moment(data.checkIn).format('ddd, DD MMM YYYY'),
      },
      {
         icon: <CalendarOutlined />,
         label: 'Check-out',
         value: moment(data.checkOut).format('ddd, DD MMM YYYY'),
      },
      {
         icon: <MoonOutlined />,
         label: 'Duration',
         value: `${nights} night${nights > 1 ? 's' : ''}`,
      },
      {
         icon: <ClockCircleOutlined />,
         label: 'Arrival time',
         value: data.arrivalTime || '—',
      },
   ];

   return (
      <div className="min-h-screen bg-gray-50 font-main">
         <div className="px-5 py-8 mx-auto w-full max-w-main lg:px-7">
            <Link
               to={`/${path.MY_BOOKING}`}
               className="inline-flex gap-2 items-center mb-5 text-sm font-medium text-gray-500 hover:text-blue-600"
            >
               <ArrowLeftOutlined /> My bookings
            </Link>

            {/* Header */}
            <div className="flex flex-wrap gap-4 justify-between items-start mb-6">
               <div className="min-w-0">
                  <p className="mb-1 text-sm font-semibold tracking-widest text-blue-500 uppercase">
                     Booking #{String(data._id || '').slice(-8).toUpperCase()}
                  </p>
                  <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                     {data.apartmentName || 'Your stay'}
                  </h1>
                  {addressText && (
                     <p className="flex gap-1.5 items-center mt-1 text-sm text-gray-500">
                        <EnvironmentOutlined />
                        {addressText}
                     </p>
                  )}
               </div>
               <span
                  className={clsx(
                     'inline-flex gap-1.5 items-center px-4 py-1.5 text-sm font-semibold rounded-full border',
                     statusStyle.badge,
                  )}
               >
                  <span className={clsx('w-2 h-2 rounded-full', statusStyle.dot)} />
                  {statusStyle.label}
               </span>
            </div>

            <div className="grid gap-6 items-start lg:grid-cols-3">
               {/* Cot trai */}
               <div className="space-y-6 lg:col-span-2">
                  {/* Stay summary */}
                  <div className="grid grid-cols-2 gap-4 p-6 bg-white rounded-2xl border border-gray-100 shadow-card-sm md:grid-cols-4">
                     {stayFacts.map((fact) => (
                        <div key={fact.label}>
                           <p className="flex gap-1.5 items-center text-xs text-gray-400">
                              <span className="text-blue-500">{fact.icon}</span>
                              {fact.label}
                           </p>
                           <p className="mt-1 text-sm font-semibold text-gray-900">
                              {fact.value}
                           </p>
                        </div>
                     ))}
                  </div>

                  {/* Room list */}
                  {(data.rooms || []).map((room) => (
                     <div
                        key={room.roomId}
                        className="flex overflow-hidden flex-col bg-white rounded-2xl border border-gray-100 md:flex-row shadow-card-sm"
                     >
                        <div className="flex-shrink-0 md:w-72">
                           <Carousel arrows swipeToSlide draggable>
                              {(room.images || []).map(
                                 (image: string, index: number) => (
                                    <img
                                       key={index}
                                       src={image}
                                       alt={room.roomType}
                                       className="object-cover w-full h-48 md:h-56"
                                    />
                                 ),
                              )}
                           </Carousel>
                        </div>
                        <div className="flex flex-col flex-1 p-5">
                           <div className="flex flex-wrap gap-2 justify-between items-start">
                              <h3 className="text-lg font-semibold text-gray-900">
                                 {room.roomType}
                              </h3>
                              <span className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-full">
                                 × {room.roomNumber} room
                                 {room.roomNumber > 1 ? 's' : ''}
                              </span>
                           </div>
                           <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-gray-600">
                              <span className="flex gap-2 items-center">
                                 <FaRulerCombined className="text-gray-400" />
                                 {room.size} m²
                              </span>
                              {room.bedType && (
                                 <span className="flex gap-2 items-center">
                                    <FaBed className="text-gray-400" />
                                    {room.bedType}
                                 </span>
                              )}
                              <span className="flex gap-2 items-center">
                                 <FaDoorOpen className="text-gray-400" />
                                 {room.roomNumber} × {nights} night
                                 {nights > 1 ? 's' : ''}
                              </span>
                           </div>
                           <div className="pt-3 mt-auto border-t border-gray-100">
                              <p className="text-xs text-gray-400">
                                 Price per night
                              </p>
                              <p className="text-base font-bold text-gray-900">
                                 {Number(room.price || 0).toLocaleString()}{' '}
                                 <span className="text-xs font-medium text-gray-500">
                                    VND
                                 </span>
                              </p>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>

               {/* Cot phai — sticky */}
               <div className="space-y-6 lg:sticky lg:top-24">
                  {/* Price summary */}
                  <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                     <h3 className="mb-4 text-base font-semibold text-gray-900">
                        Price summary
                     </h3>
                     <div className="space-y-2.5 text-sm">
                        {(data.rooms || []).map((room) => (
                           <div
                              key={room.roomId}
                              className="flex justify-between gap-3 text-gray-600"
                           >
                              <Tooltip title={room.roomType}>
                                 <span className="truncate">
                                    {room.roomType} × {room.roomNumber} ×{' '}
                                    {nights}n
                                 </span>
                              </Tooltip>
                              <span className="flex-shrink-0">
                                 {(
                                    Number(room.price || 0) *
                                    room.roomNumber *
                                    nights
                                 ).toLocaleString()}
                              </span>
                           </div>
                        ))}
                     </div>
                     <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                        <span className="font-semibold text-gray-900">
                           Total
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                           {Number(data.totalPrice || 0).toLocaleString()}{' '}
                           <span className="text-sm font-medium text-gray-500">
                              VND
                           </span>
                        </span>
                     </div>
                  </div>

                  {/* Guest info */}
                  {data.guest && (
                     <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                        <h3 className="mb-4 text-base font-semibold text-gray-900">
                           Guest
                        </h3>
                        <div className="space-y-2.5 text-sm text-gray-600">
                           <p className="flex gap-2.5 items-center">
                              <UserOutlined className="text-gray-400" />
                              {data.guest.firstname} {data.guest.lastname}
                           </p>
                           <p className="flex gap-2.5 items-center">
                              <MailOutlined className="text-gray-400" />
                              {data.guest.email}
                           </p>
                           {data.guest.phone && (
                              <p className="flex gap-2.5 items-center">
                                 <PhoneOutlined className="text-gray-400" />
                                 {data.guest.phone}
                              </p>
                           )}
                        </div>
                     </div>
                  )}

                  {/* Host contact + actions */}
                  <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                     <h3 className="mb-4 text-base font-semibold text-gray-900">
                        Need help?
                     </h3>
                     <div className="space-y-2.5 text-sm text-gray-600">
                        {data.contact?.email && (
                           <p className="flex gap-2.5 items-center">
                              <MailOutlined className="text-gray-400" />
                              <a
                                 href={`mailto:${data.contact.email}`}
                                 className="text-blue-600 hover:underline"
                              >
                                 {data.contact.email}
                              </a>
                           </p>
                        )}
                        {data.contact?.phone && (
                           <p className="flex gap-2.5 items-center">
                              <PhoneOutlined className="text-gray-400" />
                              <a
                                 href={`tel:${data.contact.phone}`}
                                 className="text-blue-600 hover:underline"
                              >
                                 {data.contact.phone}
                              </a>
                           </p>
                        )}
                     </div>
                     <div className="flex flex-col gap-3 mt-5">
                        {data.contact?.email && (
                           <Button
                              type="primary"
                              size="large"
                              className="w-full h-11 bg-blue-500 rounded-full"
                              href={`mailto:${data.contact.email}?subject=Booking ${String(data._id || '').slice(-8).toUpperCase()}`}
                           >
                              Contact host
                           </Button>
                        )}
                        {canCancel && (
                           <Popconfirm
                              title="Cancel this booking?"
                              description="This action cannot be undone."
                              okText="Yes, cancel it"
                              cancelText="Keep booking"
                              okButtonProps={{ danger: true }}
                              onConfirm={() => cancelMutation.mutate()}
                           >
                              <Button
                                 danger
                                 size="large"
                                 loading={cancelMutation.isPending}
                                 className="w-full h-11 rounded-full"
                              >
                                 Cancel booking
                              </Button>
                           </Popconfirm>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};

export default BookingDetail;
