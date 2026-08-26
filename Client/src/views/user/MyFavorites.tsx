import React, { useState } from 'react';
import AppImage from '@/components/AppImage/AppImage';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button, Carousel, Skeleton, Tooltip } from 'antd';
import { HeartOutlined } from '@ant-design/icons';
import { FaLocationDot } from 'react-icons/fa6';
import { useNavigate } from '@/lib/router-compat';
import moment from 'moment';
import { apiGetFavorites } from '@/apis';
import PaginationBar from '@/components/SearchResult/PaginationBar';
import { FavoriteButton } from '@/components';
import { useAuth } from '@/hooks';
import { path } from '@/utils/constant';

interface FavoriteApartment {
   _id: string;
   title: string;
   location: { district?: string; province?: string };
   images: string[];
   price: number | null;
   avgRating: number;
}

const PAGE_SIZE = 12;

const MyFavorites: React.FC = () => {
   const navigate = useNavigate();
   const { isAuthenticated, setAuthModal } = useAuth();
   const [page, setPage] = useState(1);

   const { data, isLoading } = useQuery({
      queryKey: ['favorites', page],
      queryFn: () => apiGetFavorites({ page, limit: PAGE_SIZE }),
      enabled: isAuthenticated,
      placeholderData: keepPreviousData,
   });

   const favorites: FavoriteApartment[] = data?.data?.favorites || [];
   const total: number = data?.data?.pagination?.total ?? 0;

   const goToApartment = (apartmentId: string) => {
      navigate(
         `/apartment/${apartmentId}?startDate=${moment().format(
            'YYYY-MM-DD',
         )}&endDate=${moment()
            .add(1, 'day')
            .format('YYYY-MM-DD')}&numberOfGuest=1&roomNumber=1`,
      );
   };

   return (
      <div className="min-h-screen bg-gray-50 font-main">
         <div className="px-5 pt-3 pb-10 mx-auto w-full max-w-main lg:px-7">
            <h1 className="mb-8 text-2xl font-bold text-gray-900 md:text-3xl">
               My favorite stays
            </h1>

            {!isAuthenticated ? (
               <div className="flex flex-col items-center py-24 text-center">
                  <span className="flex justify-center items-center mb-6 w-20 h-20 text-3xl text-rose-400 bg-rose-50 rounded-full">
                     <HeartOutlined />
                  </span>
                  <h2 className="mb-2 text-xl font-semibold text-gray-900">
                     Sign in to see your favorites
                  </h2>
                  <p className="mb-6 max-w-md text-gray-500">
                     Save the stays you love and find them all in one place.
                  </p>
                  <Button
                     type="primary"
                     size="large"
                     className="px-8 h-11 bg-blue-500 rounded-full"
                     onClick={() =>
                        setAuthModal({ isOpen: true, activeTab: 'signin' })
                     }
                  >
                     Sign in
                  </Button>
               </div>
            ) : isLoading ? (
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                     <div
                        key={index}
                        className="p-4 bg-white rounded-3xl shadow-card-sm"
                     >
                        <Skeleton.Image
                           active
                           className="w-full! h-[185px]! rounded-2xl!"
                        />
                        <Skeleton
                           active
                           paragraph={{ rows: 2 }}
                           className="mt-4"
                        />
                     </div>
                  ))}
               </div>
            ) : favorites.length === 0 ? (
               <div className="flex flex-col items-center py-24 text-center">
                  <span className="flex justify-center items-center mb-6 w-20 h-20 text-3xl text-rose-400 bg-rose-50 rounded-full">
                     <HeartOutlined />
                  </span>
                  <h2 className="mb-2 text-xl font-semibold text-gray-900">
                     No favorites yet
                  </h2>
                  <p className="mb-6 max-w-md text-gray-500">
                     Tap the heart on any stay you love and it will show up
                     here.
                  </p>
                  <Button
                     type="primary"
                     size="large"
                     className="px-8 h-11 bg-blue-500 rounded-full"
                     onClick={() => navigate(`/${path.LISTING}`)}
                  >
                     Explore stays
                  </Button>
               </div>
            ) : (
               <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {favorites.map((apartment) => (
                     <div
                        key={apartment._id}
                        className="flex flex-col items-start p-2 w-full bg-white rounded-3xl transition-shadow duration-300 shadow-card-sm hover:shadow-card-md"
                     >
                        <div className="relative w-full">
                           <div className="overflow-hidden rounded-3xl">
                              <Carousel
                                 arrows
                                 swipeToSlide
                                 draggable
                                 className="overflow-hidden rounded-3xl"
                              >
                                 {(apartment.images.length
                                    ? apartment.images
                                    : ['']
                                 ).map((image, index) => (
                                    <AppImage
                                       key={index}
                                       src={image}
                                       alt={apartment.title}
                                       wrapperClassName="h-[185px] w-full object-cover bg-gray-100"
                                    />
                                 ))}
                              </Carousel>
                           </div>
                           {apartment.avgRating > 0 && (
                              <span className="absolute top-2 left-2 px-4 py-1.5 text-xs tracking-normal leading-4 text-center text-green-600 whitespace-nowrap uppercase bg-green-100 rounded-full">
                                 {apartment.avgRating}
                              </span>
                           )}
                           <FavoriteButton
                              apartmentId={apartment._id}
                              size={16}
                              className="absolute top-2 right-2"
                           />
                        </div>
                        <div className="p-1 mt-2 w-full">
                           <Tooltip title={apartment.title} placement="top">
                              <div
                                 className="text-lg truncate cursor-pointer hover:underline"
                                 onClick={() => goToApartment(apartment._id)}
                              >
                                 {apartment.title}
                              </div>
                           </Tooltip>
                           <div className="flex gap-1.5 items-center w-full text-sm font-light text-gray-500">
                              <FaLocationDot size={12} className="flex-shrink-0 text-blue-500" />
                              <span className="truncate">
                                 {[
                                    apartment.location.district,
                                    apartment.location.province,
                                 ]
                                    .filter(Boolean)
                                    .join(', ')}
                              </span>
                           </div>
                        </div>
                        <div className="flex justify-between items-center p-1 mt-auto w-full">
                           <div className="font-medium text-md">
                              {apartment.price != null
                                 ? `${apartment.price.toLocaleString()} VND/night`
                                 : 'Updating price'}
                           </div>
                           <Button
                              size="small"
                              className="rounded-full border-gray-300 hover:border-blue-500 hover:text-blue-600"
                              onClick={() => goToApartment(apartment._id)}
                           >
                              View
                           </Button>
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
                  itemLabel="favorite"
               />
            )}
         </div>
      </div>
   );
};

export default MyFavorites;
