import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Input, message, Popconfirm, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
   CalendarOutlined,
   CheckOutlined,
   CloseOutlined,
   SearchOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import clsx from 'clsx';
import { apiCancelBooking, apiConfirmBooking, apiGetUserBookings } from '@/apis';
import StatusBadge, {
   type BookingStatus,
} from '@/components/StatusBadge/StatusBadge';

interface HostBooking {
   _id: string;
   guestName: string;
   email: string;
   phone?: string;
   apartmentName: string;
   rooms: { roomType?: string; roomNumber: number }[];
   checkInTime: string;
   checkOutTime: string;
   totalPrice: number;
   status: BookingStatus;
   createdAt?: string;
}

const FILTERS: { key: 'all' | BookingStatus; label: string }[] = [
   { key: 'all', label: 'All' },
   { key: 'pending', label: 'Pending' },
   { key: 'confirmed', label: 'Confirmed' },
   { key: 'completed', label: 'Completed' },
   { key: 'canceled', label: 'Canceled' },
];

const HostBookings: React.FC = () => {
   const queryClient = useQueryClient();
   const [filter, setFilter] = useState<'all' | BookingStatus>('all');
   const [search, setSearch] = useState('');

   const { data, isLoading } = useQuery({
      queryKey: ['bookings-host'],
      queryFn: apiGetUserBookings,
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

   const declineMutation = useMutation({
      mutationFn: apiCancelBooking,
      onSuccess: (response) => {
         if (response.success) {
            message.success('Booking declined');
            queryClient.invalidateQueries({ queryKey: ['bookings-host'] });
         } else {
            message.error(response.message);
         }
      },
   });

   const bookings: HostBooking[] = useMemo(() => data?.data || [], [data]);

   const counts = useMemo(() => {
      const result: Record<string, number> = { all: bookings.length };
      bookings.forEach((booking) => {
         result[booking.status] = (result[booking.status] || 0) + 1;
      });
      return result;
   }, [bookings]);

   const visible = useMemo(() => {
      let rows = bookings;
      if (filter !== 'all') rows = rows.filter((b) => b.status === filter);
      if (search.trim()) {
         const keyword = search.trim().toLowerCase();
         rows = rows.filter(
            (b) =>
               b.guestName?.toLowerCase().includes(keyword) ||
               b.email?.toLowerCase().includes(keyword) ||
               b.apartmentName?.toLowerCase().includes(keyword),
         );
      }
      return rows;
   }, [bookings, filter, search]);

   const columns: ColumnsType<HostBooking> = [
      {
         title: 'Guest',
         key: 'guest',
         render: (_, record) => (
            <div className="flex gap-3 items-center min-w-0">
               <Avatar className="flex-shrink-0 text-blue-600 bg-blue-100 font-semibold">
                  {record.guestName?.[0]?.toUpperCase() || '?'}
               </Avatar>
               <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                     {record.guestName || 'Guest'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{record.email}</p>
               </div>
            </div>
         ),
      },
      {
         title: 'Stay',
         key: 'stay',
         render: (_, record) => (
            <div className="min-w-0">
               <Tooltip title={record.apartmentName}>
                  <p className="text-sm font-medium text-gray-900 truncate max-w-[220px]">
                     {record.apartmentName}
                  </p>
               </Tooltip>
               <p className="text-xs text-gray-500 truncate">
                  {record.rooms
                     .map((room) =>
                        [room.roomType, `× ${room.roomNumber}`]
                           .filter(Boolean)
                           .join(' '),
                     )
                     .join(', ')}
               </p>
            </div>
         ),
      },
      {
         title: 'Dates',
         key: 'dates',
         render: (_, record) => {
            const nights = Math.max(
               moment(record.checkOutTime).diff(moment(record.checkInTime), 'days'),
               1,
            );
            return (
               <div className="text-sm text-gray-700">
                  <p className="flex gap-1.5 items-center whitespace-nowrap">
                     <CalendarOutlined className="text-gray-400" />
                     {moment(record.checkInTime).format('DD MMM')} –{' '}
                     {moment(record.checkOutTime).format('DD MMM YYYY')}
                  </p>
                  <p className="text-xs text-gray-400">
                     {nights} night{nights > 1 ? 's' : ''}
                  </p>
               </div>
            );
         },
      },
      {
         title: 'Total',
         key: 'total',
         align: 'right',
         render: (_, record) => (
            <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
               {record.totalPrice?.toLocaleString()}{' '}
               <span className="text-xs font-medium text-gray-400">VND</span>
            </span>
         ),
      },
      {
         title: 'Status',
         key: 'status',
         align: 'center',
         render: (_, record) => <StatusBadge status={record.status} />,
      },
      {
         title: '',
         key: 'actions',
         align: 'right',
         render: (_, record) =>
            record.status === 'pending' ? (
               <div className="flex gap-2 justify-end">
                  <Button
                     type="primary"
                     size="small"
                     icon={<CheckOutlined />}
                     loading={confirmMutation.isPending}
                     className="bg-blue-500 rounded-lg"
                     onClick={() => confirmMutation.mutate(record._id)}
                  >
                     Confirm
                  </Button>
                  <Popconfirm
                     title="Decline this booking?"
                     okText="Decline"
                     okButtonProps={{ danger: true }}
                     onConfirm={() => declineMutation.mutate(record._id)}
                  >
                     <Button
                        danger
                        size="small"
                        icon={<CloseOutlined />}
                        loading={declineMutation.isPending}
                        className="rounded-lg"
                     >
                        Decline
                     </Button>
                  </Popconfirm>
               </div>
            ) : null,
      },
   ];

   return (
      <div className="min-h-screen bg-gray-50 font-main">
         <div className="px-5 py-8 mx-auto w-full max-w-main lg:px-7">
            <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
               Bookings
            </h1>

            <div className="flex flex-wrap gap-3 justify-between items-center mb-5">
               <div className="flex overflow-x-auto gap-2">
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
                        <span
                           className={clsx(
                              'ml-2 px-1.5 py-0.5 text-xs rounded-full',
                              filter === item.key ? 'bg-white/25' : 'bg-gray-100',
                           )}
                        >
                           {counts[item.key] || 0}
                        </span>
                     </button>
                  ))}
               </div>
               <Input
                  allowClear
                  prefix={<SearchOutlined className="text-gray-400" />}
                  placeholder="Search guest, email or listing"
                  className="h-10 rounded-full max-w-[280px]"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
               />
            </div>

            <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-card-sm">
               <Table
                  columns={columns}
                  dataSource={visible}
                  loading={isLoading}
                  rowKey="_id"
                  pagination={{ pageSize: 8, showSizeChanger: false }}
                  scroll={{ x: 900 }}
               />
            </div>
         </div>
      </div>
   );
};

export default HostBookings;
