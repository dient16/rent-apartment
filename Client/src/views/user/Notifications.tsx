import React, { useMemo } from 'react';
import { Badge, Button, Empty, Skeleton, Tooltip } from 'antd';
import {
   BellOutlined,
   CheckCircleOutlined,
   CheckOutlined,
   InboxOutlined,
   MailOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from '@/lib/router-compat';
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
const FILTERS: Filter[] = ['all', 'unread', 'read'];
const PAGE_SIZE = 10;

/** One notification row placeholder: icon, chip + time, title, two message lines. */
const RowSkeleton: React.FC = () => (
   <li className="flex gap-3 items-start p-4 md:gap-4 md:p-5">
      <Skeleton.Avatar active size={40} />
      <div className="flex flex-col flex-1 gap-2 min-w-0">
         <div className="flex justify-between items-center">
            <Skeleton.Input active size="small" className="w-16! h-4! min-w-0!" />
            <Skeleton.Input active size="small" className="w-14! h-3! min-w-0!" />
         </div>
         <Skeleton.Input active size="small" className="w-2/3! h-4! min-w-0!" />
         <Skeleton.Input active size="small" className="w-full! h-3! min-w-0!" />
         <Skeleton.Input active size="small" className="w-4/5! h-3! min-w-0!" />
      </div>
   </li>
);

const Notifications: React.FC = () => {
   const navigate = useNavigate();
   const queryClient = useQueryClient();

   /* ---- URL is the source of truth: ?filter=unread&page=2 ---- */
   const [params, setParams] = useSearchParams();
   const urlFilter = params.get('filter') as Filter | null;
   const filter: Filter = urlFilter && FILTERS.includes(urlFilter) ? urlFilter : 'all';
   const page = Math.max(1, Number(params.get('page')) || 1);

   const updateParams = (next: { filter?: Filter; page?: number }) => {
      const query = new URLSearchParams(params);
      if (next.filter !== undefined) {
         if (next.filter === 'all') query.delete('filter');
         else query.set('filter', next.filter);
      }
      if (next.page !== undefined) {
         if (next.page === 1) query.delete('page');
         else query.set('page', String(next.page));
      }
      setParams(query);
   };

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

   const filterItems = [
      {
         key: 'all' as const,
         label: 'All notifications',
         shortLabel: 'All',
         icon: <InboxOutlined />,
         count: total,
      },
      {
         key: 'unread' as const,
         label: 'Unread',
         shortLabel: 'Unread',
         icon: <MailOutlined />,
         count: unreadCount,
      },
      {
         key: 'read' as const,
         label: 'Read',
         shortLabel: 'Read',
         icon: <CheckCircleOutlined />,
         count: undefined,
      },
   ];

   const selectFilter = (next: Filter) => updateParams({ filter: next, page: 1 });

   return (
      <div className="min-h-screen bg-gray-50 font-main">
         <div className="px-4 pt-3 pb-8 mx-auto w-full max-w-main sm:px-5 lg:px-7">
            {/* Title + (mobile) mark-all shortcut */}
            <div className="flex justify-between items-center mb-4 md:mb-6">
               <h1 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">
                  Notifications
                  {unreadCount > 0 && (
                     <span className="ml-2 align-middle px-2 py-0.5 text-xs font-bold text-white bg-blue-500 rounded-full">
                        {unreadCount}
                     </span>
                  )}
               </h1>
               <Tooltip title="Mark all as read">
                  <Button
                     shape="circle"
                     icon={<CheckOutlined />}
                     className="lg:hidden"
                     disabled={unreadCount === 0}
                     loading={markAllMutation.isPending}
                     onClick={() => markAllMutation.mutate()}
                  />
               </Tooltip>
            </div>

            {/* Mobile/tablet: segmented chips */}
            <div className="flex gap-2 mb-4 lg:hidden">
               {filterItems.map((item) => (
                  <button
                     key={item.key}
                     type="button"
                     onClick={() => selectFilter(item.key)}
                     className={clsx(
                        'flex flex-1 gap-1.5 justify-center items-center h-10 text-sm font-semibold rounded-full border transition-colors cursor-pointer',
                        filter === item.key
                           ? 'bg-blue-500 text-white border-blue-500'
                           : 'bg-white text-gray-600 border-gray-200',
                     )}
                  >
                     {item.shortLabel}
                     {item.count !== undefined && item.count > 0 && (
                        <span
                           className={clsx(
                              'px-1.5 h-5 min-w-[20px] flex items-center justify-center text-[11px] font-bold rounded-full',
                              filter === item.key
                                 ? 'bg-white/25 text-white'
                                 : item.key === 'unread'
                                   ? 'bg-blue-500 text-white'
                                   : 'bg-gray-100 text-gray-500',
                           )}
                        >
                           {item.count}
                        </span>
                     )}
                  </button>
               ))}
            </div>

            <div className="flex flex-col gap-6 items-start lg:flex-row">
               {/* ===== Desktop sidebar filter ===== */}
               <div className="hidden flex-shrink-0 lg:block lg:w-[280px] lg:sticky lg:top-24">
                  <nav className="p-3 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                     {filterItems.map((item) => (
                        <button
                           key={item.key}
                           type="button"
                           onClick={() => selectFilter(item.key)}
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
                        <ul className="m-0 p-0 list-none divide-y divide-gray-100">
                           {[1, 2, 3, 4, 5].map((index) => (
                              <RowSkeleton key={index} />
                           ))}
                        </ul>
                     ) : notifications.length === 0 ? (
                        <Empty
                           className="py-16 md:py-20"
                           image={Empty.PRESENTED_IMAGE_SIMPLE}
                           description={
                              filter === 'all'
                                 ? "You're all caught up — no notifications yet."
                                 : `No ${filter} notifications.`
                           }
                        />
                     ) : (
                        <ul className="m-0 p-0 list-none divide-y divide-gray-100">
                           {notifications.map((notification) => {
                              const meta = NOTIFICATION_TYPE_META[notification.type];
                              return (
                                 <li key={notification._id}>
                                    <button
                                       type="button"
                                       onClick={() => openNotification(notification)}
                                       className={clsx(
                                          'flex gap-3 items-start p-4 w-full text-left bg-transparent border-none transition-colors cursor-pointer md:gap-4 md:p-5 hover:bg-gray-50',
                                          !notification.isRead && 'bg-blue-50/40',
                                       )}
                                    >
                                       <span
                                          className={clsx(
                                             'flex flex-shrink-0 justify-center items-center w-10 h-10 text-base rounded-full md:w-11 md:h-11',
                                             meta.avatar,
                                          )}
                                       >
                                          <BellOutlined />
                                       </span>
                                       <span className="flex-1 min-w-0">
                                          {/* Chip + time on one row; title below so it never fights for space */}
                                          <span className="flex gap-2 justify-between items-center">
                                             <span
                                                className={clsx(
                                                   'px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-md',
                                                   meta.chip,
                                                )}
                                             >
                                                {meta.label}
                                             </span>
                                             <span className="flex gap-2 items-center text-xs text-gray-400 whitespace-nowrap">
                                                {moment(notification.createdAt).fromNow()}
                                                {!notification.isRead && (
                                                   <Badge status="processing" />
                                                )}
                                             </span>
                                          </span>
                                          <span
                                             className={clsx(
                                                'block mt-1.5 text-sm text-gray-900',
                                                notification.isRead
                                                   ? 'font-medium'
                                                   : 'font-semibold',
                                             )}
                                          >
                                             {notification.title}
                                          </span>
                                          <span className="block mt-0.5 text-sm leading-relaxed text-gray-600 line-clamp-2 md:line-clamp-none">
                                             {notification.message}
                                          </span>
                                       </span>
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
                           updateParams({ page: next });
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
