import { apiGetConversations, apiLogout } from '@/apis';
import { useQuery } from '@tanstack/react-query';
import { signOut } from '@/contexts/auth/reduces';
import { useAuth } from '@/hooks';
import { path } from '@/utils/constant';
import type { FC, ReactNode } from 'react';
import { Link } from '@/lib/router-compat';
import {
   IoHeartOutline,
   IoChatbubbleEllipsesOutline,
   IoCalendarOutline,
   IoGridOutline,
   IoListOutline,
   IoPersonOutline,
   IoLogOutOutline,
   IoHomeOutline,
   IoAirplaneOutline,
   IoBriefcaseOutline,
} from 'react-icons/io5';

interface MenuAccountProps {
   isHost?: boolean;
   onClose?: () => void;
   /** `popover` (desktop, fixed 240px) or `drawer` (mobile sidebar, fills its container). */
   variant?: 'popover' | 'drawer';
}

interface MenuEntry {
   icon: ReactNode;
   label: string;
   to: string;
   highlight?: boolean;
}

/** Role-based menu: guests see trip items, hosts see management items */
const guestMenu: MenuEntry[] = [
   {
      icon: <IoPersonOutline size={18} />,
      label: 'Manage account',
      to: `/${path.ACCOUNT_SETTINGS}/${path.PERSONAL_INFORMATION}`,
   },
   {
      icon: <IoCalendarOutline size={18} />,
      label: 'Booking & trips',
      to: `/${path.MY_BOOKING}`,
   },
   {
      icon: <IoHeartOutline size={18} />,
      label: 'My favorites',
      to: `/${path.FAVORITES}`,
   },
   {
      icon: <IoChatbubbleEllipsesOutline size={18} />,
      label: 'Messages',
      to: `/${path.MESSAGES}`,
   },
   {
      icon: <IoBriefcaseOutline size={18} />,
      label: 'Switch to hosting',
      to: `${path.HOST_ROOT}${path.HOST_DASHBOARD}`,
      highlight: true,
   },
];

const hostMenu: MenuEntry[] = [
   {
      icon: <IoGridOutline size={18} />,
      label: 'Dashboard',
      to: `${path.HOST_ROOT}${path.HOST_DASHBOARD}`,
   },
   {
      icon: <IoCalendarOutline size={18} />,
      label: 'Bookings',
      to: `${path.HOST_ROOT}${path.HOST_BOOKINGS}`,
   },
   {
      icon: <IoListOutline size={18} />,
      label: 'Rental listings',
      to: `${path.HOST_ROOT}${path.HOST_LISTINGS}`,
   },
   {
      icon: <IoChatbubbleEllipsesOutline size={18} />,
      label: 'Messages',
      to: `${path.HOST_ROOT}${path.HOST_MESSAGES}`,
   },
   {
      icon: <IoPersonOutline size={18} />,
      label: 'Manage account',
      to: `/${path.ACCOUNT_SETTINGS}/${path.PERSONAL_INFORMATION}`,
   },
   {
      icon: <IoAirplaneOutline size={18} />,
      label: 'Switch to traveling',
      to: `/${path.HOME}`,
      highlight: true,
   },
];

const MenuAccount: FC<MenuAccountProps> = ({
   isHost = false,
   onClose,
   variant = 'popover',
}) => {
   const { dispatch, user } = useAuth();
   const entries = isHost ? hostMenu : guestMenu;
   const isDrawer = variant === 'drawer';

   // Unread count for the Messages badge
   const { data: conversationsData } = useQuery({
      queryKey: ['conversations'],
      queryFn: apiGetConversations,
      refetchInterval: 30_000,
   });
   const unreadMessages: number = conversationsData?.data?.totalUnread || 0;

   const handleSignOut = async () => {
      onClose?.();
      try {
         // Revoke the refresh token server-side (cookie + DB) before clearing state
         await apiLogout();
      } finally {
         dispatch(signOut());
      }
   };

   const itemClass = isDrawer
      ? 'flex gap-3 items-center px-3 py-3 w-full text-[15px] font-medium rounded-xl transition-colors font-main'
      : 'flex gap-3 items-center px-3 py-2.5 w-full text-sm font-medium rounded-xl transition-colors font-main';

   return (
      <div className={isDrawer ? 'w-full font-main' : 'w-[240px] font-main'}>
         {/* Greeting + current role (the drawer already shows the user in its header) */}
         {!isDrawer && (
         <div className="flex gap-3 items-center px-3 pt-1 pb-3 border-b border-gray-100">
            <span className="flex justify-center items-center w-9 h-9 text-blue-600 bg-blue-50 rounded-full">
               {isHost ? (
                  <IoHomeOutline size={17} />
               ) : (
                  <IoPersonOutline size={17} />
               )}
            </span>
            <div className="min-w-0">
               <p className="text-sm font-semibold text-gray-900 truncate">
                  {[user?.firstname, user?.lastname]
                     .filter(Boolean)
                     .join(' ') || 'Welcome'}
               </p>
               <p className="text-xs text-gray-400">
                  {isHost ? 'Hosting mode' : 'Traveling mode'}
               </p>
            </div>
         </div>
         )}

         <div className="py-2">
            {isDrawer && (
               <p className="px-3 pt-1 pb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                  {isHost ? 'Hosting mode' : 'Traveling mode'}
               </p>
            )}
            {entries.map((entry) => (
               <Link
                  key={entry.label}
                  to={entry.to}
                  onClick={onClose}
                  className={`${itemClass} ${
                     entry.highlight
                        ? 'text-blue-600 hover:bg-blue-50'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
               >
                  <span
                     className={
                        entry.highlight ? 'text-blue-500' : 'text-gray-400'
                     }
                  >
                     {entry.icon}
                  </span>
                  <span className="flex-1">{entry.label}</span>
                  {entry.label === 'Messages' && unreadMessages > 0 && (
                     <span className="flex justify-center items-center px-1.5 h-5 min-w-[20px] text-[11px] font-bold text-white bg-blue-500 rounded-full">
                        {unreadMessages}
                     </span>
                  )}
               </Link>
            ))}
         </div>

         <div className="pt-2 border-t border-gray-100">
            <button
               type="button"
               onClick={handleSignOut}
               className={`${itemClass} text-rose-600 bg-transparent border-none cursor-pointer hover:bg-rose-50`}
            >
               <IoLogOutOutline size={18} className="text-rose-400" />
               Sign out
            </button>
         </div>
      </div>
   );
};

export default MenuAccount;
