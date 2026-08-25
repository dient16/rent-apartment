import React from 'react';
import AppImage from '@/components/AppImage/AppImage';
import { useQuery } from '@tanstack/react-query';
import { Carousel, Skeleton, Tooltip } from 'antd';
import icons from '@/utils/icons';
import { apiGetApartmentPopular } from '@/apis';
import FavoriteButton from '@/components/FavoriteButton/FavoriteButton';
import { useNavigate } from '@/lib/router-compat';
import moment from 'moment';
const { MdOutlineKeyboardArrowRight } = icons;

// Mobile: one swipeable row of fixed-width cards. sm+: responsive grid.
const LIST_CLASS =
   'flex overflow-x-auto gap-3 -mx-4 px-4 pb-1 snap-x snap-mandatory scrollbar-none sm:grid sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 sm:gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
const CARD_CLASS =
   'flex flex-col flex-shrink-0 items-start p-2 w-[240px] bg-white rounded-3xl snap-start shadow-card-sm sm:w-full h-[295px]';

const ApartmentPopular: React.FC = () => {
   const navigate = useNavigate();
   const { data, isLoading } = useQuery({
      queryKey: ['apartment-popular'],
      queryFn: () => apiGetApartmentPopular(),
   });

   const heading = (
      <div className="flex justify-between items-end mb-4 md:mb-5">
         <h2 className="text-lg font-semibold text-gray-900 md:font-normal">
            Apartments loved by guest
         </h2>
         <button
            type="button"
            onClick={() => navigate('/listing')}
            className="p-0 text-sm font-medium text-blue-600 bg-transparent border-none cursor-pointer sm:hidden"
         >
            See all
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
                     <Skeleton.Image active className="w-full! h-[185px]! rounded-3xl!" />
                     <div className="p-1 mt-3 w-full">
                        <Skeleton active title={false} paragraph={{ rows: 2, width: ['80%', '55%'] }} />
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
               <div key={apartment._id} className={CARD_CLASS}>
                  <div className="relative w-full">
                     <div className="overflow-hidden rounded-3xl">
                        <Carousel
                           arrows
                           swipeToSlide
                           draggable
                           className="overflow-hidden rounded-3xl"
                        >
                           {apartment.images.map((image, index) => (
                              <AppImage
                                 key={index}
                                 src={image}
                                 wrapperClassName="h-[185px] w-full object-cover"
                              />
                           ))}
                        </Carousel>
                     </div>
                     <span className="absolute top-2 left-2 px-4 py-1.5 text-xs tracking-normal leading-4 text-center text-green-500 uppercase whitespace-nowrap bg-green-200 rounded-full">
                        {apartment.avgRating}
                     </span>
                     <FavoriteButton
                        apartmentId={apartment._id}
                        size={15}
                        className="absolute top-2 right-2"
                     />
                  </div>
                  <div className="p-1 mt-2 w-full">
                     <Tooltip title={apartment.title} placement="top">
                        <div
                           className="text-base truncate cursor-pointer md:text-lg hover:underline"
                           onClick={() =>
                              navigate(
                                 `/apartment/${
                                    apartment._id
                                 }?startDate=${moment().format(
                                    'YYYY-MM-DD',
                                 )}&endDate=${moment()
                                    .add(1, 'day')
                                    .format(
                                       'YYYY-MM-DD',
                                    )}&numberOfGuest=1&roomNumber=1`,
                              )
                           }
                        >
                           {apartment.title}
                        </div>
                     </Tooltip>
                     <Tooltip
                        title={`${apartment.location.district}, ${apartment.location.province}`}
                        placement="top"
                     >
                        <div className="w-full text-sm font-light truncate">
                           {apartment.location.district},{' '}
                           {apartment.location.province}
                        </div>
                     </Tooltip>
                  </div>
                  <div className="flex justify-between items-center w-full">
                     <div className="p-1 mt-1 text-sm font-medium md:text-md">
                        {apartment.price.toLocaleString()} VND/night
                     </div>
                     <MdOutlineKeyboardArrowRight size={20} />
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
};

export default ApartmentPopular;
