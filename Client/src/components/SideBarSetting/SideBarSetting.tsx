import { NavLink } from 'react-router-dom';
import { path } from '@/utils/constant';
import React from 'react';
import clsx from 'clsx';
import {
   IoPersonOutline,
   IoCardOutline,
   IoNotificationsOutline,
   IoSettingsOutline,
} from 'react-icons/io5';

const items = [
   {
      icon: <IoPersonOutline size={18} />,
      label: 'Personal information',
      description: 'Profile and contact details',
      to: `/${path.ACCOUNT_SETTINGS}/${path.PERSONAL_INFORMATION}`,
   },
   {
      icon: <IoCardOutline size={18} />,
      label: 'Payment information',
      description: 'Cards and payout methods',
      to: `/${path.ACCOUNT_SETTINGS}/${path.PAYMENT_INFORMATION}`,
   },
   {
      icon: <IoNotificationsOutline size={18} />,
      label: 'Notifications',
      description: 'Email and push preferences',
      to: `/${path.ACCOUNT_SETTINGS}/${path.NOTIFICATION_SETTINGS}`,
   },
   {
      icon: <IoSettingsOutline size={18} />,
      label: 'Settings',
      description: 'Password, language, account',
      to: `/${path.ACCOUNT_SETTINGS}/${path.SETTINGS}`,
   },
];

const SideBarSetting: React.FC = () => {
   return (
      <nav className="p-3 w-full bg-white rounded-2xl border border-gray-100 shadow-card-sm font-main">
         {items.map((item) => (
            <NavLink
               key={item.to}
               to={item.to}
               end
               className={({ isActive }) =>
                  clsx(
                     'flex relative gap-3 items-center px-4 py-3 mb-1 w-full rounded-xl transition-colors',
                     isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50',
                  )
               }
            >
               {({ isActive }) => (
                  <>
                     {isActive && (
                        <span className="absolute left-0 top-1/2 w-1 h-6 bg-blue-500 rounded-full -translate-y-1/2" />
                     )}
                     <span
                        className={clsx(
                           'flex flex-shrink-0 justify-center items-center w-9 h-9 rounded-xl',
                           isActive
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-500',
                        )}
                     >
                        {item.icon}
                     </span>
                     <span className="min-w-0">
                        <span
                           className={clsx(
                              'block text-sm font-semibold truncate',
                              isActive ? 'text-blue-600' : 'text-gray-900',
                           )}
                        >
                           {item.label}
                        </span>
                        <span className="block text-xs text-gray-400 truncate">
                           {item.description}
                        </span>
                     </span>
                  </>
               )}
            </NavLink>
         ))}
      </nav>
   );
};

export default SideBarSetting;
