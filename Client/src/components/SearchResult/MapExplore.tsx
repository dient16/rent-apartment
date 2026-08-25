'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Modal, Spin } from 'antd';
import { FaMapMarkedAlt } from 'react-icons/fa';
import { IoClose } from 'react-icons/io5';

// Leaflet touches `window` — load only on the client, when the modal opens
const ExploreMap = dynamic(() => import('./ExploreMap'), {
   ssr: false,
   loading: () => (
      <div className="flex justify-center items-center w-full h-full">
         <Spin size="large" />
      </div>
   ),
});

interface MapExploreProps {
   apartments: any[];
   detailQuery: string;
   /** `card`: sidebar teaser (desktop). `chip`: small pill for the mobile toolbar. */
   variant?: 'card' | 'chip';
}

/** Sidebar teaser card + fullscreen map modal with price markers. */
const MapExplore: React.FC<MapExploreProps> = ({
   apartments,
   detailQuery,
   variant = 'card',
}) => {
   const [open, setOpen] = useState(false);

   return (
      <>
         {variant === 'chip' ? (
            <button
               type="button"
               onClick={() => setOpen(true)}
               className="flex flex-shrink-0 gap-1.5 items-center px-3.5 h-9 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-full border-none shadow-sm cursor-pointer whitespace-nowrap"
            >
               <FaMapMarkedAlt size={14} /> Map
            </button>
         ) : (
         <button
            type="button"
            onClick={() => setOpen(true)}
            className="overflow-hidden relative p-0 w-full bg-transparent rounded-2xl border border-blue-100 shadow-card-sm transition-shadow cursor-pointer group h-[140px] hover:shadow-lg hover:shadow-blue-100"
         >
            {/* Stylized mini-map */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50">
               {/* roads */}
               <span className="absolute -left-4 top-6 w-[120%] h-[10px] bg-white rounded-full rotate-[8deg] shadow-sm" />
               <span className="absolute -left-4 top-[70px] w-[120%] h-[7px] bg-white rounded-full -rotate-[6deg]" />
               <span className="absolute left-1/3 -top-4 w-[8px] h-[140%] bg-white rounded-full rotate-[14deg]" />
               {/* blocks & park */}
               <span className="absolute right-5 top-5 w-12 h-8 rounded-lg bg-blue-100/80" />
               <span className="absolute left-5 bottom-4 w-14 h-9 rounded-lg bg-blue-100/80" />
               <span className="absolute right-10 bottom-6 w-9 h-9 rounded-full bg-emerald-100" />
               {/* mini price dots */}
               <span className="absolute left-[22%] top-[30%] w-2.5 h-2.5 bg-rose-400 rounded-full ring-2 ring-white" />
               <span className="absolute right-[26%] top-[58%] w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-white" />
               <span className="absolute left-[55%] top-[18%] w-2.5 h-2.5 bg-blue-400 rounded-full ring-2 ring-white" />
            </div>

            {/* Center pin + CTA */}
            <div className="flex absolute inset-0 flex-col gap-2.5 justify-center items-center">
               <span className="relative flex justify-center items-center w-12 h-12 text-white bg-gradient-to-br from-blue-500 to-blue-700 rounded-full shadow-lg shadow-blue-500/40 transition-transform duration-200 group-hover:scale-110 group-hover:-translate-y-0.5">
                  <FaMapMarkedAlt size={19} />
                  <span className="absolute inset-0 rounded-full bg-blue-400/50 animate-ping [animation-duration:2.2s]" />
               </span>
               <span className="flex gap-1.5 items-center px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-full shadow-md shadow-blue-500/30 transition-transform duration-200 font-main group-hover:scale-105">
                  Explore on Map
               </span>
            </div>
         </button>
         )}

         {/* Fullscreen map */}
         <Modal
            open={open}
            onCancel={() => setOpen(false)}
            footer={null}
            closeIcon={
               <span className="flex justify-center items-center w-10 h-10 text-gray-600 bg-white rounded-full shadow-md border border-gray-200 transition-colors hover:bg-gray-100 hover:text-gray-900">
                  <IoClose size={22} />
               </span>
            }
            centered={false}
            width="100vw"
            style={{ top: 0, maxWidth: '100vw', margin: 0, padding: 0 }}
            styles={{
               container: { height: '100dvh', padding: 0, borderRadius: 0, overflow: 'hidden' },
               body: { height: '100%' },
               // Let the round 40px icon breathe and float above the map panes
               close: { width: 'auto', height: 'auto', top: 14, insetInlineEnd: 14, zIndex: 1100 },
            }}
            destroyOnHidden
         >
            <div className="relative w-full h-full">
               <ExploreMap apartments={apartments} detailQuery={detailQuery} />
               <div className="absolute top-4 left-1/2 z-[1000] px-4 py-2 text-xs font-medium text-gray-700 bg-white/95 rounded-full shadow-md -translate-x-1/2">
                  Prices are the lowest room rate per night
               </div>
            </div>
         </Modal>
      </>
   );
};

export default MapExplore;
