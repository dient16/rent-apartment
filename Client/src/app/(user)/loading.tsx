'use client';

import { Skeleton } from 'antd';

/** Instant fallback while a server page renders — shown by the App Router on navigation. */
export default function Loading() {
   return (
      <div className="flex justify-center w-full bg-gray-50 font-main">
         <div className="w-full max-w-main px-5 pt-3 pb-8">
            <Skeleton.Input active className="mb-6 w-64! h-8!" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
               {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
                  <div
                     key={index}
                     className="p-3 bg-white rounded-2xl border border-gray-100 shadow-card-sm"
                  >
                     <Skeleton.Image active className="w-full! h-40! rounded-xl!" />
                     <Skeleton active paragraph={{ rows: 2 }} className="mt-3" />
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
}
