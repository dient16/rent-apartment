import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiGetApartmentDetails } from '@/apis';
import { Button, Carousel, Skeleton, Tag } from 'antd';
import {
   ArrowLeftOutlined,
   CalendarOutlined,
   ClockCircleOutlined,
   EnvironmentOutlined,
   TeamOutlined,
} from '@ant-design/icons';
import { FaBed, FaDoorOpen, FaRulerCombined } from 'react-icons/fa';
import { path } from '@/utils/constant';

interface RoomInfo {
   _id: string;
   roomType: string;
   images?: string[];
   price?: number;
   size?: number;
   quantity?: number;
   numberOfGuest?: number;
   bedType?: string;
   amenities?: { _id: string; name: string }[];
}

const HostRoomDetail: React.FC = () => {
   const { apartmentId } = useParams();
   const navigate = useNavigate();

   const { data: apartmentData, isLoading } = useQuery({
      queryKey: ['apartment', apartmentId],
      queryFn: () => apiGetApartmentDetails(apartmentId),
   });

   const apartment = apartmentData?.data;
   const rooms: RoomInfo[] = useMemo(
      () => apartment?.rooms || [],
      [apartment],
   );

   const stats = useMemo(() => {
      const prices = rooms
         .map((room) => room.price)
         .filter((price) => typeof price === 'number');
      return {
         roomTypes: rooms.length,
         totalRooms: rooms.reduce((sum, room) => sum + (room.quantity || 0), 0),
         maxGuests: rooms.reduce(
            (sum, room) => sum + (room.numberOfGuest || 0) * (room.quantity || 1),
            0,
         ),
         minPrice: prices.length ? Math.min(...prices) : null,
      };
   }, [rooms]);

   const gallery: string[] = useMemo(
      () => rooms.flatMap((room) => room.images || []).slice(0, 5),
      [rooms],
   );

   const addressText = apartment
      ? [
           apartment.address?.street,
           apartment.address?.ward,
           apartment.address?.district,
           apartment.address?.province,
        ]
           .filter(Boolean)
           .filter((part, index, parts) => parts.indexOf(part) === index)
           .join(', ')
      : '';

   return (
      <div className="min-h-screen bg-gray-50 font-main">
         <div className="px-5 py-8 mx-auto w-full max-w-main lg:px-7">
            <Link
               to={`${path.HOST_ROOT}${path.HOST_LISTINGS}`}
               className="inline-flex gap-2 items-center mb-5 text-sm font-medium text-gray-500 hover:text-blue-600"
            >
               <ArrowLeftOutlined /> Rental listings
            </Link>

            {isLoading ? (
               <div className="p-6 bg-white rounded-2xl shadow-card-sm">
                  <Skeleton active paragraph={{ rows: 8 }} />
               </div>
            ) : apartment ? (
               <>
                  {/* ===== Gallery ===== */}
                  {gallery.length > 0 && (
                     <div className="grid overflow-hidden grid-cols-4 grid-rows-2 gap-2 mb-6 rounded-2xl h-[320px] md:h-[380px]">
                        <img
                           src={gallery[0]}
                           alt={apartment.title}
                           className="object-cover col-span-4 row-span-2 w-full h-full md:col-span-2"
                        />
                        {gallery.slice(1, 5).map((image, index) => (
                           <img
                              key={index}
                              src={image}
                              alt=""
                              className="hidden object-cover w-full h-full md:block"
                           />
                        ))}
                     </div>
                  )}

                  {/* ===== Header + stats ===== */}
                  <div className="p-6 mb-6 bg-white rounded-2xl border border-gray-100 shadow-card-sm md:p-8">
                     <div className="flex flex-wrap gap-4 justify-between items-start">
                        <div className="min-w-0">
                           <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                              {apartment.title || 'Your listing'}
                           </h1>
                           <p className="flex gap-1.5 items-center mt-1.5 text-sm text-gray-500">
                              <EnvironmentOutlined className="flex-shrink-0" />
                              {addressText}
                           </p>
                        </div>
                        <Button
                           size="large"
                           icon={<CalendarOutlined />}
                           className="h-11 rounded-full"
                           onClick={() =>
                              navigate(`${path.HOST_ROOT}${path.HOST_CALENDAR}`)
                           }
                        >
                           Pricing calendar
                        </Button>
                     </div>

                     <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-gray-100 md:grid-cols-4">
                        {[
                           {
                              label: 'Room types',
                              value: stats.roomTypes,
                              icon: <FaDoorOpen />,
                           },
                           {
                              label: 'Total rooms',
                              value: stats.totalRooms,
                              icon: <FaBed />,
                           },
                           {
                              label: 'Max guests',
                              value: stats.maxGuests,
                              icon: <TeamOutlined />,
                           },
                           {
                              label: 'From / night',
                              value:
                                 stats.minPrice != null
                                    ? `${stats.minPrice.toLocaleString()} VND`
                                    : '—',
                              icon: <ClockCircleOutlined />,
                           },
                        ].map((stat) => (
                           <div
                              key={stat.label}
                              className="flex gap-3 items-center"
                           >
                              <span className="flex flex-shrink-0 justify-center items-center w-10 h-10 text-blue-600 bg-blue-50 rounded-xl">
                                 {stat.icon}
                              </span>
                              <div className="min-w-0">
                                 <p className="text-xs text-gray-400">
                                    {stat.label}
                                 </p>
                                 <p className="text-sm font-bold text-gray-900 truncate">
                                    {stat.value}
                                 </p>
                              </div>
                           </div>
                        ))}
                     </div>

                     {apartment.description && (
                        <p className="pt-6 mt-6 max-w-3xl text-sm leading-relaxed text-gray-600 border-t border-gray-100">
                           {apartment.description}
                        </p>
                     )}

                     {(apartment.checkInTime ||
                        apartment.checkOutTime ||
                        apartment.houserules?.length > 0) && (
                        <div className="flex flex-wrap gap-x-8 gap-y-2 pt-6 mt-6 text-sm text-gray-600 border-t border-gray-100">
                           {apartment.checkInTime && (
                              <span className="flex gap-2 items-center">
                                 <ClockCircleOutlined className="text-gray-400" />
                                 Check-in from{' '}
                                 <b className="text-gray-900">
                                    {apartment.checkInTime}
                                 </b>
                              </span>
                           )}
                           {apartment.checkOutTime && (
                              <span className="flex gap-2 items-center">
                                 <ClockCircleOutlined className="text-gray-400" />
                                 Check-out before{' '}
                                 <b className="text-gray-900">
                                    {apartment.checkOutTime}
                                 </b>
                              </span>
                           )}
                           {(apartment.houserules || []).map(
                              (rule: string, index: number) => (
                                 <span
                                    key={index}
                                    className="flex gap-2 items-center"
                                 >
                                    • {rule}
                                 </span>
                              ),
                           )}
                        </div>
                     )}
                  </div>

                  {/* ===== Room types ===== */}
                  <h2 className="mb-4 text-lg font-bold text-gray-900">
                     Room types ({rooms.length})
                  </h2>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                     {rooms.map((room) => (
                        <div
                           key={room._id}
                           className="flex overflow-hidden flex-col bg-white rounded-2xl border border-gray-100 transition-shadow duration-300 shadow-card-sm hover:shadow-card-md"
                        >
                           <Carousel arrows swipeToSlide draggable>
                              {(room.images || []).map(
                                 (image: string, index: number) => (
                                    <img
                                       key={index}
                                       src={image}
                                       alt={room.roomType}
                                       className="object-cover w-full h-48"
                                    />
                                 ),
                              )}
                           </Carousel>
                           <div className="flex flex-col flex-1 p-5">
                              <h3 className="text-base font-semibold text-gray-900">
                                 {room.roomType}
                              </h3>
                              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-sm text-gray-600">
                                 <span className="flex gap-1.5 items-center">
                                    <FaDoorOpen className="text-gray-400" />
                                    {room.quantity} rooms
                                 </span>
                                 <span className="flex gap-1.5 items-center">
                                    <TeamOutlined className="text-gray-400" />
                                    {room.numberOfGuest} guests
                                 </span>
                                 {room.size ? (
                                    <span className="flex gap-1.5 items-center">
                                       <FaRulerCombined className="text-gray-400" />
                                       {room.size} m²
                                    </span>
                                 ) : null}
                                 {room.bedType && (
                                    <span className="flex gap-1.5 items-center">
                                       <FaBed className="text-gray-400" />
                                       {room.bedType}
                                    </span>
                                 )}
                              </div>
                              {room.amenities?.length > 0 && (
                                 <div className="flex flex-wrap gap-1.5 mt-3">
                                    {room.amenities
                                       .slice(0, 4)
                                       .map((amenity) => (
                                          <Tag
                                             key={amenity._id}
                                             className="px-2.5 m-0 text-xs text-gray-600 bg-gray-50 rounded-full border-gray-200"
                                          >
                                             {amenity.name}
                                          </Tag>
                                       ))}
                                    {room.amenities.length > 4 && (
                                       <Tag className="px-2.5 m-0 text-xs text-gray-400 bg-gray-50 rounded-full border-gray-200">
                                          +{room.amenities.length - 4}
                                       </Tag>
                                    )}
                                 </div>
                              )}
                              <div className="pt-3 mt-auto border-t border-gray-100">
                                 <p className="text-xs text-gray-400">
                                    Price per night
                                 </p>
                                 <p className="text-lg font-bold text-gray-900">
                                    {room.price?.toLocaleString()}{' '}
                                    <span className="text-xs font-medium text-gray-500">
                                       VND
                                    </span>
                                 </p>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </>
            ) : (
               <div className="py-24 text-center text-gray-400 bg-white rounded-2xl shadow-card-sm">
                  Listing not found.
               </div>
            )}
         </div>
      </div>
   );
};

export default HostRoomDetail;
