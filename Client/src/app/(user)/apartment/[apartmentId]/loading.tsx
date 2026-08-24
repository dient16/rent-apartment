'use client';

import { Skeleton } from 'antd';

/** Mirrors the apartment detail layout: gallery on top, info + booking card below. */
export default function Loading() {
   return (
      <div className="flex justify-center w-full bg-gray-50 font-main">
         <div className="w-full max-w-main px-5 py-6">
            <Skeleton.Input active className="mb-4 w-80! h-8!" />
            <div className="grid grid-cols-1 gap-2 md:grid-cols-4 md:grid-rows-2 h-[420px] mb-6">
               <div className="md:col-span-2 md:row-span-2">
                  <Skeleton.Image active className="w-full! h-full! rounded-xl!" />
               </div>
               {[1, 2, 3, 4].map((index) => (
                  <Skeleton.Image
                     key={index}
                     active
                     className="w-full! h-full! rounded-xl! hidden md:block"
                  />
               ))}
            </div>
            <div className="flex flex-col gap-6 lg:flex-row">
               <div className="flex-1">
                  <Skeleton active paragraph={{ rows: 6 }} />
                  <Skeleton active paragraph={{ rows: 4 }} className="mt-6" />
               </div>
               <div className="w-full lg:w-[380px] flex-shrink-0">
                  <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                     <Skeleton active paragraph={{ rows: 5 }} />
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
