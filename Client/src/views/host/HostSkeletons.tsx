'use client';

import React from 'react';
import { Skeleton } from 'antd';

/*
 * Layout-matching skeletons for the host pages. Each page has a "content"
 * skeleton (used inside the view while its query is loading) and a "page"
 * skeleton (the route-level fallback while the chunk itself loads) built
 * from the same pieces, so nothing jumps between the two and the real data.
 */

const card = 'bg-white rounded-2xl border border-gray-100 shadow-card-sm';
const page = 'min-h-screen bg-gray-50 font-main';
const container = 'px-5 pt-3 pb-8 mx-auto w-full max-w-main lg:px-7';

/** Thin grey bar — `Skeleton.Input` with the antd min-width removed so tailwind widths apply. */
const Line: React.FC<{ className?: string }> = ({ className = 'w-32 h-3.5' }) => (
   <Skeleton.Input active size="small" className={`${className}! min-w-0! block!`} />
);

const Circle: React.FC<{ size?: number }> = ({ size = 32 }) => (
   <Skeleton.Avatar active size={size} />
);

const Pill: React.FC<{ className?: string }> = ({ className = 'w-24 h-10' }) => (
   <Skeleton.Button active shape="round" className={`${className}! min-w-0!`} />
);

/* ======================= Bookings ======================= */

/** Table rows: guest | stay | dates | total | status | actions. */
export const BookingTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
   <div className="overflow-x-auto">
      <div className="min-w-[900px]">
         <div className="grid grid-cols-[1.4fr_1.4fr_1.2fr_0.8fr_0.7fr_0.9fr] gap-4 px-4 py-4 bg-gray-50 border-b border-gray-100">
            {['w-12', 'w-10', 'w-12', 'w-10', 'w-12', 'w-0'].map((width, index) => (
               <Line key={index} className={`${width} h-3`} />
            ))}
         </div>
         <ul className="m-0 p-0 list-none divide-y divide-gray-100">
            {Array.from({ length: rows }).map((_, index) => (
               <li
                  key={index}
                  className="grid grid-cols-[1.4fr_1.4fr_1.2fr_0.8fr_0.7fr_0.9fr] gap-4 items-center px-4 py-4"
               >
                  <div className="flex gap-3 items-center">
                     <Circle />
                     <div className="flex flex-col gap-2">
                        <Line className="w-28 h-3.5" />
                        <Line className="w-36 h-3" />
                     </div>
                  </div>
                  <div className="flex flex-col gap-2">
                     <Line className="w-40 h-3.5" />
                     <Line className="w-24 h-3" />
                  </div>
                  <div className="flex flex-col gap-2">
                     <Line className="w-36 h-3.5" />
                     <Line className="w-14 h-3" />
                  </div>
                  <div className="flex justify-end">
                     <Line className="w-24 h-3.5" />
                  </div>
                  <div className="flex justify-center">
                     <Pill className="w-20 h-6" />
                  </div>
                  <div className="flex gap-2 justify-end">
                     <Pill className="w-20 h-6" />
                     <Pill className="w-20 h-6" />
                  </div>
               </li>
            ))}
         </ul>
      </div>
   </div>
);

/** Mobile booking cards: guest row, stay, dates, total + status. */
export const BookingCardsSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
   <ul className="m-0 p-0 list-none divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, index) => (
         <li key={index} className="flex flex-col gap-3 p-4">
            <div className="flex gap-3 justify-between items-center">
               <div className="flex gap-3 items-center">
                  <Circle size={36} />
                  <div className="flex flex-col gap-2">
                     <Line className="w-28 h-3.5" />
                     <Line className="w-36 h-3" />
                  </div>
               </div>
               <Pill className="w-20 h-6" />
            </div>
            <Line className="w-3/4 h-3.5" />
            <div className="flex justify-between items-center">
               <Line className="w-36 h-3" />
               <Line className="w-24 h-4" />
            </div>
         </li>
      ))}
   </ul>
);

export const BookingsPageSkeleton: React.FC = () => (
   <div className={page}>
      <div className={container}>
         <h1 className="mb-4 text-xl font-bold tracking-tight text-gray-900 md:mb-6 md:text-2xl">Bookings</h1>
         <div className="flex flex-wrap gap-3 justify-between items-center mb-4 md:mb-5">
            <div className="flex overflow-hidden gap-2">
               {['w-16', 'w-24', 'w-28', 'w-28', 'w-24'].map((width, index) => (
                  <Pill key={index} className={`${width} h-9`} />
               ))}
            </div>
            <Pill className="w-full h-10 md:w-[280px]" />
         </div>
         <div className={`overflow-hidden ${card}`}>
            <div className="md:hidden">
               <BookingCardsSkeleton />
            </div>
            <div className="hidden md:block">
               <BookingTableSkeleton />
            </div>
         </div>
      </div>
   </div>
);

/* ======================= Listings ======================= */

/** Grid of listing cards: cover, title, location, price + two round buttons. */
export const ListingCardsSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
   <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
         <div key={index} className={`flex overflow-hidden flex-col ${card}`}>
            <Skeleton.Image active className="w-full! h-44! rounded-none!" />
            <div className="flex flex-col flex-1 p-5">
               <Line className="w-3/4 h-4" />
               <div className="mt-2.5">
                  <Line className="w-1/2 h-3" />
               </div>
               <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                  <div className="flex flex-col gap-2">
                     <Line className="w-10 h-2.5" />
                     <Line className="w-28 h-4" />
                  </div>
                  <div className="flex gap-2">
                     <Circle size={24} />
                     <Circle size={24} />
                  </div>
               </div>
            </div>
         </div>
      ))}
   </div>
);

export const ListingsPageSkeleton: React.FC = () => (
   <div className={page}>
      <div className={container}>
         <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
            <div>
               <h1 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">Rental listings</h1>
               <div className="mt-2">
                  <Line className="w-36 h-3" />
               </div>
            </div>
            <Pill className="w-36 h-11" />
         </div>
         <div className="mb-6">
            <Pill className="w-[320px] h-10" />
         </div>
         <ListingCardsSkeleton />
      </div>
   </div>
);

/* ======================= Room detail ======================= */

/** Gallery, header card with 4 stats, then three room-type cards. */
export const RoomDetailSkeleton: React.FC = () => (
   <>
      <div className="grid overflow-hidden grid-cols-4 grid-rows-2 gap-2 mb-6 rounded-2xl h-[320px] md:h-[380px]">
         <Skeleton.Image active className="col-span-4 row-span-2 w-full! h-full! rounded-none! md:col-span-2" />
         {[1, 2, 3, 4].map((index) => (
            <Skeleton.Image key={index} active className="hidden w-full! h-full! rounded-none! md:block!" />
         ))}
      </div>

      <div className={`p-6 mb-6 md:p-8 ${card}`}>
         <div className="flex flex-wrap gap-4 justify-between items-start">
            <div className="flex flex-col gap-3">
               <Line className="w-72 h-7" />
               <Line className="w-96 max-w-full h-3.5" />
            </div>
            <Pill className="w-44 h-11" />
         </div>
         <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-gray-100 md:grid-cols-4">
            {[1, 2, 3, 4].map((index) => (
               <div key={index} className="flex gap-3 items-center">
                  <Skeleton.Avatar active shape="square" size={40} className="rounded-xl!" />
                  <div className="flex flex-col gap-2">
                     <Line className="w-16 h-2.5" />
                     <Line className="w-20 h-3.5" />
                  </div>
               </div>
            ))}
         </div>
         <div className="flex flex-col gap-2 pt-6 mt-6 border-t border-gray-100">
            <Line className="w-full max-w-3xl h-3" />
            <Line className="w-2/3 h-3" />
         </div>
      </div>

      <div className="mb-4">
         <Line className="w-40 h-5" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
         {[1, 2, 3].map((index) => (
            <div key={index} className={`flex overflow-hidden flex-col ${card}`}>
               <Skeleton.Image active className="w-full! h-48! rounded-none!" />
               <div className="flex flex-col flex-1 p-5">
                  <Line className="w-1/2 h-4" />
                  <div className="flex gap-4 mt-3">
                     <Line className="w-16 h-3" />
                     <Line className="w-16 h-3" />
                     <Line className="w-12 h-3" />
                  </div>
                  <div className="flex gap-1.5 mt-3">
                     <Pill className="w-16 h-5" />
                     <Pill className="w-20 h-5" />
                     <Pill className="w-14 h-5" />
                  </div>
                  <div className="flex flex-col gap-2 pt-3 mt-4 border-t border-gray-100">
                     <Line className="w-20 h-2.5" />
                     <Line className="w-32 h-5" />
                  </div>
               </div>
            </div>
         ))}
      </div>
   </>
);

export const RoomDetailPageSkeleton: React.FC = () => (
   <div className={page}>
      <div className={container}>
         <div className="mb-5">
            <Line className="w-32 h-3.5" />
         </div>
         <RoomDetailSkeleton />
      </div>
   </div>
);

/* ======================= Pricing calendar ======================= */

/** Room thumbnails in the left rail. */
export const CalendarRailSkeleton: React.FC = () => (
   <div className="flex flex-row gap-3 items-center lg:flex-col">
      <Line className="w-14 h-2.5" />
      {[1, 2, 3].map((index) => (
         <Skeleton.Avatar key={index} active shape="square" size={56} className="rounded-xl!" />
      ))}
   </div>
);

/** Weekday header + a 6-week grid of day cells. */
export const CalendarGridSkeleton: React.FC = () => (
   <>
      <div className="grid grid-cols-7 pb-2 border-b border-gray-100">
         {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex justify-center py-1">
               <Line className="w-8 h-3" />
            </div>
         ))}
      </div>
      <div className="pt-3">
         <div className="mb-2">
            <Line className="w-40 h-5" />
         </div>
         <div className="grid grid-cols-7 gap-1.5 md:gap-2 animate-pulse">
            {Array.from({ length: 42 }).map((_, index) => (
               <div
                  key={index}
                  className="flex flex-col gap-1.5 justify-center items-center h-16 bg-gray-100 rounded-xl md:h-[72px]"
               >
                  <span className="w-4 h-2.5 bg-gray-200 rounded" />
                  <span className="w-8 h-2 bg-gray-200 rounded" />
               </div>
            ))}
         </div>
      </div>
   </>
);

export const CalendarPageSkeleton: React.FC = () => (
   <div className={page}>
      <div className={container}>
         <h1 className="mb-4 md:mb-5 text-xl font-bold tracking-tight text-gray-900 md:text-2xl">Pricing calendar</h1>
         <div className="flex flex-col gap-5 items-start lg:flex-row">
            <div className={`flex flex-row flex-shrink-0 gap-3 p-3 w-full lg:flex-col lg:w-24 lg:items-center ${card}`}>
               <CalendarRailSkeleton />
            </div>

            <div className={`flex-1 p-5 w-full min-w-0 md:p-6 ${card}`}>
               <div className="flex flex-wrap gap-3 justify-between items-center mb-5">
                  <Line className="w-48 h-7" />
                  <div className="flex gap-2 items-center">
                     <Circle size={32} />
                     <Pill className="w-20 h-8" />
                     <Circle size={32} />
                     <Pill className="w-32 h-9" />
                  </div>
               </div>
               <CalendarGridSkeleton />
            </div>

            <div className={`flex-shrink-0 p-6 w-full lg:w-72 ${card}`}>
               <Line className="w-16 h-2.5" />
               <Skeleton.Image active className="mt-3 w-full! h-32! rounded-xl!" />
               <div className="flex flex-col gap-2 mt-3">
                  <Line className="w-3/4 h-3.5" />
                  <Line className="w-1/2 h-3" />
                  <div className="mt-2">
                     <Line className="w-40 h-5" />
                  </div>
                  <Line className="w-full h-3" />
                  <Line className="w-2/3 h-3" />
               </div>
            </div>
         </div>
      </div>
   </div>
);

/* ======================= Create listing ======================= */

export const CreateApartmentPageSkeleton: React.FC = () => (
   <div className={page}>
      <div className={container}>
         <div className="mb-5">
            <Line className="w-32 h-3.5" />
         </div>
         <h1 className="mb-4 md:mb-5 text-xl font-bold tracking-tight text-gray-900 md:text-2xl">Create new listing</h1>

         <div className={`p-4 mb-5 lg:hidden ${card}`}>
            <div className="flex gap-3 justify-between">
               {[1, 2, 3, 4].map((index) => (
                  <Line key={index} className="flex-1 h-3" />
               ))}
            </div>
         </div>

         <div className="flex gap-6 items-start">
            <div className={`hidden flex-shrink-0 p-6 w-72 lg:block ${card}`}>
               <div className="flex flex-col gap-6">
                  {[1, 2, 3, 4].map((index) => (
                     <div key={index} className="flex gap-3 items-start">
                        <Circle size={28} />
                        <div className="flex flex-col gap-2 pt-1">
                           <Line className="w-28 h-3.5" />
                           <Line className="w-40 h-3" />
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            <div className={`flex-1 min-w-0 ${card}`}>
               <div className="p-6 md:p-8 min-h-[560px]">
                  <Line className="w-48 h-5" />
                  <div className="mt-2 mb-6">
                     <Line className="w-72 h-3" />
                  </div>
                  <div className="flex flex-col gap-5">
                     {[1, 2, 3, 4].map((index) => (
                        <div key={index} className="flex flex-col gap-2">
                           <Line className="w-24 h-3" />
                           <Pill className="w-full h-11" />
                        </div>
                     ))}
                     <div className="flex flex-col gap-2">
                        <Line className="w-24 h-3" />
                        <Skeleton.Input active className="w-full! h-28! min-w-0! rounded-xl!" />
                     </div>
                  </div>
               </div>
               <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 md:px-8">
                  <span />
                  <Line className="w-16 h-3" />
                  <Pill className="w-28 h-11" />
               </div>
            </div>
         </div>
      </div>
   </div>
);
