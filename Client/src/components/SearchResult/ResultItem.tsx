import React from 'react';
import AppImage from '@/components/AppImage/AppImage';
import { useNavigate } from '@/lib/router-compat';
import { Tooltip } from 'antd';
import {
   EnvironmentOutlined,
   RightOutlined,
   TeamOutlined,
   MoonOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import { FavoriteButton } from '@/components';

interface SearchItemProps {
   room: any;
   roomNumber: number;
   numberOfGuest: number;
   searchParams: URLSearchParams;
}

const MAX_AMENITIES = 4;

const ResultItem: React.FC<SearchItemProps> = ({
   room,
   roomNumber,
   numberOfGuest,
   searchParams,
}) => {
   const navigate = useNavigate();

   const handleClick = () => {
      const queryParams = new URLSearchParams();
      // Keep only params that exist — avoids "province=null" on paramless visits
      ['province', 'startDate', 'endDate'].forEach((key) => {
         const value = searchParams.get(key);
         if (value) queryParams.set(key, value);
      });
      // Detail page needs a date range for price/availability — default today -> tomorrow
      if (!queryParams.get('startDate') || !queryParams.get('endDate')) {
         queryParams.set('startDate', moment().format('YYYY-MM-DD'));
         queryParams.set('endDate', moment().add(1, 'day').format('YYYY-MM-DD'));
      }
      queryParams.set('numberOfGuest', numberOfGuest.toString());
      queryParams.set('roomNumber', roomNumber.toString());
      if (room.roomId) queryParams.set('roomId', room.roomId);
      navigate(`/apartment/${room._id}?${queryParams.toString()}`);
   };

   const ratingAvg: number = room.rating?.ratingAvg || 0;
   const totalRating: number = room.rating?.totalRating || 0;
   const amenities: { name: string }[] = room.amenities || [];
   const address = [
      room.address?.street,
      room.address?.district,
      room.address?.province,
   ]
      .filter(Boolean)
      .join(', ');
   const taxes = Math.round((room.totalPrice || 0) * 0.11);

   return (
      <div
         onClick={handleClick}
         className="flex overflow-hidden flex-col bg-white rounded-2xl border border-gray-100 transition-all duration-300 cursor-pointer group md:flex-row shadow-card-sm hover:shadow-card-md hover:border-blue-200 font-main"
      >
         {/* Image */}
         <div className="overflow-hidden relative flex-shrink-0 md:w-72 md:h-auto md:max-h-64">
            <AppImage
               src={room.image}
               alt={room.name}
               wrapperClassName="object-cover w-full h-44 transition-transform duration-500 md:h-64 group-hover:scale-105"
            />
            <FavoriteButton
               apartmentId={room._id}
               size={16}
               className="absolute top-3 right-3"
            />
            {ratingAvg === 0 && (
               <span className="absolute top-3 left-3 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white uppercase bg-gray-900/70 rounded-full backdrop-blur-sm">
                  New
               </span>
            )}
         </div>

         {/* Noi dung */}
         <div className="flex flex-col flex-1 p-4 min-w-0 md:p-5">
            <div className="flex gap-4 justify-between items-start">
               <div className="min-w-0">
                  <Tooltip title={room.name}>
                     <h3 className="text-base font-semibold text-gray-900 transition-colors line-clamp-1 md:text-lg group-hover:text-blue-600">
                        {room.name}
                     </h3>
                  </Tooltip>
                  <p className="flex gap-1.5 items-center mt-1 text-sm text-gray-500">
                     <EnvironmentOutlined className="flex-shrink-0" />
                     <span className="truncate">{address}</span>
                  </p>
               </div>

               {ratingAvg > 0 && (
                  <div className="flex flex-shrink-0 gap-2 items-center">
                     <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 leading-tight">
                           {ratingAvg >= 4.5
                              ? 'Excellent'
                              : ratingAvg >= 4
                                ? 'Very good'
                                : ratingAvg >= 3
                                  ? 'Good'
                                  : 'Fair'}
                        </p>
                        <p className="text-xs text-gray-400">
                           {totalRating} review{totalRating > 1 ? 's' : ''}
                        </p>
                     </div>
                     <span className="flex justify-center items-center w-10 h-10 text-sm font-bold text-white bg-blue-600 rounded-xl rounded-br-sm">
                        {Number(ratingAvg).toFixed(1)}
                     </span>
                  </div>
               )}
            </div>

            {/* Tien nghi */}
            {amenities.length > 0 && (
               <div className="flex flex-wrap gap-1.5 mt-3">
                  {amenities.slice(0, MAX_AMENITIES).map((amenity, index) => (
                     <span
                        key={index}
                        className="px-2.5 py-1 text-xs text-gray-600 bg-gray-50 rounded-full border border-gray-100"
                     >
                        {amenity.name}
                     </span>
                  ))}
                  {amenities.length > MAX_AMENITIES && (
                     <span className="px-2.5 py-1 text-xs text-gray-400 bg-gray-50 rounded-full border border-gray-100">
                        +{amenities.length - MAX_AMENITIES} more
                     </span>
                  )}
               </div>
            )}

            {/* Price + CTA */}
            <div className="flex flex-wrap gap-3 justify-between items-end pt-4 mt-auto border-t border-gray-100">
               <div className="flex gap-4 text-xs text-gray-500">
                  <span className="flex gap-1.5 items-center">
                     <MoonOutlined />
                     {room.nights} night{room.nights > 1 ? 's' : ''}
                  </span>
                  <span className="flex gap-1.5 items-center">
                     <TeamOutlined />
                     {numberOfGuest} guest{numberOfGuest > 1 ? 's' : ''}
                  </span>
               </div>
               <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 md:text-xl">
                     {room.totalPrice?.toLocaleString()}{' '}
                     <span className="text-sm font-medium text-gray-500">
                        VND
                     </span>
                  </p>
                  <p className="text-xs text-gray-400">
                     +{taxes.toLocaleString()} VND taxes and fees
                  </p>
                  <span className="inline-flex gap-1 items-center mt-1.5 text-sm font-medium text-blue-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                     See availability <RightOutlined className="text-xs" />
                  </span>
               </div>
            </div>
         </div>
      </div>
   );
};

export default ResultItem;
