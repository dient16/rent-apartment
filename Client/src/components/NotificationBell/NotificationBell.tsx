import React, { useMemo, useState } from 'react';
import { Button, Empty, Popover, Skeleton } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import {
   useInfiniteQuery,
   useMutation,
   useQueryClient,
} from '@tanstack/react-query';
import { Link, useNavigate } from '@/lib/router-compat';
import moment from 'moment';
import clsx from 'clsx';
import {
   apiGetNotifications,
   apiMarkAllNotificationsRead,
   apiMarkNotificationRead,
} from '@/apis';
import { path } from '@/utils/constant';

export interface NotificationItem {
   _id: string;
   type: 'booking_created' | 'booking_confirmed' | 'booking_canceled' | 'new_message';
   title: string;
   message: string;
   link?: string;
   isRead: boolean;
   createdAt: string;
}

export const NOTIFICATION_TYPE_META: Record<
   NotificationItem['type'],
   { label: string; chip: string; avatar: string }
> = {
   booking_created: {
      label: 'New booking',
      chip: 'bg-blue-50 text-blue-600',
      avatar: 'bg-blue-100 text-blue-600',
   },
   booking_confirmed: {
      label: 'Confirmed',
      chip: 'bg-green-50 text-green-600',
      avatar: 'bg-green-100 text-green-600',
   },
   booking_canceled: {
      label: 'Canceled',
      chip: 'bg-rose-50 text-rose-600',
      avatar: 'bg-rose-100 text-rose-600',
   },
   new_message: {
      label: 'Message',
      chip: 'bg-violet-50 text-violet-600',
      avatar: 'bg-violet-100 text-violet-600',
   },
};

const FILTERS = ['all', 'unread', 'read'] as const;
type Filter = (typeof FILTERS)[number];

const NotificationBell: React.FC = () => {
   const navigate = useNavigate();
   const queryClient = useQueryClient();
   const [open, setOpen] = useState(false);
   const [filter, setFilter] = useState<Filter>('all');

   const PAGE_SIZE = 8;
   // Infinite scroll: each page appends; the next page is derived from the total.
   const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
      useInfiniteQuery({
         queryKey: ['notifications', filter],
         queryFn: ({ pageParam }) =>
            apiGetNotifications({ filter, page: pageParam, limit: PAGE_SIZE }),
         initialPageParam: 1,
         getNextPageParam: (lastPage, allPages) => {
            const total: number = lastPage?.data?.total || 0;
            const loaded = allPages.reduce(
               (count, page) => count + (page?.data?.notifications?.length || 0),
               0,
            );
            return loaded < total ? allPages.length + 1 : undefined;
         },
         refetchInterval: 30_000,
      });

   const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

   const markReadMutation = useMutation({
      mutationFn: apiMarkNotificationRead,
      onSuccess: invalidate,
   });
   const markAllMutation = useMutation({
      mutationFn: apiMarkAllNotificationsRead,
      onSuccess: invalidate,
   });

   const notifications: NotificationItem[] = useMemo(
      () =>
         (data?.pages || []).flatMap(
            (page: any) => page?.data?.notifications || [],
         ),
      [data],
   );
   const unreadCount: number = data?.pages?.[0]?.data?.unreadCount || 0;

   // Load the next page when the list is scrolled near the bottom.
   const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
      if (
         scrollHeight - scrollTop - clientHeight < 60 &&
         hasNextPage &&
         !isFetchingNextPage
      ) {
         fetchNextPage();
      }
   };

   const openNotification = (notification: NotificationItem) => {
      if (!notification.isRead) {
         markReadMutation.mutate(notification._id);
      }
      setOpen(false);
      if (notification.link) navigate(notification.link);
   };

   const panel = (
      <div className="w-[380px] max-w-[90vw] font-main">
         <div className="flex justify-between items-center px-1 pb-3">
            <div className="flex gap-2 items-center">
               <span className="text-base font-bold text-gray-900">
                  Notifications
               </span>
               {unreadCount > 0 && (
                  <span className="flex justify-center items-center px-2 h-5 min-w-[20px] text-xs font-bold text-white bg-blue-500 rounded-full">
                     {unreadCount}
                  </span>
               )}
            </div>
            <Button
               type="link"
               size="small"
               className="p-0 text-blue-600"
               disabled={unreadCount === 0}
               loading={markAllMutation.isPending}
               onClick={() => markAllMutation.mutate()}
            >
               Mark all read
            </Button>
         </div>

         <div className="flex gap-1 px-1 pb-2 border-b border-gray-100">
            {FILTERS.map((item) => (
               <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={clsx(
                     'px-3 py-1.5 text-sm font-medium capitalize rounded-full border-none transition-colors cursor-pointer',
                     filter === item
                        ? 'bg-gray-900 text-white'
                        : 'bg-transparent text-gray-500 hover:bg-gray-100',
                  )}
               >
                  {item}
               </button>
            ))}
         </div>

         <div className="overflow-y-auto max-h-[380px]" onScroll={handleScroll}>
            {isLoading ? (
               <div className="p-4">
                  <Skeleton active paragraph={{ rows: 3 }} />
               </div>
            ) : notifications.length === 0 ? (
               <Empty
                  className="py-8"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="You're all caught up"
               />
            ) : (
               notifications.map((notification) => {
                  const meta = NOTIFICATION_TYPE_META[notification.type];
                  return (
                     <button
                        key={notification._id}
                        type="button"
                        onClick={() => openNotification(notification)}
                        className={clsx(
                           'flex gap-3 items-start px-2 py-3 w-full text-left bg-transparent border-none border-b border-gray-50 transition-colors cursor-pointer hover:bg-gray-50 rounded-lg',
                           !notification.isRead && 'bg-blue-50/40',
                        )}
                     >
                        <span
                           className={clsx(
                              'flex flex-shrink-0 justify-center items-center w-10 h-10 text-sm font-bold rounded-full',
                              meta.avatar,
                           )}
                        >
                           <BellOutlined />
                        </span>
                        <span className="flex-1 min-w-0">
                           <span className="flex gap-2 justify-between items-center">
                              <span
                                 className={clsx(
                                    'px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md',
                                    meta.chip,
                                 )}
                              >
                                 {meta.label}
                              </span>
                              <span className="flex-shrink-0 text-xs text-gray-400">
                                 {moment(notification.createdAt).fromNow()}
                              </span>
                           </span>
                           <span className="block mt-1 text-sm font-semibold text-gray-900 truncate">
                              {notification.title}
                           </span>
                           <span className="block mt-0.5 text-xs leading-snug text-gray-500 line-clamp-2">
                              {notification.message}
                           </span>
                        </span>
                        {!notification.isRead && (
                           <span className="flex-shrink-0 mt-1 w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                     </button>
                  );
               })
            )}
            {isFetchingNextPage && (
               <div className="px-4 py-2">
                  <Skeleton active paragraph={{ rows: 1 }} title={false} />
               </div>
            )}
         </div>

         <div className="pt-2 text-center border-t border-gray-100">
            <Link
               to={`/${path.NOTIFICATIONS}`}
               className="inline-flex gap-1 items-center text-sm font-medium text-blue-600 hover:underline"
               onClick={() => setOpen(false)}
            >
               View all notifications <CheckOutlined className="hidden" />→
            </Link>
         </div>
      </div>
   );

   return (
      <Popover
         open={open}
         onOpenChange={(next) => {
            // On mobile the popover is cramped — go straight to the page instead
            if (next && window.innerWidth < 1024) {
               navigate(`/${path.NOTIFICATIONS}`);
               return;
            }
            setOpen(next);
         }}
         content={panel}
         trigger="click"
         placement="bottomRight"
         arrow={false}
      >
         <button
            type="button"
            aria-label="Notifications"
            className="flex relative justify-center items-center w-10 h-10 text-gray-600 bg-transparent rounded-full border-none transition-colors cursor-pointer hover:bg-gray-100"
         >
            <BellOutlined className="text-[20px] text-gray-600" />
            {unreadCount > 0 && (
               <span className="flex absolute top-0.5 right-0.5 justify-center items-center px-1 h-4 min-w-[16px] text-[10px] font-bold leading-none text-white bg-red-500 rounded-full ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
               </span>
            )}
         </button>
      </Popover>
   );
};

export default NotificationBell;
