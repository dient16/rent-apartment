'use client';

import React from 'react';
import SideBarSetting from '@/components/SideBarSetting/SideBarSetting';

export default function AccountSettingsLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <div className="min-h-screen bg-gray-50 font-main">
         <div className="px-5 py-8 mx-auto w-full max-w-main lg:px-7">
            <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
               Account settings
            </h1>
            <div className="flex flex-col gap-6 items-start lg:flex-row">
               <div className="flex-shrink-0 w-full lg:w-[300px] lg:sticky lg:top-24">
                  <SideBarSetting />
               </div>
               <div className="flex-1 w-full min-w-0">{children}</div>
            </div>
         </div>
      </div>
   );
}
