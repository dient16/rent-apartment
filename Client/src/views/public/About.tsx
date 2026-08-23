import React from 'react';
import { Link } from '@/lib/router-compat';
import { Button } from 'antd';
import {
   HomeOutlined,
   SafetyCertificateOutlined,
   CustomerServiceOutlined,
   ThunderboltOutlined,
   EnvironmentOutlined,
   PhoneOutlined,
   MailOutlined,
   ArrowRightOutlined,
} from '@ant-design/icons';
import { path } from '@/utils/constant';
import dalat from '@/assets/dalat.jpg';
import hoian from '@/assets/hoian.webp';
import nhatrang from '@/assets/nhatrang.jpg';

const stats = [
   { value: '1,200+', label: 'Rooms & homestays' },
   { value: '30+', label: 'Cities across Vietnam' },
   { value: '15,000+', label: 'Happy guests' },
   { value: '4.8/5', label: 'Average rating' },
];

const values = [
   {
      icon: <HomeOutlined />,
      title: 'Curated stays',
      description:
         'Every apartment and homestay is reviewed so you always know exactly what you are booking.',
   },
   {
      icon: <ThunderboltOutlined />,
      title: 'Instant booking',
      description:
         'Real-time availability and daily pricing — search, pick your dates and book in minutes.',
   },
   {
      icon: <SafetyCertificateOutlined />,
      title: 'Secure payments',
      description:
         'Payments are processed securely and your booking is confirmed by email right away.',
   },
   {
      icon: <CustomerServiceOutlined />,
      title: 'Here to help',
      description:
         'Our support team is available around the clock, before, during and after your trip.',
   },
];

const AboutPage: React.FC = () => {
   return (
      <div className="bg-white font-main">
         {/* Hero */}
         <section className="relative overflow-hidden bg-midnight-blue">
            <div className="absolute inset-0 opacity-20">
               <img
                  src={dalat.src}
                  alt=""
                  className="object-cover w-full h-full"
               />
            </div>
            <div className="relative px-6 py-20 mx-auto text-center max-w-main md:py-28">
               <p className="mb-3 text-sm font-semibold tracking-widest text-blue-300 uppercase">
                  About Find House
               </p>
               <h1 className="mx-auto mb-5 max-w-3xl text-3xl font-bold text-white md:text-5xl md:leading-tight">
                  Stays that feel like home, wherever you travel
               </h1>
               <p className="mx-auto mb-8 max-w-2xl text-base text-gray-300 md:text-lg">
                  Find House connects travelers with hand-picked apartments and
                  homestays across Vietnam — with transparent pricing, instant
                  booking and hosts who care.
               </p>
               <div className="flex flex-wrap gap-4 justify-center">
                  <Link to={`/${path.LISTING}`}>
                     <Button
                        type="primary"
                        size="large"
                        className="px-8 h-12 text-base bg-blue-500 rounded-full hover:bg-blue-600"
                     >
                        Explore stays <ArrowRightOutlined />
                     </Button>
                  </Link>
                  <Link to={`/${path.CONTACT}`}>
                     <Button
                        size="large"
                        className="px-8 h-12 text-base text-white bg-transparent rounded-full border-white/60 hover:border-white hover:text-white"
                        ghost
                     >
                        Contact us
                     </Button>
                  </Link>
               </div>
            </div>
         </section>

         {/* Stats */}
         <section className="px-6 mx-auto -mt-10 max-w-main">
            <div className="relative z-10 grid grid-cols-2 gap-6 p-8 bg-white rounded-2xl shadow-card-md md:grid-cols-4">
               {stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                     <p className="mb-1 text-2xl font-bold text-blue-600 md:text-3xl">
                        {stat.value}
                     </p>
                     <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
               ))}
            </div>
         </section>

         {/* Mission */}
         <section className="px-6 py-16 mx-auto max-w-main md:py-24">
            <div className="grid gap-12 items-center md:grid-cols-2">
               <div>
                  <p className="mb-3 text-sm font-semibold tracking-widest text-blue-500 uppercase">
                     Our mission
                  </p>
                  <h2 className="mb-5 text-2xl font-bold text-gray-900 md:text-4xl">
                     Making every trip simple, transparent and memorable
                  </h2>
                  <p className="mb-4 text-gray-600 md:text-lg">
                     Booking a place to stay should be the easiest part of your
                     trip. We built Find House so that guests can compare real
                     rooms, real prices and real availability — no surprises at
                     check-in.
                  </p>
                  <p className="text-gray-600 md:text-lg">
                     For hosts, we provide the tools to manage listings,
                     calendars and bookings in one place, so they can focus on
                     what matters: welcoming their guests.
                  </p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <img
                     src={hoian.src}
                     alt="Hoi An homestay"
                     className="object-cover w-full h-64 rounded-2xl shadow-card-lg"
                  />
                  <img
                     src={nhatrang.src}
                     alt="Nha Trang apartment"
                     className="object-cover mt-8 w-full h-64 rounded-2xl shadow-card-lg"
                  />
               </div>
            </div>
         </section>

         {/* Values */}
         <section className="bg-gray-50">
            <div className="px-6 py-16 mx-auto max-w-main md:py-24">
               <div className="mb-12 text-center">
                  <p className="mb-3 text-sm font-semibold tracking-widest text-blue-500 uppercase">
                     Why Find House
                  </p>
                  <h2 className="text-2xl font-bold text-gray-900 md:text-4xl">
                     Built around you
                  </h2>
               </div>
               <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {values.map((value) => (
                     <div
                        key={value.title}
                        className="p-7 bg-white rounded-2xl border border-gray-100 transition-shadow duration-300 hover:shadow-card-md"
                     >
                        <div className="flex justify-center items-center mb-5 w-12 h-12 text-xl text-blue-600 bg-blue-50 rounded-xl">
                           {value.icon}
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">
                           {value.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-gray-600">
                           {value.description}
                        </p>
                     </div>
                  ))}
               </div>
            </div>
         </section>

         {/* Company info + CTA */}
         <section className="px-6 py-16 mx-auto max-w-main md:py-24">
            <div className="grid overflow-hidden rounded-3xl md:grid-cols-2 bg-midnight-blue">
               <div className="p-10 md:p-14">
                  <h2 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                     Find House Co., Ltd
                  </h2>
                  <p className="mb-8 text-gray-300">
                     Founded in 2024, we have been committed to providing the
                     best booking experiences for travelers across Vietnam and
                     beyond.
                  </p>
                  <ul className="space-y-4 text-gray-200">
                     <li className="flex gap-3 items-center">
                        <EnvironmentOutlined className="text-blue-300" />
                        123 Elm Street, District 1, Ho Chi Minh City, Vietnam
                     </li>
                     <li className="flex gap-3 items-center">
                        <PhoneOutlined className="text-blue-300" />
                        +84 123 456 789
                     </li>
                     <li className="flex gap-3 items-center">
                        <MailOutlined className="text-blue-300" />
                        info@findhouse.vn
                     </li>
                  </ul>
               </div>
               <div className="flex flex-col justify-center items-start p-10 bg-blue-600 md:p-14">
                  <h3 className="mb-3 text-xl font-bold text-white md:text-2xl">
                     Ready for your next stay?
                  </h3>
                  <p className="mb-6 text-blue-100">
                     Browse hundreds of verified apartments and homestays — your
                     perfect room is a few clicks away.
                  </p>
                  <Link to={`/${path.LISTING}`}>
                     <Button
                        size="large"
                        className="px-8 h-12 text-base font-semibold text-blue-600 bg-white rounded-full border-none hover:text-blue-700"
                     >
                        Start exploring <ArrowRightOutlined />
                     </Button>
                  </Link>
               </div>
            </div>
         </section>
      </div>
   );
};

export default AboutPage;
