import React from 'react';
import AppImage from '@/components/AppImage/AppImage';
import { useQuery } from '@tanstack/react-query';
import { Carousel, Skeleton } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { IoStar } from 'react-icons/io5';
import { FiMapPin } from 'react-icons/fi';
import { apiGetApartmentPopular } from '@/apis';
import FavoriteButton from '@/components/FavoriteButton/FavoriteButton';
import { useNavigate } from '@/lib/router-compat';
import moment from 'moment';

// Mobile: one swipeable row of fixed-width cards. sm+: responsive grid.
const LIST_CLASS =
   'flex overflow-x-auto gap-3 -mx-4 px-4 pb-2 snap-x snap-mandatory scrollbar-none sm:grid sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-5';
const CARD_CLASS =
   'group flex flex-col flex-shrink-0 w-[250px] bg-white rounded-2xl border border-gray-100 snap-start overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gray-200/70 hover:border-gray-200 sm:w-full';

const detailUrl = (apartmentId: string) =>
   `/apartment/${apartmentId}?startDate=${moment().format('YYYY-MM-DD')}&endDate=${moment()
      .add(1, 'day')
      .format('YYYY-MM-DD')}&numberOfGuest=1&roomNumber=1`;

const ApartmentPopular: React.FC = () => {
   const navigate = useNavigate();
   const { data, isLoading } = useQuery({
      queryKey: ['apartment-popular'],
      queryFn: () => apiGetApartmentPopular(),
   });

   const heading = (
      <div className="flex gap-4 justify-between items-end mb-4 md:mb-6">
         <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">
               Apartments loved by guests
            </h2>
            <p className="mt-1 text-sm text-gray-500">
               Top-rated stays, ranked by real guest reviews
            </p>
         </div>
         <button
            type="button"
            onClick={() => navigate('/listing')}
            className="flex flex-shrink-0 gap-1.5 items-center p-0 text-sm font-semibold text-blue-600 bg-transparent border-none cursor-pointer group hover:text-blue-700"
         >
            See all
            <ArrowRightOutlined className="text-xs transition-transform group-hover:translate-x-0.5" />
         </button>
      </div>
   );

   if (isLoading) {
      return (
         <div className="my-8 w-full md:my-10">
            {heading}
            <div className={LIST_CLASS}>
               {[1, 2, 3, 4, 5].map((index) => (
                  <div key={index} className={CARD_CLASS}>
                     <Skeleton.Image active className="w-full! aspect-[4/3] h-auto! rounded-none!" />
                     <div className="p-3.5 w-full">
                        <Skeleton active title={false} paragraph={{ rows: 3, width: ['85%', '60%', '45%'] }} />
                     </div>
                  </div>
               ))}
            </div>
         </div>
      );
   }

   const apartments = data?.data;

   return (
      <div className="my-8 w-full md:my-10">
         {heading}
         <div className={LIST_CLASS}>
            {(apartments || []).map((apartment) => (
               <article key={apartment._id} className={CARD_CLASS}>
                  {/* ===== Photo ===== */}
                  <div className="relative w-full aspect-[4/3] bg-gray-100 popular-card-carousel">
                     <Carousel arrows swipeToSlide draggable className="h-full">
                        {apartment.images.map((image, index) => (
                           <div key={index} className="aspect-[4/3]">
                              <AppImage
                                 src={image}
                                 wrapperClassName="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                              />
                           </div>
                        ))}
                     </Carousel>
                     {/* Rating pill: readable on any photo */}
                     <span className="flex absolute bottom-2.5 left-2.5 gap-1 items-center px-2 py-1 text-xs font-semibold text-gray-900 rounded-full shadow-sm backdrop-blur-sm bg-white/90">
                        <IoStar className="text-amber-400" size={12} />
                        {apartment.avgRating > 0 ? apartment.avgRating.toFixed(1) : 'New'}
                        {apartment.reviewCount > 0 && (
                           <span className="font-normal text-gray-500">
                              ({apartment.reviewCount})
                           </span>
                        )}
                     </span>
                     <FavoriteButton
                        apartmentId={apartment._id}
                        size={16}
                        className="absolute top-2.5 right-2.5 shadow-sm"
                     />
                  </div>

                  {/* ===== Info: the whole block opens the listing ===== */}
                  <button
                     type="button"
                     onClick={() => navigate(detailUrl(apartment._id))}
                     className="flex flex-col flex-1 gap-1 p-3.5 w-full text-left bg-transparent border-none cursor-pointer"
                  >
                     <h3
                        className="w-full text-[15px] font-semibold leading-snug text-gray-900 truncate transition-colors group-hover:text-blue-600"
                        title={apartment.title}
                     >
                        {apartment.title}
                     </h3>
                     <p
                        className="flex gap-1 items-center w-full text-xs text-gray-500"
                        title={`${apartment.location.district}, ${apartment.location.province}`}
                     >
                        <FiMapPin size={12} className="flex-shrink-0 text-gray-400" />
                        <span className="truncate">
                           {apartment.location.district}, {apartment.location.province}
                        </span>
                     </p>
                     <div className="flex gap-2 justify-between items-end pt-2 mt-auto w-full">
                        <p className="min-w-0 leading-tight">
                           <span className="text-[15px] font-bold text-gray-900">
                              {apartment.price.toLocaleString()}
                           </span>
                           <span className="ml-1 text-xs text-gray-500">VND / night</span>
                        </p>
                        <span className="flex flex-shrink-0 justify-center items-center w-8 h-8 text-gray-500 bg-gray-50 rounded-full border border-gray-100 transition-all duration-300 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white">
                           <ArrowRightOutlined className="text-xs transition-transform duration-300 group-hover:-rotate-45" />
                        </span>
                     </div>
                  </button>
               </article>
            ))}
         </div>
      </div>
   );
};

export default ApartmentPopular;