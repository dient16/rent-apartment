import React, { useState } from 'react';
import { Button, Switch, message } from 'antd';

interface PreferenceItem {
   key: string;
   label: string;
   description: string;
   defaultOn?: boolean;
}

interface PreferenceGroup {
   title: string;
   items: PreferenceItem[];
}

const groups: PreferenceGroup[] = [
   {
      title: 'Booking activity',
      items: [
         {
            key: 'booking_updates',
            label: 'Booking updates',
            description: 'Confirmations, declines and changes to your trips',
            defaultOn: true,
         },
         {
            key: 'checkin_reminders',
            label: 'Check-in reminders',
            description: 'A reminder one day before your check-in date',
            defaultOn: true,
         },
      ],
   },
   {
      title: 'Messages',
      items: [
         {
            key: 'new_messages',
            label: 'New messages',
            description: 'When a host or guest sends you a message',
            defaultOn: true,
         },
      ],
   },
   {
      title: 'Offers & news',
      items: [
         {
            key: 'promotions',
            label: 'Promotions',
            description: 'Deals, discounts and seasonal offers',
         },
         {
            key: 'product_news',
            label: 'Product news',
            description: 'New features and improvements on Find House',
         },
      ],
   },
];

/** Notification settings UI — local state only, backend not wired yet */
const NotificationSettings: React.FC = () => {
   const [values, setValues] = useState<Record<string, boolean>>(() =>
      Object.fromEntries(
         groups.flatMap((group) =>
            group.items.map((item) => [item.key, !!item.defaultOn]),
         ),
      ),
   );

   const toggle = (key: string, next: boolean) =>
      setValues((prev) => ({ ...prev, [key]: next }));

   return (
      <div className="w-full font-main">
         <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-card-sm">
            <div className="p-4 border-b border-gray-100 md:p-8">
               <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
                  Notifications
               </h1>
               <p className="mt-0.5 text-sm text-gray-500">
                  Choose what you want to hear about and how.
               </p>
            </div>

            <div className="p-4 md:p-8">
               {groups.map((group, groupIndex) => (
                  <div
                     key={group.title}
                     className={groupIndex > 0 ? 'mt-6 md:mt-8' : ''}
                  >
                     <h2 className="mb-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                        {group.title}
                     </h2>
                     <div className="rounded-2xl border border-gray-100 divide-y divide-gray-100">
                        {group.items.map((item) => (
                           <div
                              key={item.key}
                              className="flex gap-4 justify-between items-center px-4 py-3.5 md:px-5 md:py-4"
                           >
                              <div className="min-w-0">
                                 <p className="text-sm font-semibold text-gray-900">
                                    {item.label}
                                 </p>
                                 <p className="text-xs text-gray-500">
                                    {item.description}
                                 </p>
                              </div>
                              <Switch
                                 checked={values[item.key]}
                                 onChange={(next) => toggle(item.key, next)}
                              />
                           </div>
                        ))}
                     </div>
                  </div>
               ))}

               <div className="flex justify-end mt-6 md:mt-8">
                  <Button
                     type="primary"
                     className="w-full h-10 bg-blue-500 rounded-full sm:px-7 sm:w-auto"
                     onClick={() =>
                        message.info('Saving preferences is coming soon')
                     }
                  >
                     Save preferences
                  </Button>
               </div>
            </div>
         </div>
      </div>
   );
};

export default NotificationSettings;
