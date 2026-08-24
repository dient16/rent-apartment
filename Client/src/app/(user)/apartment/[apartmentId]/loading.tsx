import clsx from 'clsx';

const Bone = ({ className }: { className?: string }) => (
   <span
      aria-hidden
      className={clsx(
         'block bg-gray-200/80 rounded-md animate-pulse',
         className,
      )}
   />
);

/**
 * Mirrors the apartment detail layout: Airbnb-style gallery (one big photo
 * spanning 2x2, four small ones) on top, info + booking card below.
 * Sizes match ImageGallery so nothing jumps when the real content arrives.
 */
export default function Loading() {
   return (
      <div className="flex justify-center w-full bg-gray-50 font-main">
         <div className="px-5 py-6 w-full max-w-main">
            {/* Title + address */}
            <Bone className="w-80 h-8" />
            <Bone className="mt-3 w-64 h-4" />

            {/* Desktop gallery: same grid as ImageGallery */}
            <div className="hidden overflow-hidden grid-cols-4 grid-rows-2 gap-2 mt-8 w-full rounded-3xl lg:grid h-[440px]">
               <Bone className="col-span-2 row-span-2 h-full rounded-none" />
               {[1, 2, 3, 4].map((index) => (
                  <Bone key={index} className="h-full rounded-none" />
               ))}
            </div>

            {/* Mobile gallery: single carousel slide */}
            <Bone className="mt-6 w-full rounded-2xl lg:hidden h-[220px] sm:h-[280px] md:h-[380px]" />

            <div className="flex flex-col gap-6 mt-8 lg:flex-row">
               {/* Info column */}
               <div className="flex-1 min-w-0">
                  <Bone className="w-48 h-6" />
                  <div className="flex flex-col gap-2.5 mt-4">
                     <Bone className="w-full h-4" />
                     <Bone className="w-full h-4" />
                     <Bone className="w-11/12 h-4" />
                     <Bone className="w-4/5 h-4" />
                  </div>

                  <Bone className="mt-8 w-40 h-6" />
                  <div className="flex flex-wrap gap-2 mt-4">
                     {['w-24', 'w-28', 'w-16', 'w-32', 'w-20', 'w-28'].map(
                        (width, index) => (
                           <Bone
                              key={index}
                              className={clsx('h-8 rounded-full', width)}
                           />
                        ),
                     )}
                  </div>

                  <Bone className="mt-8 w-44 h-6" />
                  <div className="flex flex-col gap-4 mt-4">
                     {[1, 2].map((index) => (
                        <div
                           key={index}
                           className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-card-sm"
                        >
                           <Bone className="flex-shrink-0 w-40 h-28 rounded-xl" />
                           <div className="flex flex-col flex-1 gap-2.5">
                              <Bone className="w-1/2 h-5" />
                              <Bone className="w-3/4 h-4" />
                              <Bone className="mt-auto w-32 h-6" />
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Booking card */}
               <div className="flex-shrink-0 w-full lg:w-[380px]">
                  <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                     <Bone className="w-32 h-7" />
                     <Bone className="mt-2 w-24 h-4" />
                     <Bone className="mt-5 w-full h-[52px] rounded-xl" />
                     <Bone className="mt-3 w-full h-[52px] rounded-xl" />
                     <Bone className="mt-5 w-full h-12 rounded-full" />
                     <div className="flex justify-between mt-5">
                        <Bone className="w-24 h-4" />
                        <Bone className="w-20 h-4" />
                     </div>
                     <div className="flex justify-between mt-3">
                        <Bone className="w-28 h-4" />
                        <Bone className="w-16 h-4" />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
