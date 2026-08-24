import {
   ListingSidebarSkeleton,
   ResultsSkeleton,
   SearchBarSkeleton,
} from '@/components/SearchResult/ListingSkeleton';

/** Mirrors the listing layout (same wrappers as views/public/Listing) so navigation feels instant. */
export default function Loading() {
   return (
      <div className="flex flex-col justify-center items-center w-full bg-gray-50 font-main">
         <div className="flex flex-col gap-6 px-5 mt-2 mb-5 w-full min-h-screen lg:flex-row lg:mt-4 max-w-main sm:px-5">
            {/* Mobile: summary card + filter icon */}
            <div className="flex gap-2 items-center w-full lg:hidden">
               <span className="block flex-1 h-[52px] bg-gray-200/80 rounded-lg animate-pulse" />
               <span className="block flex-shrink-0 w-8 h-8 bg-gray-200/80 rounded-md animate-pulse" />
            </div>

            {/* Desktop */}
            <div className="hidden lg:flex flex-col gap-5 w-full min-w-0">
               <SearchBarSkeleton />
               <div className="flex gap-6 items-start w-full min-w-0">
                  <ListingSidebarSkeleton />
                  <div className="w-full min-w-0">
                     <ResultsSkeleton count={4} />
                  </div>
               </div>
            </div>

            {/* Mobile results */}
            <div className="w-full min-w-0 lg:hidden">
               <ResultsSkeleton count={3} />
            </div>
         </div>
      </div>
   );
}
