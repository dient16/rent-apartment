'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from '@/lib/router-compat';
import {
   SearchSection,
   FilterSection,
   Results,
   SummaryCard,
} from '@/components';
import { apiSearchRoom } from '@/apis';
import { Drawer, Button } from 'antd';
import { useForm, FormProvider } from 'react-hook-form';
import { SearchOutlined } from '@ant-design/icons';
import moment from 'moment';
import { FiFilter } from 'react-icons/fi';

const Listing: React.FC = () => {
   const [searchParams, setSearchParams] = useSearchParams();
   const [drawerVisible, setDrawerVisible] = useState(false);
   const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);

   const methods = useForm();

   // 15 results per page (the BE defaults to 10)
   const queryString = React.useMemo(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (!params.get('limit')) params.set('limit', '15');
      return params.toString();
   }, [searchParams]);

   // isLoading (no data yet) so server-hydrated results render on SSR; a key change still shows the skeleton
   const { data, isLoading } = useQuery({
      queryKey: ['listing', queryString],
      queryFn: () => apiSearchRoom(queryString),
      staleTime: 0,
   });

   const roomNumber: number = +(searchParams.get('roomNumber') || 1) || 1;
   const numberOfGuest: number =
      +(searchParams.get('numberOfGuest') || 1) || 1;

   const handleSearch = (formData: Record<string, any>) => {
      const queryParams = new URLSearchParams();

      if (formData.searchText?.trim()) {
         queryParams.set('province', formData.searchText.trim());
      }
      if (formData.searchDate?.[0] && formData.searchDate?.[1]) {
         queryParams.set(
            'startDate',
            moment(formData.searchDate[0]).format('YYYY-MM-DD'),
         );
         queryParams.set(
            'endDate',
            moment(formData.searchDate[1]).format('YYYY-MM-DD'),
         );
      }
      if (formData.searchGuest) {
         queryParams.set(
            'numberOfGuest',
            String(formData.searchGuest.guests || 1),
         );
         queryParams.set('roomNumber', String(formData.searchGuest.rooms || 1));
      }
      if (
         formData.searchPrice?.[0] !== undefined &&
         formData.searchPrice?.[1] !== undefined
      ) {
         queryParams.set('minPrice', String(formData.searchPrice[0]));
         queryParams.set('maxPrice', String(formData.searchPrice[1]));
      }
      if (formData.bedType) {
         queryParams.set('bedType', formData.bedType);
      }
      if (formData.minRating) {
         queryParams.set('minRating', String(formData.minRating));
      }
      if (formData.amenities?.length) {
         queryParams.set('amenities', formData.amenities.join(','));
      }
      // Keep the current sort when searching again
      const sortBy = searchParams.get('sortBy');
      if (sortBy) queryParams.set('sortBy', sortBy);

      setSearchParams(queryParams);
      setDrawerVisible(false);
      setFilterDrawerVisible(false);
   };

   const handleChangePage = (page: number) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set('page', page.toString());
      setSearchParams(newSearchParams);
      // Back to the top of the results so the new page is visible
      window.scrollTo({ top: 0, behavior: 'smooth' });
   };

   const handleSortChange = (sortBy: string) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set('sortBy', sortBy);
      newSearchParams.delete('page');
      setSearchParams(newSearchParams);
   };

   const searchAndFilterForm = (
      <form onSubmit={methods.handleSubmit(handleSearch)}>
         <SearchSection searchParams={searchParams} />
         <Button
            className="mt-3 px-5 w-full bg-blue-500 rounded-full font-main h-[48px]"
            type="primary"
            icon={<SearchOutlined />}
            htmlType="submit"
         >
            Search
         </Button>
         <FilterSection />
      </form>
   );

   return (
      <div className="flex flex-col justify-center items-center w-full bg-gray-50 font-main">
         <div className="flex flex-col gap-6 px-5 mt-2 mb-5 w-full min-h-screen lg:flex-row lg:mt-8 max-w-main sm:px-5">
            {/* Mobile: summary + filter button */}
            <div className="flex justify-center items-center w-full lg:hidden">
               <SummaryCard
                  searchParams={searchParams}
                  onClick={() => setDrawerVisible(true)}
               />
               <span
                  onClick={() => setFilterDrawerVisible(true)}
                  className="ml-2 text-2xl cursor-pointer filter-icon"
               >
                  <FiFilter size={30} />
               </span>
            </div>

            <Drawer
               title="Search & Filter"
               placement="bottom"
               onClose={() => setDrawerVisible(false)}
               open={drawerVisible}
               className="lg:hidden"
               size="100%"
               zIndex={800}
            >
               <FormProvider {...methods}>{searchAndFilterForm}</FormProvider>
            </Drawer>

            <Drawer
               title="Filter"
               placement="bottom"
               onClose={() => setFilterDrawerVisible(false)}
               open={filterDrawerVisible}
               size="100%"
            >
               <FormProvider {...methods}>{searchAndFilterForm}</FormProvider>
            </Drawer>

            {/* Desktop sidebar */}
            <div className="hidden lg:block flex-shrink-0 w-[330px]">
               <div className="sticky top-24 p-5 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                  <FormProvider {...methods}>
                     {searchAndFilterForm}
                  </FormProvider>
               </div>
            </div>

            <div className="w-full min-w-0">
               <Results
                  data={data}
                  isFetching={isLoading}
                  numberOfGuest={numberOfGuest}
                  roomNumber={roomNumber}
                  searchParams={searchParams}
                  handleChangePage={handleChangePage}
                  handleSortChange={handleSortChange}
               />
            </div>
         </div>
      </div>
   );
};

export default Listing;
