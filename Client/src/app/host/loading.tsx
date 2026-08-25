'use client';

import { Skeleton } from 'antd';

/** Fallback for host pages while a route chunk or server render is loading. */
export default function Loading() {
   return (
      <div className="w-full px-6 pt-3 pb-8">
         <Skeleton.Input active className="mb-6 w-56! h-8!" />
         <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((index) => (
               <div
                  key={index}
                  className="p-4 bg-white rounded-2xl border border-gray-100 shadow-card-sm"
               >
                  <Skeleton active paragraph={{ rows: 3 }} />
               </div>
            ))}
         </div>
      </div>
   );
}
