'use client';

import { Skeleton } from 'antd';

/** Mirrors the listing layout so navigation feels instant instead of a blank page. */
export default function Loading() {
   return (
      <div className="flex flex-col items-center w-full bg-gray-50 font-main">
         <div className="flex flex-col gap-6 px-5 mt-2 mb-5 w-full min-h-screen lg:flex-row lg:mt-8 max-w-main sm:px-5">
            <div className="hidden lg:block flex-shrink-0 w-[330px]">
               <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                  <Skeleton active paragraph={{ rows: 8 }} />
               </div>
            </div>
            <div className="flex flex-col gap-4 w-full min-w-0">
               <div className="px-5 py-3.5 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                  <Skeleton.Input active className="w-48! h-6!" />
               </div>
               {[1, 2, 3, 4].map((index) => (
                  <div
                     key={index}
                     className="flex gap-5 p-4 bg-white rounded-2xl shadow-card-sm"
                  >
                     <Skeleton.Image
                        active
                        className="w-52! h-36! rounded-xl! hidden md:block"
                     />
                     <Skeleton active paragraph={{ rows: 3 }} />
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
}
