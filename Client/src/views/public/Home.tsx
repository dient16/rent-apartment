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
      <div className="font-main flex items-center justify-center">
         <div className="max-w-main w-full px-3">
            <motion.div
               className="md:h-[300px] sm:h-[210px] h-[180px] w-full flex justify-center items-center rounded-3xl relative md:mt-3 bg-cover bg-center"
               style={{ backgroundImage: "url('/background.avif')" }}
               initial="hidden"
               animate="visible"
               variants={fadeInVariants}
               transition={{ type: 'spring' }}
            >
               <div className="absolute inset-0 bg-black opacity-40 rounded-3xl md:block hidden"></div>
               <div className="absolute inset-0 md:flex hidden items-center flex-col justify-center text-white px-[20px]">
                  <div className="text-[3rem] font-main font-semibold">
                     Booking your stay with Find House
                  </div>
                  <div className="text-lg font-main font-semi">
                     From as low as 100,000 VND per night with limited time
                     offer discounts
                  </div>
               </div>
               <div className="absolute md:-bottom-9 sm:-bottom-40 -bottom-48 max-w-[960px] w-full">
                  <Search />
               </div>
            </motion.div>

            <div className="md:mt-[60px] mt-52">
               <div className="text-xl mb-5 ml-2">Popular destination</div>
               <div className="lg:grid lg:h-[390px] lg:grid-cols-4 lg:grid-rows-5 lg:gap-5 sm:grid sm:grid-cols-2 sm:grid-rows-6 flex flex-col gap-5">
                  <div
                     className="lg:col-span-1 lg:row-span-5 sm:col-span-1 sm:row-span-4 relative cursor-pointer overflow-hidden rounded-2xl"
                     onClick={() => navigateToListing('Quy nhơn')}
                  >
                     <img
                        src={quynhon}
                        className="rounded-2xl object-cover w-full h-full transition-transform duration-500 hover:scale-125"
                     />
                     <span className="absolute bottom-5 right-5 flex items-center justify-center box-border overflow-hidden outline-none select-none px-4 py-2 opacity-100 bg-white bg-opacity-70 rounded-full">
                        Quy nhon
                     </span>
                  </div>

                  <div
                     className="lg:col-span-1 lg:row-span-3 sm:col-span-1 sm:row-span-2 relative cursor-pointer overflow-hidden rounded-2xl"
                     onClick={() => navigateToListing('Đà Lạt')}
                  >
                     <img
                        src={datlat}
                        className="rounded-2xl object-cover w-full h-full transition-transform duration-500 hover:scale-125"
                     />
                     <span className="absolute bottom-5 right-5 flex items-center justify-center box-border overflow-hidden outline-none select-none px-4 py-2 opacity-100 bg-white bg-opacity-70 rounded-full">
                        Da lat
                     </span>
                  </div>

                  <div
                     className="lg:col-span-1 lg:row-span-5 sm:col-span-1 sm:row-span-4 relative cursor-pointer overflow-hidden rounded-2xl"
                     onClick={() => navigateToListing('Đà Nẵng')}
                  >
                     <img
                        src={danang}
                        className="rounded-2xl object-cover w-full h-full transition-transform duration-500 hover:scale-125"
                     />
                     <span className="absolute bottom-5 right-5 flex items-center justify-center box-border overflow-hidden outline-none select-none px-4 py-2 opacity-100 bg-white bg-opacity-70 rounded-full">
                        Da Nang
                     </span>
                  </div>

                  <div
                     className="lg:col-span-1 lg:row-span-2 sm:col-span-1 sm:row-span-2 relative cursor-pointer overflow-hidden rounded-2xl"
                     onClick={() => navigateToListing('Hồ Chí Minh')}
                  >
                     <img
                        src={hochiminh}
                        className="rounded-2xl object-cover w-full h-full transition-transform duration-500 hover:scale-125"
                     />
                     <span className="absolute bottom-5 right-5 flex items-center justify-center box-border overflow-hidden outline-none select-none px-4 py-2 opacity-100 bg-white bg-opacity-70 rounded-full">
                        Ho Chi Minh
                     </span>
                  </div>

                  <div
                     className="lg:col-span-1 lg:row-span-3 sm:col-span-1 sm:row-span-2 relative cursor-pointer overflow-hidden rounded-2xl"
                     onClick={() => navigateToListing('Hội An')}
                  >
                     <img
                        src={hoian}
                        className="rounded-2xl object-cover w-full h-full transition-transform duration-500 hover:scale-125"
                     />
                     <span className="absolute bottom-5 right-5 flex items-center justify-center box-border overflow-hidden outline-none select-none px-4 py-2 opacity-100 bg-white bg-opacity-70 rounded-full">
                        Hoi An
                     </span>
                  </div>

                  <div
                     className="lg:col-span-1 lg:row-span-2 sm:col-span-1 sm:row-span-2 relative cursor-pointer overflow-hidden rounded-2xl h-full"
                     onClick={() => navigateToListing('Nha Trang')}
                  >
                     <img
                        src={nhatrang}
                        className="rounded-2xl object-cover w-full h-full transition-transform duration-500 hover:scale-125"
                     />
                     <span className="absolute bottom-5 right-5 flex items-center justify-center box-border overflow-hidden outline-none select-none px-4 py-2 opacity-100 bg-white bg-opacity-70 rounded-full">
                        Nha Trang
                     </span>
                  </div>
               </div>
            </div>

            <ApartmentPopular />

            {/* ===== Why choose Find House ===== */}
            <div className="my-14">
               <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {[
                     {
                        icon: <DollarOutlined />,
                        title: 'Best price guarantee',
                        description:
                           'Daily rates set by hosts — no hidden markup.',
                        tone: 'text-green-600 bg-green-50',
                     },
                     {
                        icon: <ThunderboltOutlined />,
                        title: 'Instant booking',
                        description:
                           'Real-time availability, confirmed in minutes.',
                        tone: 'text-blue-600 bg-blue-50',
                     },
                     {
                        icon: <SafetyCertificateOutlined />,
                        title: 'Secure payment',
                        description:
                           'Pay safely with Stripe, refunds protected.',
                        tone: 'text-purple-600 bg-purple-50',
                     },
                     {
                        icon: <CustomerServiceOutlined />,
                        title: '24/7 support',
                        description:
                           'We are here before, during and after your stay.',
                        tone: 'text-amber-600 bg-amber-50',
                     },
                  ].map((perk) => (
                     <div
                        key={perk.title}
                        className="p-5 bg-white rounded-2xl border border-gray-100 transition-shadow duration-300 shadow-card-sm hover:shadow-card-md"
                     >
                        <span
                           className={`flex justify-center items-center mb-3 w-11 h-11 text-lg rounded-xl ${perk.tone}`}
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
            </div>

            {/* ===== Become-a-host CTA ===== */}
            <div className="overflow-hidden relative mb-14 rounded-3xl bg-midnight-blue">
               <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-blue-500/20" />
               <div className="absolute right-24 -bottom-10 w-32 h-32 rounded-full bg-blue-400/20" />
               <div className="flex relative flex-col gap-6 justify-between items-start p-8 md:flex-row md:items-center md:p-12">
                  <div className="max-w-xl">
                     <p className="mb-2 text-sm font-semibold tracking-widest text-blue-300 uppercase">
                        Become a host
                     </p>
                     <h2 className="text-2xl font-bold text-white md:text-3xl">
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
                     className="flex-shrink-0 px-8 h-12 text-base font-semibold text-blue-600 bg-white rounded-full border-none hover:text-blue-700"
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
