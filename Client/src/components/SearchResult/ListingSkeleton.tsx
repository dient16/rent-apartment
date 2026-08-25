import React from 'react';
import clsx from 'clsx';

/**
 * Skeletons that mirror the real listing layout 1:1 (same card sizes, image
 * box, chip rows and sidebar sections), so the page does not jump when the
 * data arrives. Plain Tailwind blocks instead of antd Skeleton.Image, whose
 * inner box ignores width/height classes.
 */

const Bone: React.FC<{ className?: string }> = ({ className }) => (
   <span
      aria-hidden
      className={clsx(
         'block bg-gray-200/80 rounded-md animate-pulse',
         className,
      )}
   />
);

const Chip: React.FC<{ className?: string }> = ({ className }) => (
   <Bone className={clsx('h-7 rounded-full', className)} />
);

/** One result card: 288x256 image on desktop (full-width 208px on mobile) + text column. */
export const ResultCardSkeleton: React.FC = () => (
   <div className="flex overflow-hidden flex-col bg-white rounded-2xl border border-gray-100 md:flex-row shadow-card-sm">
      <Bone className="flex-shrink-0 w-full h-44 rounded-none md:w-72 md:h-64" />

      <div className="flex flex-col flex-1 p-4 min-w-0 md:p-5">
         <div className="flex gap-4 justify-between items-start">
            <div className="flex-1 min-w-0">
               <Bone className="w-3/5 h-6" />
               <Bone className="mt-2.5 w-4/5 h-4" />
            </div>
            <div className="flex flex-shrink-0 gap-2 items-center">
               <div className="flex flex-col gap-1.5 items-end">
                  <Bone className="w-16 h-4" />
                  <Bone className="w-12 h-3" />
               </div>
               <Bone className="w-10 h-10 rounded-xl" />
            </div>
         </div>

         <div className="flex flex-wrap gap-1.5 mt-3">
            <Chip className="w-20" />
            <Chip className="w-24" />
            <Chip className="w-12" />
            <Chip className="w-28" />
         </div>

         <div className="flex flex-wrap gap-3 justify-between items-end pt-4 mt-auto border-t border-gray-100">
            <div className="flex gap-4">
               <Bone className="w-16 h-3.5" />
               <Bone className="w-14 h-3.5" />
            </div>
            <div className="flex flex-col gap-1.5 items-end">
               <Bone className="w-28 h-6" />
               <Bone className="w-36 h-3" />
            </div>
         </div>
      </div>
   </div>
);

/** Result column: "N stays found" header + N cards. */
export const ResultsSkeleton: React.FC<{ count?: number }> = ({
   count = 4,
}) => (
   <div className="flex flex-col gap-3 w-full">
      <div className="flex justify-between items-center px-5 py-3.5 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
         <Bone className="w-32 h-5" />
         <Bone className="w-[180px] h-8" />
      </div>
      <div className="flex flex-col gap-4 w-full">
         {Array.from({ length: count }, (_, index) => (
            <ResultCardSkeleton key={index} />
         ))}
      </div>
   </div>
);

const FilterGroup: React.FC<{ chips: string[]; last?: boolean }> = ({
   chips,
   last,
}) => (
   <div className={clsx('py-4', !last && 'border-b border-gray-100')}>
      <Bone className="mb-3 w-24 h-4" />
      <div className="flex flex-wrap gap-2">
         {chips.map((width, index) => (
            <Chip key={index} className={clsx('h-8', width)} />
         ))}
      </div>
   </div>
);

/** Desktop sidebar: map teaser + "Filter by" card with the real section order. */
export const ListingSidebarSkeleton: React.FC = () => (
   <div className="flex flex-col flex-shrink-0 gap-4 w-[300px]">
      <Bone className="w-full h-[140px] rounded-2xl" />

      <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
         <div className="flex justify-between items-center mb-1">
            <Bone className="w-20 h-5" />
            <Bone className="w-14 h-4" />
         </div>

         {/* Budget per night */}
         <div className="py-4 border-b border-gray-100">
            <Bone className="mb-2 w-32 h-4" />
            <Bone className="mb-3 w-44 h-3" />
            <Bone className="my-3 w-full h-1.5 rounded-full" />
            <div className="flex gap-2 items-center mt-1">
               <Bone className="flex-1 h-9 rounded-full" />
               <span className="text-gray-300">–</span>
               <Bone className="flex-1 h-9 rounded-full" />
            </div>
         </div>

         <FilterGroup chips={['w-14', 'w-16', 'w-14']} />
         <FilterGroup chips={['w-16', 'w-[72px]', 'w-[70px]', 'w-14']} />
         <FilterGroup
            chips={['w-20', 'w-24', 'w-12', 'w-28', 'w-14', 'w-24', 'w-20']}
            last
         />
      </div>
   </div>
);

/** Top search bar (destination · dates · guests · Search button). */
export const SearchBarSkeleton: React.FC = () => (
   <div className="flex gap-1 items-center p-2 w-full bg-white rounded-2xl border border-gray-100 shadow-card-sm">
      <Bone className="flex-1 h-[46px] rounded-xl" />
      <span className="flex-shrink-0 w-px h-7 bg-gray-200" />
      <Bone className="flex-1 h-[46px] rounded-xl" />
      <span className="flex-shrink-0 w-px h-7 bg-gray-200" />
      <Bone className="flex-1 h-[46px] rounded-xl" />
      <Bone className="flex-shrink-0 w-[116px] h-[46px] rounded-xl" />
   </div>
);
