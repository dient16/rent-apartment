import React, { useMemo, useState } from 'react';
import AppImage from '@/components/AppImage/AppImage';
import { Button, Empty, Input, Skeleton, Tooltip } from 'antd';
import {
   CalendarOutlined,
   EnvironmentOutlined,
   EyeOutlined,
   HomeOutlined,
   PlusOutlined,
   SearchOutlined,
} from '@ant-design/icons';
import { useNavigate } from '@/lib/router-compat';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { path } from '@/utils/constant';
import { apiGetApartmentByUser } from '@/apis';
import { useDebounce } from '@/hooks';
import PaginationBar from '@/components/SearchResult/PaginationBar';

interface HostListing {
   _id: string;
   title: string;
   images?: string[];
   minPrice?: number | null;
   location: {
      street?: string;
      ward?: string;
      district?: string;
      province?: string;
   };
   rooms: unknown[];
}

const PAGE_SIZE = 12;

const HostListings: React.FC = () => {
   const navigate = useNavigate();
   const [search, setSearch] = useState('');
   const [page, setPage] = useState(1);
   const debouncedSearch = useDebounce(search, 350);

   const [lastSearch, setLastSearch] = useState(debouncedSearch);
   if (lastSearch !== debouncedSearch) {
      setLastSearch(debouncedSearch);
      setPage(1);
   }

   const { data, isLoading } = useQuery({
      queryKey: ['apartments-host', page, debouncedSearch],
      queryFn: () =>
         apiGetApartmentByUser({ page, limit: PAGE_SIZE, search: debouncedSearch }),
      placeholderData: keepPreviousData,
   });

   const visible: HostListing[] = useMemo(() => data?.data?.apartments || [], [data]);
   const total: number = data?.data?.pagination?.total ?? 0;

   const locationText = (listing: HostListing) =>
      [listing.location?.district, listing.location?.province]
         .filter(Boolean)
         .filter((part, index, parts) => parts.indexOf(part) === index)
         .join(', ');

   return (
      <div className="min-h-screen bg-gray-50 font-main">
         <div className="px-5 py-8 mx-auto w-full max-w-main lg:px-7">
            <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
               <div>
                  <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                     Rental listings
                  </h1>
                  {!isLoading && (
                     <p className="mt-0.5 text-sm text-gray-500">
                        {total} listing{total !== 1 ? 's' : ''} published
                     </p>
                  )}
               </div>
               <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  className="h-11 bg-blue-500 rounded-full"
                  onClick={() =>
                     navigate(`${path.HOST_ROOT}${path.CREATE_APARTMENT}`)
                  }
               >
                  New listing
               </Button>
            </div>

            <div className="mb-6">
               <Input
                  allowClear
                  prefix={<SearchOutlined className="text-gray-400" />}
                  placeholder="Search by title or location"
                  className="h-10 rounded-full max-w-[320px]"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
               />
            </div>

            {isLoading ? (
               <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((index) => (
                     <div
                        key={index}
                        className="p-4 bg-white rounded-2xl shadow-card-sm"
                     >
                        <Skeleton.Image
                           active
                           className="w-full! h-44! rounded-xl!"
                        />
                        <Skeleton
                           active
                           paragraph={{ rows: 2 }}
                           className="mt-4"
                        />
                     </div>
                  ))}
               </div>
            ) : visible.length === 0 ? (
               <div className="flex flex-col items-center py-24 text-center bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                  {!debouncedSearch ? (
                     <>
                        <span className="flex justify-center items-center mb-5 w-16 h-16 text-2xl text-blue-500 bg-blue-50 rounded-full">
                           <HomeOutlined />
                        </span>
                        <h2 className="mb-2 text-lg font-semibold text-gray-900">
                           You have no listings yet
                        </h2>
                        <p className="mb-6 max-w-sm text-sm text-gray-500">
                           Create your first listing and start welcoming guests
                           — it only takes a few minutes.
                        </p>
                        <Button
                           type="primary"
                           size="large"
                           icon={<PlusOutlined />}
                           className="px-8 h-11 bg-blue-500 rounded-full"
                           onClick={() =>
                              navigate(
                                 `${path.HOST_ROOT}${path.CREATE_APARTMENT}`,
                              )
                           }
                        >
                           Create your first listing
                        </Button>
                     </>
                  ) : (
                     <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No listings match your search."
                     />
                  )}
               </div>
            ) : (
               <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((listing) => (
                     <div
                        key={listing._id}
                        className="flex overflow-hidden flex-col bg-white rounded-2xl border border-gray-100 transition-all duration-300 cursor-pointer group shadow-card-sm hover:shadow-card-md hover:border-blue-200"
                        onClick={() =>
                           navigate(
                              `${path.HOST_ROOT}apartment-rooms/${listing._id}`,
                           )
                        }
                     >
                        {/* Cover image */}
                        <div className="overflow-hidden relative h-44">
                           {listing.images?.[0] ? (
                              <AppImage
                                 src={listing.images[0]}
                                 alt={listing.title}
                                 wrapperClassName="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                              />
                           ) : (
                              <div className="flex justify-center items-center w-full h-full text-3xl text-blue-300 bg-blue-50">
                                 <HomeOutlined />
                              </div>
                           )}
                           <span className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold text-gray-700 rounded-full backdrop-blur-sm bg-white/90">
                              {listing.rooms?.length || 0} room type
                              {(listing.rooms?.length || 0) !== 1 ? 's' : ''}
                           </span>
                        </div>

                        {/* Noi dung */}
                        <div className="flex flex-col flex-1 p-5">
                           <Tooltip title={listing.title}>
                              <h3 className="text-base font-semibold text-gray-900 truncate transition-colors group-hover:text-blue-600">
                                 {listing.title}
                              </h3>
                           </Tooltip>
                           <p className="flex gap-1.5 items-center mt-1 text-sm text-gray-500">
                              <EnvironmentOutlined className="flex-shrink-0" />
                              <span className="truncate">
                                 {locationText(listing)}
                              </span>
                           </p>

                           <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                              <div>
                                 <p className="text-xs text-gray-400">From</p>
                                 <p className="text-base font-bold text-gray-900">
                                    {listing.minPrice != null
                                       ? `${listing.minPrice.toLocaleString()} `
                                       : '— '}
                                    <span className="text-xs font-medium text-gray-500">
                                       VND/night
                                    </span>
                                 </p>
                              </div>
                              <div
                                 className="flex gap-2"
                                 onClick={(event) => event.stopPropagation()}
                              >
                                 <Tooltip title="View details">
                                    <Button
                                       size="small"
                                       icon={<EyeOutlined />}
                                       className="rounded-full"
                                       onClick={() =>
                                          navigate(
                                             `${path.HOST_ROOT}apartment-rooms/${listing._id}`,
                                          )
                                       }
                                    />
                                 </Tooltip>
                                 <Tooltip title="Pricing calendar">
                                    <Button
                                       size="small"
                                       icon={<CalendarOutlined />}
                                       className="rounded-full"
                                       onClick={() =>
                                          navigate(
                                             `${path.HOST_ROOT}${path.HOST_CALENDAR}`,
                                          )
                                       }
                                    />
                                 </Tooltip>
                              </div>
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
            )}

            {!isLoading && total > 0 && (
               <PaginationBar
                  page={page}
                  pageSize={PAGE_SIZE}
                  total={total}
                  onChange={(next) => {
                     setPage(next);
                     window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  itemLabel="listing"
               />
            )}
         </div>
      </div>
   );
};

export default HostListings;
