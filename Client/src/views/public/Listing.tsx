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
import HorizontalSearchBar from '@/components/SearchResult/HorizontalSearchBar';
import MapExplore from '@/components/SearchResult/MapExplore';
import { apiSearchRoom } from '@/apis';
import { Drawer, Button } from 'antd';
import { useForm, FormProvider } from 'react-hook-form';
import { SearchOutlined } from '@ant-design/icons';
import moment from 'moment';
import clsx from 'clsx';
import { FiSliders, FiX } from 'react-icons/fi';

const SORT_OPTIONS = [
   { value: 'price_asc', label: 'Price ↑' },
   { value: 'price_desc', label: 'Price ↓' },
   { value: 'rating', label: 'Top rated' },
   // only meaningful for a "near this place" search (lat/lng in the URL)
   { value: 'distance', label: 'Nearest' },
];

/** Bottom sheet used for the mobile search / filter panels. */
const MobileSheet: React.FC<{
   title: string;
   open: boolean;
   onClose: () => void;
   children: React.ReactNode;
   footer?: React.ReactNode;
}> = ({ title, open, onClose, children, footer }) => (
   <Drawer
      placement="bottom"
      open={open}
      onClose={onClose}
      size="92%"
      closeIcon={null}
      zIndex={800}
      className="lg:hidden"
      styles={{
         header: { display: 'none' },
         body: { padding: 0 },
         section: { borderRadius: '20px 20px 0 0' },
      }}
   >
      <div className="flex flex-col h-full font-main">
         <div className="flex flex-shrink-0 justify-between items-center px-4 pt-3 pb-3 border-b border-gray-100">
            <span className="w-9" />
            <span className="text-base font-semibold text-gray-900">{title}</span>
            <button
               type="button"
               aria-label="Close"
               onClick={onClose}
               className="flex justify-center items-center w-9 h-9 text-gray-600 bg-gray-100 rounded-full border-none cursor-pointer"
            >
               <FiX size={18} />
            </button>
         </div>
         <div className="overflow-y-auto flex-1 px-4 py-4">{children}</div>
         {footer && (
            <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white">
               {footer}
            </div>
         )}
      </div>
   </Drawer>
);

const Listing: React.FC = () => {
   const [searchParams, setSearchParams] = useSearchParams();
   const [drawerVisible, setDrawerVisible] = useState(false);
   const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);

   // Filter state comes from the URL, so a reload (or a shared link) keeps the
   // active chips selected instead of resetting them.
   const filterValues = React.useMemo(() => {
      const minPrice = searchParams.get('minPrice');
      const maxPrice = searchParams.get('maxPrice');
      const minRating = searchParams.get('minRating');
      const amenities = searchParams.get('amenities');
      const lat = Number(searchParams.get('lat'));
      const lng = Number(searchParams.get('lng'));
      return {
         // A "near this place" search survives re-submits of the search bar
         searchPlace:
            Number.isFinite(lat) && Number.isFinite(lng) && searchParams.has('lat')
               ? { label: searchParams.get('province') || '', lat, lon: lng }
               : null,
         searchPrice:
            minPrice && maxPrice ? [Number(minPrice), Number(maxPrice)] : undefined,
         minRating: minRating ? Number(minRating) : undefined,
         bedType: searchParams.get('bedType') || undefined,
         amenities: amenities ? amenities.split(',').filter(Boolean) : [],
      };
   }, [searchParams]);

   const activeFilterCount =
      (filterValues.searchPrice ? 1 : 0) +
      (filterValues.minRating ? 1 : 0) +
      (filterValues.bedType ? 1 : 0) +
      filterValues.amenities.length;

   const methods = useForm({ defaultValues: filterValues });

   React.useEffect(() => {
      methods.reset({ ...methods.getValues(), ...filterValues });
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [filterValues]);

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

   const totalResults: number = data?.data?.totalResults || 0;
   const roomNumber: number = +(searchParams.get('roomNumber') || 1) || 1;
   const numberOfGuest: number =
      +(searchParams.get('numberOfGuest') || 1) || 1;
   const sortBy = searchParams.get('sortBy') || 'price_asc';
   const isNearSearch = searchParams.has('lat') && searchParams.has('lng');
   const sortOptions = SORT_OPTIONS.filter((option) => option.value !== 'distance' || isNearSearch);

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
      // Picked a point of interest -> "near here" search; a plain destination drops any
      // previous lat/lng so the name match applies again.
      const place = formData.searchPlace;
      const currentSort = searchParams.get('sortBy');
      if (place?.lat != null && place?.lon != null) {
         queryParams.set('lat', String(place.lat));
         queryParams.set('lng', String(place.lon));
         queryParams.set('radius', searchParams.get('radius') || '10');
         queryParams.set('sortBy', currentSort && currentSort !== 'distance' ? currentSort : 'distance');
      } else if (currentSort && currentSort !== 'distance') {
         // Keep the current sort when searching again
         queryParams.set('sortBy', currentSort);
      }

      setSearchParams(queryParams);
      setDrawerVisible(false);
      setFilterDrawerVisible(false);
   };

   // Filters apply straight away and are mirrored in the URL, so the chips and the
   // query string never drift apart.
   const applyFilters = (formData: Record<string, any>) => {
      const params = new URLSearchParams(searchParams.toString());

      const setOrDelete = (key: string, value?: string) => {
         if (value) {
            params.set(key, value);
         } else {
            params.delete(key);
         }
      };

      if (
         formData.searchPrice?.[0] !== undefined &&
         formData.searchPrice?.[1] !== undefined
      ) {
         params.set('minPrice', String(formData.searchPrice[0]));
         params.set('maxPrice', String(formData.searchPrice[1]));
      } else {
         params.delete('minPrice');
         params.delete('maxPrice');
      }
      setOrDelete('bedType', formData.bedType);
      setOrDelete(
         'minRating',
         formData.minRating ? String(formData.minRating) : undefined,
      );
      setOrDelete('amenities', formData.amenities?.length ? formData.amenities.join(',') : undefined);
      params.delete('page');

      setSearchParams(params);
   };

   const handleChangePage = (page: number) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set('page', page.toString());
      setSearchParams(newSearchParams);
      // Back to the top of the results so the new page is visible
      window.scrollTo({ top: 0, behavior: 'smooth' });
   };

   const handleSortChange = (nextSort: string) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set('sortBy', nextSort);
      newSearchParams.delete('page');
      setSearchParams(newSearchParams);
   };

   const resultsProps = {
      data,
      isFetching: isLoading,
      numberOfGuest,
      roomNumber,
      searchParams,
      handleChangePage,
      handleSortChange,
   };

   return (
      <div className="flex flex-col justify-center items-center w-full bg-gray-50 font-main">
         <div className="flex flex-col gap-4 px-4 mb-5 w-full min-h-screen sm:px-5 lg:flex-row lg:gap-6 lg:mt-4 max-w-main">
            {/* ===== Mobile / tablet: sticky search pill + toolbar ===== */}
            <div className="sticky top-[60px] z-30 -mx-4 px-4 pt-2 pb-2 bg-gray-50/95 backdrop-blur sm:-mx-5 sm:px-5 lg:hidden">
               <div className="flex gap-2 items-center">
                  <SummaryCard
                     searchParams={searchParams}
                     onClick={() => setDrawerVisible(true)}
                  />
                  <button
                     type="button"
                     aria-label="Filters"
                     onClick={() => setFilterDrawerVisible(true)}
                     className={clsx(
                        'flex relative flex-shrink-0 justify-center items-center w-12 h-12 rounded-full border shadow-card-sm cursor-pointer transition-colors',
                        activeFilterCount > 0
                           ? 'bg-blue-600 border-blue-600 text-white'
                           : 'bg-white border-gray-200 text-gray-700',
                     )}
                  >
                     <FiSliders size={18} />
                     {activeFilterCount > 0 && (
                        <span className="flex absolute -top-1 -right-1 justify-center items-center w-5 h-5 text-[11px] font-bold text-blue-600 bg-white rounded-full border-2 border-blue-600">
                           {activeFilterCount}
                        </span>
                     )}
                  </button>
               </div>

               {/* Map + sort chips */}
               <div className="flex overflow-x-auto gap-2 items-center pt-2 -mx-4 px-4 scrollbar-none sm:-mx-5 sm:px-5">
                  <MapExplore
                     variant="chip"
                     apartments={data?.data?.apartments || []}
                     detailQuery={queryString}
                  />
                  <span className="flex-shrink-0 w-px h-6 bg-gray-200" />
                  {sortOptions.map((option) => (
                     <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSortChange(option.value)}
                        className={clsx(
                           'flex-shrink-0 px-3.5 h-9 text-sm font-medium rounded-full border transition-colors cursor-pointer whitespace-nowrap',
                           sortBy === option.value
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-700 border-gray-200',
                        )}
                     >
                        {option.label}
                     </button>
                  ))}
               </div>
            </div>

            <MobileSheet
               title="Search"
               open={drawerVisible}
               onClose={() => setDrawerVisible(false)}
            >
               <FormProvider {...methods}>
                  <form
                     id="mobile-search-form"
                     onSubmit={methods.handleSubmit(handleSearch)}
                  >
                     <SearchSection searchParams={searchParams} />
                     <Button
                        className="mt-4 w-full font-semibold bg-blue-500 rounded-2xl h-[48px]"
                        type="primary"
                        icon={<SearchOutlined />}
                        htmlType="submit"
                     >
                        Search
                     </Button>
                  </form>
               </FormProvider>
            </MobileSheet>

            <MobileSheet
               title="Filters"
               open={filterDrawerVisible}
               onClose={() => setFilterDrawerVisible(false)}
               footer={
                  <Button
                     type="primary"
                     className="w-full font-semibold bg-blue-500 rounded-2xl h-[48px]"
                     onClick={() => setFilterDrawerVisible(false)}
                  >
                     {isLoading
                        ? 'Searching…'
                        : `Show ${totalResults} stay${totalResults !== 1 ? 's' : ''}`}
                  </Button>
               }
            >
               <FormProvider {...methods}>
                  {/* Filters apply instantly (they update the URL); no submit needed. */}
                  <div className="-mt-5">
                     <FilterSection onApply={applyFilters} />
                  </div>
               </FormProvider>
            </MobileSheet>

            {/* ===== Desktop: search bar on top, filters + results below ===== */}
            <div className="hidden lg:flex flex-col gap-5 w-full min-w-0">
               <FormProvider {...methods}>
                  <form onSubmit={methods.handleSubmit(handleSearch)}>
                     <HorizontalSearchBar searchParams={searchParams} />
                  </form>

                  <div className="flex gap-6 items-start w-full min-w-0">
                     <div className="flex flex-col flex-shrink-0 gap-4 w-[300px]">
                        <MapExplore
                           apartments={data?.data?.apartments || []}
                           detailQuery={queryString}
                        />
                        <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                           <FilterSection onApply={applyFilters} />
                        </div>
                     </div>

                     <div className="w-full min-w-0">
                        <Results {...resultsProps} />
                     </div>
                  </div>
               </FormProvider>
            </div>

            {/* ===== Mobile: results only (search/filter live in the sheets) ===== */}
            <div className="w-full min-w-0 lg:hidden">
               <Results {...resultsProps} showSortBar={false} />
            </div>
         </div>
      </div>
   );
};

export default Listing;
