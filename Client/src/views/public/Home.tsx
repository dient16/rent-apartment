'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ApartmentPopular, Search } from '@/components';
import datlat from '@/assets/dalat.jpg';
import danang from '@/assets/danang.png';
import hochiminh from '@/assets/hochiminh.png';
import hoian from '@/assets/hoian.webp';
import nhatrang from '@/assets/nhatrang.jpg';
import quynhon from '@/assets/quynhon.jpg';
import { useNavigate } from '@/lib/router-compat';
import {
   SafetyCertificateOutlined,
   DollarOutlined,
   CustomerServiceOutlined,
   ThunderboltOutlined,
   ArrowRightOutlined,
} from '@ant-design/icons';
import { Button } from 'antd';
import moment from 'moment';

/** Order matters: it drives the bento layout on sm/lg (see `span`). */
const DESTINATIONS = [
   { label: 'Quy Nhon', province: 'Quy nhơn', image: quynhon, span: 'lg:row-span-5 sm:row-span-4' },
   { label: 'Da Lat', province: 'Đà Lạt', image: datlat, span: 'lg:row-span-3 sm:row-span-2' },
   { label: 'Da Nang', province: 'Đà Nẵng', image: danang, span: 'lg:row-span-5 sm:row-span-4' },
   { label: 'Ho Chi Minh', province: 'Hồ Chí Minh', image: hochiminh, span: 'lg:row-span-2 sm:row-span-2' },
   { label: 'Hoi An', province: 'Hội An', image: hoian, span: 'lg:row-span-3 sm:row-span-2' },
   { label: 'Nha Trang', province: 'Nha Trang', image: nhatrang, span: 'lg:row-span-2 sm:row-span-2' },
];

const PERKS = [
   {
      icon: <DollarOutlined />,
      title: 'Best price guarantee',
      description: 'Daily rates set by hosts — no hidden markup.',
      tone: 'text-green-600 bg-green-50',
   },
   {
      icon: <ThunderboltOutlined />,
      title: 'Instant booking',
      description: 'Real-time availability, confirmed in minutes.',
      tone: 'text-blue-600 bg-blue-50',
   },
   {
      icon: <SafetyCertificateOutlined />,
      title: 'Secure payment',
      description: 'Pay safely with Stripe, refunds protected.',
      tone: 'text-purple-600 bg-purple-50',
   },
   {
      icon: <CustomerServiceOutlined />,
      title: '24/7 support',
      description: 'We are here before, during and after your stay.',
      tone: 'text-amber-600 bg-amber-50',
   },
];

const Home: React.FC = () => {
   const navigate = useNavigate();
   function navigateToListing(province: string) {
      const queryParams = new URLSearchParams({
         province: province,
         startDate: moment().format('YYYY-MM-DD'),
         endDate: moment().add(1, 'day').format('YYYY-MM-DD'),
         number_of_guest: '1',
         room_number: '1',
      });
      const url = `/listing?${queryParams.toString()}`;
      navigate(url);
   }
   const fadeInVariants = {
      hidden: { opacity: 0, y: 50 },
      visible: { opacity: 1, y: 0 },
   };

   return (
      <div className="flex justify-center items-center font-main">
         <div className="px-4 w-full max-w-main md:px-3">
            {/* ===== Hero ===== */}
            <motion.div
               className="relative md:mt-3"
               initial="hidden"
               animate="visible"
               variants={fadeInVariants}
               transition={{ type: 'spring' }}
            >
               <div
                  className="flex overflow-hidden relative flex-col justify-center items-center px-5 w-full text-center text-white bg-center bg-cover rounded-3xl h-[220px] sm:h-[240px] md:h-[300px]"
                  style={{ backgroundImage: "url('/background.avif')" }}
               >
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/60" />
                  {/* Mobile: leave room for the search card that overlaps the bottom */}
                  <div className="relative pb-10 md:pb-0">
                     <h1 className="text-2xl font-bold leading-tight sm:text-3xl md:text-[3rem] md:font-semibold">
                        Booking your stay with NestStay
                     </h1>
                     <p className="mt-2 text-sm text-white/85 sm:text-base md:text-lg">
                        From as low as 100,000 VND per night with limited time
                        offer discounts
                     </p>
                  </div>
               </div>

               {/* Mobile/tablet: in flow, pulled up over the hero. Desktop: hangs off the bottom edge. */}
               <div className="relative px-1 mx-auto -mt-14 w-full max-w-[960px] sm:px-4 md:absolute md:left-1/2 md:-bottom-9 md:px-0 md:mt-0 md:-translate-x-1/2">
                  <Search />
               </div>
            </motion.div>

            {/* ===== Popular destinations ===== */}
            <section className="mt-8 md:mt-[60px]">
               <div className="flex justify-between items-end mb-4 md:mb-5">
                  <h2 className="text-lg font-semibold text-gray-900 md:text-xl md:font-normal">
                     Popular destination
                  </h2>
                  <button
                     type="button"
                     onClick={() => navigate('/listing')}
                     className="p-0 text-sm font-medium text-blue-600 bg-transparent border-none cursor-pointer sm:hidden"
                  >
                     See all
                  </button>
               </div>
               {/* Mobile: swipeable row. sm+: bento grid. */}
               <div className="flex overflow-x-auto gap-3 -mx-4 px-4 pb-1 snap-x snap-mandatory scrollbar-none sm:grid sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 sm:grid-cols-2 sm:grid-rows-6 sm:gap-5 lg:grid-cols-4 lg:grid-rows-5 lg:h-[390px]">
                  {DESTINATIONS.map((destination) => (
                     <div
                        key={destination.label}
                        className={`overflow-hidden relative flex-shrink-0 w-[68vw] max-w-[300px] h-44 rounded-2xl cursor-pointer snap-start sm:w-auto sm:max-w-none sm:h-auto ${destination.span}`}
                        onClick={() => navigateToListing(destination.province)}
                     >
                        <img
                           src={destination.image.src}
                           alt={destination.label}
                           className="object-cover w-full h-full rounded-2xl transition-transform duration-500 hover:scale-125"
                        />
                        <span className="flex absolute right-3 bottom-3 justify-center items-center px-3.5 py-1.5 text-sm font-medium text-gray-900 rounded-full shadow-sm backdrop-blur-sm select-none bg-white/80 md:right-5 md:bottom-5 md:px-4 md:py-2">
                           {destination.label}
                        </span>
                     </div>
                  ))}
               </div>
            </section>

            <ApartmentPopular />

            {/* ===== Why choose NestStay ===== */}
            <section className="my-10 md:my-14">
               <h2 className="mb-4 text-lg font-semibold text-gray-900 md:sr-only">
                  Why NestStay
               </h2>
               <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                  {PERKS.map((perk) => (
                     <div
                        key={perk.title}
                        className="p-4 bg-white rounded-2xl border border-gray-100 transition-shadow duration-300 shadow-card-sm hover:shadow-card-md md:p-5"
                     >
                        <span
                           className={`flex justify-center items-center mb-3 w-10 h-10 text-base rounded-xl md:w-11 md:h-11 md:text-lg ${perk.tone}`}
                        >
                           {perk.icon}
                        </span>
                        <h3 className="text-sm font-semibold text-gray-900 md:text-base">
                           {perk.title}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-gray-500 md:text-sm">
                           {perk.description}
                        </p>
                     </div>
                  ))}
               </div>
            </section>

            {/* ===== Become-a-host CTA ===== */}
            <div className="overflow-hidden relative mb-10 rounded-3xl bg-midnight-blue md:mb-14">
               <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20" />
               <div className="absolute right-24 -bottom-10 w-32 h-32 rounded-full bg-blue-400/20" />
               <div className="flex relative flex-col gap-5 justify-between items-start p-6 md:flex-row md:items-center md:gap-6 md:p-12">
                  <div className="max-w-xl">
                     <p className="mb-2 text-xs font-semibold tracking-widest text-blue-300 uppercase md:text-sm">
                        Become a host
                     </p>
                     <h2 className="text-xl font-bold text-white sm:text-2xl md:text-3xl">
                        Turn your place into your next paycheck
                     </h2>
                     <p className="mt-2 text-sm text-gray-300 md:text-base">
                        List your apartment for free, manage bookings and daily
                        pricing in one dashboard, and start earning from your
                        empty rooms.
                     </p>
                  </div>
                  <Button
                     size="large"
                     className="flex-shrink-0 px-8 w-full h-12 text-base font-semibold text-blue-600 bg-white rounded-full border-none md:w-auto hover:text-blue-700"
                     onClick={() => navigate('/host/dashboard')}
                  >
                     Start hosting <ArrowRightOutlined />
                  </Button>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Home;
