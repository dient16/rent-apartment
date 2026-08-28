'use client';

import React, { useState } from 'react';
import { Drawer, Popover, Tooltip } from 'antd';
import { FiArrowLeft, FiBell, FiBellOff, FiLock } from 'react-icons/fi';
import Image from 'next/image';
import logo from '@/assets/logo-icon.png';
import { MenuAccount, UserAvatar } from '@/components';
import { useAuth, useIsHydrated } from '@/hooks';
import { Link } from '@/lib/router-compat';
import { path } from '@/utils/constant';
import { useChatNotifications } from './useChatNotifications';

/** Header of the standalone chat: brand, back link, notification toggle, account menu. */
const ChatHeader: React.FC = () => {
   const { user } = useAuth();
   const [menuOpen, setMenuOpen] = useState(false);
   const [drawerOpen, setDrawerOpen] = useState(false);
   const notifications = useChatNotifications();
   // the Notification API only exists in the browser - render the bell after hydration
   const hydrated = useIsHydrated();

   const pill = (
      <span className="flex gap-2 items-center py-1 pr-1 pl-3 bg-white rounded-full border border-gray-200 shadow-sm cursor-pointer select-none hover:shadow-md">
         <span className="hidden text-sm font-medium text-gray-700 sm:inline max-w-[140px] truncate">{user?.firstname || 'Account'}</span>
         <UserAvatar size={30} src={user?.avatar} name={user?.firstname} />
      </span>
   );

   return (
      <header className="flex-shrink-0 w-full bg-white/90 border-b border-gray-100 shadow-sm backdrop-blur">
         <div className="flex justify-between items-center px-3 mx-auto w-full h-[60px] sm:px-5 lg:px-7 max-w-main">
            <div className="flex gap-2 items-center min-w-0 sm:gap-3">
               <Tooltip title="Back to NestStay">
                  <Link
                     to={`/${path.HOME}`}
                     className="flex justify-center items-center w-9 h-9 text-gray-600 bg-gray-100 rounded-full transition-colors hover:bg-gray-200"
                     aria-label="Back to NestStay"
                  >
                     <FiArrowLeft size={18} />
                  </Link>
               </Tooltip>
               <Link to={`/${path.CHAT}`} className="flex gap-2 items-center min-w-0">
                  <Image src={logo} alt="" width={32} height={32} className="w-8 h-8" />
                  <span className="text-lg font-bold tracking-tight whitespace-nowrap">
                     <span className="text-gray-900">NestStay</span>{' '}
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-500">Chat</span>
                  </span>
               </Link>
               <span className="hidden gap-1.5 items-center px-2.5 py-1 ml-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full md:flex">
                  <FiLock size={12} /> Encrypted at rest
               </span>
            </div>

            <div className="flex gap-2 items-center">
               {hydrated && notifications.supported && (
                  <Tooltip
                     title={
                        notifications.permission === 'denied'
                           ? 'Notifications are blocked in the browser settings'
                           : notifications.enabled
                             ? 'Browser notifications on'
                             : 'Turn on browser notifications'
                     }
                  >
                     <button
                        type="button"
                        onClick={notifications.toggle}
                        disabled={notifications.permission === 'denied'}
                        className={`flex justify-center items-center w-9 h-9 rounded-full border-none transition-colors cursor-pointer disabled:cursor-not-allowed ${
                           notifications.enabled ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                        }`}
                        aria-label="Toggle browser notifications"
                     >
                        {notifications.enabled ? <FiBell size={17} /> : <FiBellOff size={17} />}
                     </button>
                  </Tooltip>
               )}
               <div className="hidden lg:block">
                  <Popover placement="bottomRight" arrow={false} trigger="click" open={menuOpen} onOpenChange={setMenuOpen} content={<MenuAccount onClose={() => setMenuOpen(false)} />}>
                     {pill}
                  </Popover>
               </div>
               <button type="button" onClick={() => setDrawerOpen(true)} className="p-0 bg-transparent border-none lg:hidden" aria-label="Account menu">
                  {pill}
               </button>
            </div>
            <Drawer placement="right" size={320} open={drawerOpen} onClose={() => setDrawerOpen(false)} closeIcon={null} styles={{ body: { padding: 0 }, header: { display: 'none' } }}>
               <MenuAccount variant="drawer" onClose={() => setDrawerOpen(false)} />
            </Drawer>
         </div>
      </header>
   );
};

export default ChatHeader;
