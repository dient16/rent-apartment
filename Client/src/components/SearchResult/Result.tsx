import React from 'react';
import { Button, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import ResultItem from './ResultItem';
import PaginationBar from './PaginationBar';
import { ResultCardSkeleton } from './ListingSkeleton';

interface ResultsProps {
   data: any;
   isFetching: boolean;
   numberOfGuest: number;
   roomNumber: number;
   searchParams: URLSearchParams;
   handleChangePage: (page: number) => void;
   handleSortChange?: (sortBy: string) => void;
   /** Mobile puts sort in its toolbar, so the header card is replaced by a plain count. */
   showSortBar?: boolean;
}

const Results: React.FC<ResultsProps> = ({
   data,
   isFetching,
   numberOfGuest,
   roomNumber,
   searchParams,
   handleChangePage,
   handleSortChange,
   showSortBar = true,
}) => {
   const apartments: any[] = data?.data?.apartments || [];
   const totalResults: number = data?.data?.totalResults || 0;
   const countLabel = isFetching
      ? 'Searching...'
      : `${totalResults} stay${totalResults !== 1 ? 's' : ''} found`;

   return (
      <div className="flex flex-col gap-3 w-full">
         {/* Header: result count + sort */}
         {showSortBar ? (
         <div className="flex flex-wrap gap-3 justify-between items-center px-5 py-3.5 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
            <div className="text-sm font-semibold text-gray-900 md:text-base">
               {countLabel}
            </div>
            <Select
               className="min-w-[180px]"
               value={searchParams.get('sortBy') || 'price_asc'}
               onChange={(value) => handleSortChange?.(value)}
               options={[
                  { value: 'price_asc', label: 'Price: low to high' },
                  { value: 'price_desc', label: 'Price: high to low' },
                  { value: 'rating', label: 'Top rated' },
               ]}
            />
         </div>
         ) : (
            <p className="px-1 text-sm font-semibold text-gray-900">{countLabel}</p>
         )}

         <div className="flex flex-col gap-4 w-full">
            {isFetching ? (
               [1, 2, 3, 4].map((index) => <ResultCardSkeleton key={index} />)
            ) : apartments.length === 0 ? (
               <div className="flex flex-col items-center py-20 text-center bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                  <span className="flex justify-center items-center mb-5 w-16 h-16 text-2xl text-blue-400 bg-blue-50 rounded-full">
                     <SearchOutlined />
                  </span>
                  <h2 className="mb-2 text-lg font-semibold text-gray-900">
                     No stays match your search
                  </h2>
                  <p className="mb-5 max-w-sm text-sm text-gray-500">
                     Try adjusting the dates, destination or removing some
                     filters to see more results.
                  </p>
                  <Button
                     className="rounded-full"
                     onClick={() => {
                        window.location.href = '/listing';
                     }}
                  >
                     Reset search
                  </Button>
               </div>
            ) : (
               apartments.map((room) => (
                  <ResultItem
                     key={room._id}
                     room={room}
                     roomNumber={roomNumber}
                     numberOfGuest={numberOfGuest}
                     searchParams={searchParams}
                  />
               ))
            )}
         </div>

         {totalResults > 0 && (
            <PaginationBar
               page={+(searchParams.get('page') || 1)}
               pageSize={+(searchParams.get('limit') || 15)}
               total={totalResults}
               onChange={handleChangePage}
               itemLabel="stay"
            />
         )}
      </div>
   );
};

export default Results;
