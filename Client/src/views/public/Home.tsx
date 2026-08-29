'use client';

import React from 'react';
import Image from 'next/image';
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

/** Order matters: it drives the bento layout on sm/lg (see `span`).
 *  lg (4 cols x 5 rows): tall | 3+2 | tall | 2+3 - the side columns are staggered on purpose. */
const DESTINATIONS = [
   { label: 'Quy Nhon', tagline: 'Quiet beaches & seafood', province: 'Quy nhơn', image: quynhon, span: 'lg:row-span-5 sm:row-span-4' },
   { label: 'Da Lat', tagline: 'Pine hills & cool air', province: 'Đà Lạt', image: datlat, span: 'lg:row-span-3 sm:row-span-2' },
   { label: 'Da Nang', tagline: 'Bridges, beaches & nightlife', province: 'Đà Nẵng', image: danang, span: 'lg:row-span-5 sm:row-span-4' },
   { label: 'Ho Chi Minh', tagline: 'The city that never sleeps', province: 'Hồ Chí Minh', image: hochiminh, span: 'lg:row-span-2 sm:row-span-2' },
   { label: 'Hoi An', tagline: 'Lanterns & old town charm', province: 'Hội An', image: hoian, span: 'lg:row-span-3 sm:row-span-2' },
   { label: 'Nha Trang', tagline: 'Islands & turquoise bays', province: 'Nha Trang', image: nhatrang, span: 'lg:row-span-2 sm:row-span-2' },
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
   return (
      <div className="flex justify-center items-center font-main">
         <div className="px-4 w-full max-w-main md:px-3">
            {/* ===== Hero =====
                CSS animation, not framer-motion: a JS-driven `initial: hidden` ships the
                SSR HTML at opacity 0, so the hero stayed invisible until the bundle
                loaded and hydrated (seconds on a cold first load). */}
            <div className="relative z-30 md:mt-3 animate-fade-up">
               <div className="flex overflow-hidden relative flex-col justify-center items-center px-5 w-full text-center text-white bg-gray-800 rounded-3xl h-[220px] sm:h-[240px] md:h-[300px]">
                  {/* `priority` emits a <link rel="preload"> so the LCP image starts
                      downloading with the HTML; a CSS background-image only starts
                      after style/layout. */}
                  <Image
                     src="/background.avif"
                     alt=""
                     aria-hidden="true"
                     fill
                     priority
                     sizes="(max-width: 1340px) 100vw, 1340px"
                     className="object-cover"
                  />
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
            </div>

            {/* ===== Popular destinations ===== */}
            <section className="mt-8 md:mt-[60px]">
               <div className="flex gap-4 justify-between items-end mb-4 md:mb-6">
                  <div>
                     <h2 className="text-xl font-bold tracking-tight text-gray-900 md:text-2xl">
                        Popular destinations
                     </h2>
                     <p className="mt-1 text-sm text-gray-500">
                        Hand-picked stays in Vietnam&apos;s favourite escapes
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
               {/* Mobile: swipeable row. sm+: bento grid. */}
               <div className="flex overflow-x-auto gap-3 -mx-4 px-4 pb-1 snap-x snap-mandatory scrollbar-none sm:grid sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 sm:grid-cols-2 sm:grid-rows-8 sm:gap-4 sm:h-[720px] md:h-[760px] lg:grid-cols-4 lg:grid-rows-5 lg:gap-4 lg:h-[380px]">
                  {DESTINATIONS.map((destination, index) => (
                     <button
                        key={destination.label}
                        type="button"
                        aria-label={`Explore ${destination.label}`}
                        className={`group overflow-hidden relative flex-shrink-0 p-0 w-[68vw] max-w-[300px] h-48 text-left bg-gray-200 rounded-2xl border-none cursor-pointer snap-start shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-gray-300/60 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:w-auto sm:max-w-none sm:h-auto ${destination.span}`}
                        onClick={() => navigateToListing(destination.province)}
                     >
                        <Image
                           src={destination.image}
                           alt={destination.label}
                           fill
                           sizes="(max-width: 640px) 68vw, (max-width: 1024px) 50vw, 25vw"
                           placeholder="blur"
                           priority={index < 3}
                           className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                        {/* Legible label on any photo: soft gradient that deepens on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent transition-opacity duration-300 group-hover:from-black/80" />
                        <div className="flex absolute right-4 bottom-4 left-4 gap-3 justify-between items-end">
                           <div className="min-w-0">
                              <p className="text-base font-bold leading-tight text-white drop-shadow-sm md:text-lg">
                                 {destination.label}
                              </p>
                              <p className="mt-0.5 text-xs text-white/80 truncate md:text-[13px]">
                                 {destination.tagline}
                              </p>
                           </div>
                           <span className="flex flex-shrink-0 justify-center items-center w-9 h-9 text-white rounded-full border backdrop-blur-sm transition-all duration-300 bg-white/15 border-white/30 group-hover:bg-white group-hover:text-gray-900">
                              <ArrowRightOutlined className="text-sm transition-transform duration-300 group-hover:-rotate-45" />
                           </span>
                        </div>
                     </button>
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
