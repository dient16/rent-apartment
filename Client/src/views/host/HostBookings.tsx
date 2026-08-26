import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
   keepPreviousData,
   useMutation,
   useQuery,
   useQueryClient,
} from '@tanstack/react-query';
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
import { useDebounce, useRowsPerPage } from '@/hooks';
import { useSearchParams } from '@/lib/router-compat';
import { useMediaQuery } from 'react-responsive';
import PaginationBar from '@/components/SearchResult/PaginationBar';
import StatusBadge, {
   type BookingStatus,
} from '@/components/StatusBadge/StatusBadge';
import { BookingCardsSkeleton, BookingTableSkeleton } from './HostSkeletons';

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

type Filter = 'all' | BookingStatus;

const FILTERS: { key: Filter; label: string }[] = [
   { key: 'all', label: 'All' },
   { key: 'pending', label: 'Pending' },
   { key: 'confirmed', label: 'Confirmed' },
   { key: 'completed', label: 'Completed' },
   { key: 'canceled', label: 'Canceled' },
];
const FILTER_KEYS = FILTERS.map((item) => item.key);

// Table geometry used to fit the rows to the viewport.
const ROW_HEIGHT = 65; // two-line cell + antd padding
const CARD_HEIGHT = 150; // mobile card
const TABLE_HEADER = 55;
const PAGINATION_BAR = 64;
const BOTTOM_GAP = 32; // page padding below the card
const MIN_ROWS = 5;
const MAX_ROWS = 15;

const HostBookings: React.FC = () => {
   const queryClient = useQueryClient();

   /* ---- URL is the source of truth for page / status / q ---- */
   const [params, setParams] = useSearchParams();
   const page = Math.max(1, Number(params.get('page')) || 1);
   const urlStatus = params.get('status');
   const filter: Filter = FILTER_KEYS.includes(urlStatus as Filter)
      ? (urlStatus as Filter)
      : 'all';
   const urlSearch = params.get('q') || '';

   const updateParams = (next: { page?: number; status?: Filter; q?: string }) => {
      const query = new URLSearchParams(params);
      const apply = (key: string, value: string | number | undefined, isDefault: boolean) => {
         if (value === undefined) return;
         if (isDefault) query.delete(key);
         else query.set(key, String(value));
      };
      apply('page', next.page, next.page === 1);
      apply('status', next.status, next.status === 'all');
      apply('q', next.q, next.q === '');
      setParams(query);
   };

   // The input reacts instantly; the URL (and the query) follow after the debounce.
   const [search, setSearch] = useState(urlSearch);
   const debouncedSearch = useDebounce(search, 350);

   useEffect(() => {
      if (debouncedSearch !== urlSearch) {
         updateParams({ q: debouncedSearch, page: 1 });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [debouncedSearch]);

   // Back/forward navigation changes the URL underneath us: reflect it in the input.
   const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);
   if (lastUrlSearch !== urlSearch) {
      setLastUrlSearch(urlSearch);
      setSearch(urlSearch);
   }

   /* ---- Rows per page: as many as fit on the screen ---- */
   // Below md the table becomes a card list (no horizontal scrolling on phones)
   const isCompact = useMediaQuery({ query: '(max-width: 767px)' });
   const tableRef = useRef<HTMLDivElement>(null);
   const pageSize = useRowsPerPage(tableRef, {
      rowHeight: isCompact ? CARD_HEIGHT : ROW_HEIGHT,
      reserved: (isCompact ? 0 : TABLE_HEADER) + PAGINATION_BAR + BOTTOM_GAP,
      min: isCompact ? 4 : MIN_ROWS,
      max: MAX_ROWS,
   });

   const { data, isLoading, isPlaceholderData } = useQuery({
      queryKey: ['bookings-host', { page, limit: pageSize, status: filter, search: urlSearch }],
      queryFn: () =>
         apiGetUserBookings({
            page,
            limit: pageSize as number,
            status: filter,
            search: urlSearch,
         }),
      // Wait for the first measurement so we do not fetch twice on mount.
      enabled: pageSize !== null,
      // Keeps the filter counts and total stable while the next page loads.
      placeholderData: keepPreviousData,
   });
   const showSkeleton = isLoading || isPlaceholderData || pageSize === null;

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

   const visible: HostBooking[] = useMemo(() => data?.data?.bookings || [], [data]);
   const counts: Record<string, number> = data?.data?.counts || {};
   const total: number = data?.data?.pagination?.total ?? 0;

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

   /** Mobile card for one booking (same data as the table row) */
   const renderCard = (booking: HostBooking) => {
      const nights = Math.max(
         moment(booking.checkOutTime).diff(moment(booking.checkInTime), 'days'),
         1,
      );
      return (
         <li key={booking._id} className="flex flex-col gap-3 p-4">
            <div className="flex gap-3 justify-between items-center">
               <div className="flex gap-3 items-center min-w-0">
                  <Avatar className="flex-shrink-0 text-blue-600 bg-blue-100 font-semibold">
                     {booking.guestName?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                  <div className="min-w-0">
                     <p className="text-sm font-semibold text-gray-900 truncate">
                        {booking.guestName || 'Guest'}
                     </p>
                     <p className="text-xs text-gray-500 truncate">{booking.email}</p>
                  </div>
               </div>
               <StatusBadge status={booking.status} />
            </div>

            <p className="text-sm font-medium text-gray-900 truncate">
               {booking.apartmentName}
               <span className="ml-1.5 font-normal text-gray-500">
                  ·{' '}
                  {booking.rooms
                     .map((room) =>
                        [room.roomType, `× ${room.roomNumber}`].filter(Boolean).join(' '),
                     )
                     .join(', ')}
               </span>
            </p>

            <div className="flex gap-3 justify-between items-center">
               <p className="flex gap-1.5 items-center text-xs text-gray-600">
                  <CalendarOutlined className="text-gray-400" />
                  {moment(booking.checkInTime).format('DD MMM')} –{' '}
                  {moment(booking.checkOutTime).format('DD MMM YYYY')}
                  <span className="text-gray-400">
                     · {nights} night{nights > 1 ? 's' : ''}
                  </span>
               </p>
               <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                  {booking.totalPrice?.toLocaleString()}{' '}
                  <span className="text-xs font-medium text-gray-400">VND</span>
               </span>
            </div>

            {booking.status === 'pending' && (
               <div className="grid grid-cols-2 gap-2 pt-1">
                  <Popconfirm
                     title="Decline this booking?"
                     okText="Decline"
                     okButtonProps={{ danger: true }}
                     onConfirm={() => declineMutation.mutate(booking._id)}
                  >
                     <Button
                        danger
                        icon={<CloseOutlined />}
                        loading={declineMutation.isPending}
                        className="h-9 rounded-lg"
                     >
                        Decline
                     </Button>
                  </Popconfirm>
                  <Button
                     type="primary"
                     icon={<CheckOutlined />}
                     loading={confirmMutation.isPending}
                     className="h-9 bg-blue-500 rounded-lg"
                     onClick={() => confirmMutation.mutate(booking._id)}
                  >
                     Confirm
                  </Button>
               </div>
            )}
         </li>
      );
   };

   return (
      <div className="min-h-screen bg-gray-50 font-main">
         <div className="px-4 pt-3 pb-8 mx-auto w-full max-w-main sm:px-5 lg:px-7">
            <h1 className="mb-4 text-xl font-bold tracking-tight text-gray-900 md:mb-5 md:text-2xl">
               Bookings
            </h1>

            <div className="flex flex-col gap-3 mb-4 md:flex-row md:flex-wrap md:justify-between md:items-center md:mb-5">
               <div className="flex overflow-x-auto gap-2 -mx-4 px-4 scrollbar-none sm:mx-0 sm:px-0">
                  {FILTERS.map((item) => (
                     <button
                        key={item.key}
                        onClick={() => updateParams({ status: item.key, page: 1 })}
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
                  className="h-10 rounded-full md:max-w-[280px]"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
               />
            </div>

            <div
               ref={tableRef}
               className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-card-sm"
            >
               {showSkeleton ? (
                  isCompact ? (
                     <BookingCardsSkeleton rows={pageSize ?? 4} />
                  ) : (
                     <BookingTableSkeleton rows={pageSize ?? MIN_ROWS} />
                  )
               ) : isCompact ? (
                  visible.length === 0 ? (
                     <div className="py-16 text-center text-gray-400">
                        No bookings found.
                     </div>
                  ) : (
                     <ul className="m-0 p-0 list-none divide-y divide-gray-100">
                        {visible.map(renderCard)}
                     </ul>
                  )
               ) : (
                  <Table
                     columns={columns}
                     dataSource={visible}
                     rowKey="_id"
                     pagination={false}
                     scroll={{ x: 900 }}
                  />
               )}
               {pageSize !== null && total > 0 && (
                  <div className="px-5">
                     <PaginationBar
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        onChange={(next) => updateParams({ page: next })}
                        itemLabel="booking"
                     />
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

export default HostBookings;
