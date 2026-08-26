'use client';

import React from 'react';
import { Skeleton } from 'antd';

/*
 * Skeletons that mirror the real dashboard layout, so the page does not jump
 * when the data arrives. Used both as the route-level loading fallback and
 * inside the dashboard while the queries are in flight.
 */

const card = 'bg-white rounded-2xl border border-gray-100 shadow-card-sm';

/** One booking row: avatar, name + date line, status badge. */
export const BookingRowsSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
   <ul className="m-0 p-0 list-none divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, index) => (
         <li key={index} className="flex gap-3 justify-between items-center p-5">
            <div className="flex gap-3 items-center min-w-0">
               <Skeleton.Avatar active size={32} />
               <div className="flex flex-col gap-2">
                  <Skeleton.Input active size="small" className="w-52! h-3.5! min-w-0!" />
                  <Skeleton.Input active size="small" className="w-40! h-3! min-w-0!" />
               </div>
            </div>
            <Skeleton.Button active size="small" shape="round" className="w-20! h-6! min-w-0!" />
         </li>
      ))}
   </ul>
);

/** One listing row: square icon, title + location line. */
export const ListingRowsSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
   <ul className="m-0 p-0 list-none divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, index) => (
         <li key={index} className="flex gap-3 items-center p-5">
            <Skeleton.Avatar active shape="square" size={40} className="rounded-xl!" />
            <div className="flex flex-col flex-1 gap-2">
               <Skeleton.Input active size="small" className="w-3/4! h-3.5! min-w-0!" />
               <Skeleton.Input active size="small" className="w-1/2! h-3! min-w-0!" />
            </div>
         </li>
      ))}
   </ul>
);

/** Placeholder for the big number on a stat card. */
export const StatValueSkeleton: React.FC = () => (
   <Skeleton.Input active size="small" className="mt-1.5 w-24! h-5! min-w-0!" />
);

const STAT_TONES = ['bg-green-50', 'bg-blue-50', 'bg-amber-50', 'bg-purple-50'];

/** Full-page fallback shown while the dashboard chunk itself is loading. */
const HostDashboardSkeleton: React.FC = () => (
   <div className="min-h-screen bg-gray-50 font-main">
      <div className="px-5 pt-3 pb-8 mx-auto w-full max-w-main lg:px-7">
         <div className="flex flex-wrap gap-4 justify-between items-center mb-7">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">Dashboard</h1>
            <Skeleton.Button active shape="round" className="w-36! h-11!" />
         </div>

         {/* Stats */}
         <div className="grid grid-cols-2 gap-4 mb-7 lg:grid-cols-4">
            {STAT_TONES.map((tone) => (
               <div key={tone} className={`p-5 ${card}`}>
                  <span className={`block mb-4 w-11 h-11 rounded-xl ${tone}`} />
                  <Skeleton.Input active size="small" className="w-28! h-3! min-w-0!" />
                  <StatValueSkeleton />
               </div>
            ))}
         </div>

         <div className="grid gap-6 items-start lg:grid-cols-3">
            <div className={`${card} lg:col-span-2`}>
               <div className="flex justify-between items-center p-5 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">Recent bookings</h2>
                  <Skeleton.Input active size="small" className="w-16! h-4! min-w-0!" />
               </div>
               <BookingRowsSkeleton />
            </div>

            <div className={card}>
               <div className="flex justify-between items-center p-5 border-b border-gray-100">
                  <h2 className="text-base font-bold text-gray-900">Your listings</h2>
                  <Skeleton.Input active size="small" className="w-16! h-4! min-w-0!" />
               </div>
               <ListingRowsSkeleton />
            </div>
         </div>
      </div>
   </div>
);

export default HostDashboardSkeleton;
