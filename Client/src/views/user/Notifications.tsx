import React, { useMemo, useState } from 'react';
import { Badge, Button, Empty, Skeleton } from 'antd';
import {
   BellOutlined,
   CheckCircleOutlined,
   CheckOutlined,
   InboxOutlined,
   MailOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@/lib/router-compat';
import moment from 'moment';
import clsx from 'clsx';
import {
   apiGetNotifications,
   apiMarkAllNotificationsRead,
   apiMarkNotificationRead,
} from '@/apis';
import {
   NOTIFICATION_TYPE_META,
   type NotificationItem,
} from '@/components/NotificationBell/NotificationBell';
import PaginationBar from '@/components/SearchResult/PaginationBar';

type Filter = 'all' | 'unread' | 'read';
const PAGE_SIZE = 10;

const Notifications: React.FC = () => {
   const navigate = useNavigate();
   const queryClient = useQueryClient();
   const [filter, setFilter] = useState<Filter>('all');
   const [page, setPage] = useState(1);

   const { data, isLoading } = useQuery({
      queryKey: ['notifications', filter, page],
      queryFn: () => apiGetNotifications({ filter, page, limit: PAGE_SIZE }),
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
      () => data?.data?.notifications || [],
      [data],
   );
   const total: number = data?.data?.total || 0;
   const unreadCount: number = data?.data?.unreadCount || 0;

   const openNotification = (notification: NotificationItem) => {
      if (!notification.isRead) {
         markReadMutation.mutate(notification._id);
      }
      if (notification.link) navigate(notification.link);
   };

   return (
      <div className="min-h-screen bg-gray-50 font-main">
         <div className="px-5 py-8 mx-auto w-full max-w-main lg:px-7">
            <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
               Notifications
            </h1>

            <div className="flex flex-col gap-6 items-start lg:flex-row">
               {/* ===== Sidebar filter ===== */}
               <div className="flex-shrink-0 w-full lg:w-[280px] lg:sticky lg:top-24">
                  <nav className="p-3 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                     {(
                        [
                           {
                              key: 'all',
                              label: 'All notifications',
                              icon: <InboxOutlined />,
                              count: total,
                           },
                           {
                              key: 'unread',
                              label: 'Unread',
                              icon: <MailOutlined />,
                              count: unreadCount,
                           },
                           {
                              key: 'read',
                              label: 'Read',
                              icon: <CheckCircleOutlined />,
                              count: undefined,
                           },
                        ] as const
                     ).map((item) => (
                        <button
                           key={item.key}
                           type="button"
                           onClick={() => {
                              setFilter(item.key);
                              setPage(1);
                           }}
                           className={clsx(
                              'flex relative gap-3 items-center px-4 py-3 mb-1 w-full text-left rounded-xl border-none transition-colors cursor-pointer',
                              filter === item.key
                                 ? 'bg-blue-50 text-blue-600'
                                 : 'bg-transparent text-gray-700 hover:bg-gray-50',
                           )}
                        >
                           {filter === item.key && (
                              <span className="absolute left-0 top-1/2 w-1 h-6 bg-blue-500 rounded-full -translate-y-1/2" />
                           )}
                           <span
                              className={clsx(
                                 'flex flex-shrink-0 justify-center items-center w-9 h-9 rounded-xl',
                                 filter === item.key
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-gray-100 text-gray-500',
                              )}
                           >
                              {item.icon}
                           </span>
                           <span className="flex-1 text-sm font-semibold">
                              {item.label}
                           </span>
                           {item.count !== undefined && item.count > 0 && (
                              <span
                                 className={clsx(
                                    'flex justify-center items-center px-1.5 h-5 min-w-[20px] text-[11px] font-bold rounded-full',
                                    item.key === 'unread'
                                       ? 'text-white bg-blue-500'
                                       : 'text-gray-500 bg-gray-100',
                                 )}
                              >
                                 {item.count}
                              </span>
                           )}
                        </button>
                     ))}

                     <div className="pt-2 mt-1 border-t border-gray-100">
                        <Button
                           block
                           icon={<CheckOutlined />}
                           className="h-10 rounded-xl"
                           disabled={unreadCount === 0}
                           loading={markAllMutation.isPending}
                           onClick={() => markAllMutation.mutate()}
                        >
                           Mark all read
                        </Button>
                     </div>
                  </nav>
               </div>

               {/* ===== List ===== */}
               <div className="flex-1 w-full min-w-0">
            <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-card-sm">
               {isLoading ? (
                  <div className="p-6">
                     <Skeleton active paragraph={{ rows: 6 }} />
                  </div>
               ) : notifications.length === 0 ? (
                  <Empty
                     className="py-20"
                     image={Empty.PRESENTED_IMAGE_SIMPLE}
                     description={
                        filter === 'all'
                           ? "You're all caught up — no notifications yet."
                           : `No ${filter} notifications.`
                     }
                  />
               ) : (
                  <ul className="divide-y divide-gray-100">
                     {notifications.map((notification) => {
                        const meta = NOTIFICATION_TYPE_META[notification.type];
                        return (
                           <li key={notification._id}>
                              <button
                                 type="button"
                                 onClick={() => openNotification(notification)}
                                 className={clsx(
                                    'flex gap-4 items-start p-5 w-full text-left bg-transparent border-none transition-colors cursor-pointer hover:bg-gray-50',
                                    !notification.isRead && 'bg-blue-50/40',
                                 )}
                              >
                                 <span
                                    className={clsx(
                                       'flex flex-shrink-0 justify-center items-center w-11 h-11 text-base rounded-full',
                                       meta.avatar,
                                    )}
                                 >
                                    <BellOutlined />
                                 </span>
                                 <span className="flex-1 min-w-0">
                                    <span className="flex flex-wrap gap-2 items-center">
                                       <span
                                          className={clsx(
                                             'px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md',
                                             meta.chip,
                                          )}
                                       >
                                          {meta.label}
                                       </span>
                                       <span className="text-sm font-semibold text-gray-900">
                                          {notification.title}
                                       </span>
                                       <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
                                          {moment(
                                             notification.createdAt,
                                          ).fromNow()}
                                       </span>
                                    </span>
                                    <span className="block mt-1 text-sm leading-relaxed text-gray-600">
                                       {notification.message}
                                    </span>
                                 </span>
                                 {!notification.isRead && (
                                    <Badge status="processing" />
                                 )}
                              </button>
                           </li>
                        );
                     })}
                  </ul>
               )}
            </div>

                  {total > 0 && (
                     <PaginationBar
                        page={page}
                        pageSize={PAGE_SIZE}
                        total={total}
                        onChange={(next) => {
                           setPage(next);
                           window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        itemLabel="notification"
                     />
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default Notifications;
