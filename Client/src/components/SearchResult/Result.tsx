import React from 'react';
import { Button, Select, Skeleton } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import ResultItem from './ResultItem';
import PaginationBar from './PaginationBar';

interface ResultsProps {
   data: any;
   isFetching: boolean;
   numberOfGuest: number;
   roomNumber: number;
   searchParams: URLSearchParams;
   handleChangePage: (page: number) => void;
   handleSortChange?: (sortBy: string) => void;
}

const Results: React.FC<ResultsProps> = ({
   data,
   isFetching,
   numberOfGuest,
   roomNumber,
   searchParams,
   handleChangePage,
   handleSortChange,
}) => {
   const apartments: any[] = data?.data?.apartments || [];
   const totalResults: number = data?.data?.totalResults || 0;

   return (
      <div className="flex flex-col gap-3 w-full">
         {/* Header: result count + sort */}
         <div className="flex flex-wrap gap-3 justify-between items-center px-5 py-3.5 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
            <div className="text-sm font-semibold text-gray-900 md:text-base">
               {isFetching
                  ? 'Searching...'
                  : `${totalResults} stay${totalResults !== 1 ? 's' : ''} found`}
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

         <div className="flex flex-col gap-4 w-full">
            {isFetching ? (
               [1, 2, 3, 4].map((index) => (
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
               ))
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
