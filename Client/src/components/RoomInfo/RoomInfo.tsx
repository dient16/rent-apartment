import React from 'react';
import AppImage from '@/components/AppImage/AppImage';
import { Carousel } from 'antd';
import { FaBed, FaCheck, FaRulerCombined, FaUsers } from 'react-icons/fa';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

interface RoomOption {
   _id: string;
   roomType: string;
   size: number;
   quantity: number;
   numberOfGuest: number;
   price: number;
   totalPrice: number;
   bedType?: string;
   amenities?: { name: string; icon: string }[];
   images: string[];
}

interface RoomInfoProps {
   roomInfo: RoomOption;
}

// react-slick clones the arrow element and injects `currentSlide` / `slideCount`.
// They are not valid DOM attributes, so strip them before they reach the icon's <span>.
type SlickArrowProps = React.HTMLAttributes<HTMLSpanElement> & {
   currentSlide?: number;
   slideCount?: number;
};

const PrevArrow = ({ currentSlide, slideCount, ...props }: SlickArrowProps) => (
   <LeftOutlined {...props} />
);

const NextArrow = ({ currentSlide, slideCount, ...props }: SlickArrowProps) => (
   <RightOutlined {...props} />
);

const RoomInfo: React.FC<RoomInfoProps> = ({ roomInfo }) => {
   const { roomType, size, numberOfGuest, bedType, amenities, totalPrice, quantity, images } =
      roomInfo;

   const facts = [
      { icon: <FaRulerCombined size={14} />, label: `${size} m²` },
      { icon: <FaUsers size={14} />, label: `Up to ${numberOfGuest} guest${numberOfGuest > 1 ? 's' : ''}` },
      ...(bedType ? [{ icon: <FaBed size={15} />, label: bedType }] : []),
   ];

   return (
      <div className="flex flex-col gap-6 bg-white lg:flex-row font-main">
         {/* Gallery */}
         <div className="lg:w-3/5 w-full">
            <Carousel
               autoplay
               arrows
               swipeToSlide
               draggable
               prevArrow={<PrevArrow />}
               nextArrow={<NextArrow />}
               className="overflow-hidden rounded-2xl"
            >
               {images.map((image, index) => (
                  <AppImage
                     key={index}
                     src={image}
                     alt={`${roomType} photo ${index + 1}`}
                     wrapperClassName="w-full h-[340px] lg:h-[520px] object-cover"
                  />
               ))}
            </Carousel>
         </div>

         {/* Info */}
         <div className="flex flex-col lg:w-2/5 w-full min-w-0">
            <h2 className="text-2xl font-semibold text-gray-900">{roomType}</h2>

            <div className="flex flex-wrap gap-2 mt-3">
               {facts.map((fact) => (
                  <span
                     key={fact.label}
                     className="flex gap-1.5 items-center px-3 py-1.5 text-sm text-gray-700 bg-gray-50 rounded-full border border-gray-100"
                  >
                     <span className="text-gray-400">{fact.icon}</span>
                     {fact.label}
                  </span>
               ))}
            </div>

            {!!amenities?.length && (
               <div className="mt-5">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900">
                     Room amenities
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                     {amenities.map((amenity) => (
                        <div
                           key={amenity.name}
                           className="flex gap-2 items-center text-sm text-gray-600"
                        >
                           <FaCheck size={10} className="flex-shrink-0 text-green-600" />
                           <span className="truncate">{amenity.name}</span>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            <div className="flex justify-between items-end p-4 mt-auto bg-blue-50/60 rounded-2xl border border-blue-100 lg:mt-6 mt-6">
               <div>
                  <p className="text-xs text-gray-500">From</p>
                  <p className="text-2xl font-bold text-gray-900">
                     {totalPrice.toLocaleString()}{' '}
                     <span className="text-sm font-medium text-gray-500">
                        VND / night
                     </span>
                  </p>
                  <p className="text-xs text-gray-400">Taxes &amp; fees included</p>
               </div>
               <span
                  className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                     quantity <= 3
                        ? 'text-red-600 bg-red-50'
                        : 'text-green-700 bg-green-50'
                  }`}
               >
                  {quantity <= 3 ? `Only ${quantity} left` : `${quantity} available`}
               </span>
            </div>
         </div>
      </div>
   );
};

export default RoomInfo;
