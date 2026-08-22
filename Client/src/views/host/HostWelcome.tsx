import React, { useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Button } from 'antd';
import {
   ArrowRightOutlined,
   CalendarOutlined,
   DollarOutlined,
   HomeOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { apiMarkHostWelcomeSeen } from '@/apis';
import { useAuth } from '@/hooks';
import { path } from '@/utils/constant';

const steps = [
   {
      icon: <HomeOutlined />,
      step: '01',
      title: 'List your place',
      description:
         'Add photos, describe your rooms and pin your location on the map. It only takes a few minutes.',
   },
   {
      icon: <CalendarOutlined />,
      step: '02',
      title: 'Set pricing & availability',
      description:
         'Control your nightly rates for every date with the pricing calendar — you are always in charge.',
   },
   {
      icon: <DollarOutlined />,
      step: '03',
      title: 'Welcome guests & earn',
      description:
         'Confirm booking requests, chat with guests and watch your revenue grow on the dashboard.',
   },
];

/** Welcome page for the first switch into host mode */
const HostWelcome: React.FC = () => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const queryClient = useQueryClient();

   // Mark as seen on the SERVER (per account, survives device changes)
   useEffect(() => {
      apiMarkHostWelcomeSeen()
         .then(() => {
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
         })
         .catch(() => {
            // network error: the welcome shows again next time — acceptable
         });
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   return (
      <div className="min-h-screen bg-gray-50 font-main">
         {/* Hero */}
         <div className="overflow-hidden relative bg-midnight-blue">
            <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-500/20" />
            <div className="absolute right-40 -bottom-16 w-40 h-40 rounded-full bg-blue-400/20" />
            <div className="relative px-5 py-16 mx-auto text-center max-w-main md:py-24 lg:px-7">
               <p className="mb-3 text-sm font-semibold tracking-widest text-blue-300 uppercase">
                  Welcome{user?.firstname ? `, ${user.firstname}` : ''} 👋
               </p>
               <h1 className="mx-auto mb-4 max-w-2xl text-3xl font-bold text-white md:text-5xl md:leading-tight">
                  Turn your space into your next paycheck
               </h1>
               <p className="mx-auto mb-8 max-w-xl text-base text-gray-300 md:text-lg">
                  You are now in hosting mode. List your apartment for free,
                  manage bookings and pricing in one place, and start earning
                  from your empty rooms.
               </p>
               <div className="flex flex-wrap gap-4 justify-center">
                  <Button
                     type="primary"
                     size="large"
                     className="px-8 h-12 text-base font-semibold bg-blue-500 rounded-full hover:bg-blue-600"
                     onClick={() =>
                        navigate(`${path.HOST_ROOT}${path.CREATE_APARTMENT}`)
                     }
                  >
                     Create your first listing <ArrowRightOutlined />
                  </Button>
                  <Button
                     size="large"
                     ghost
                     className="px-8 h-12 text-base text-white rounded-full border-white/60 hover:border-white"
                     onClick={() =>
                        navigate(`${path.HOST_ROOT}${path.HOST_DASHBOARD}`)
                     }
                  >
                     Explore the dashboard
                  </Button>
               </div>
            </div>
         </div>

         {/* 3 steps */}
         <div className="px-5 py-14 mx-auto max-w-main lg:px-7 md:py-20">
            <div className="mb-10 text-center">
               <h2 className="text-2xl font-bold text-gray-900 md:text-3xl">
                  Hosting in 3 simple steps
               </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
               {steps.map((item) => (
                  <div
                     key={item.step}
                     className="relative p-7 bg-white rounded-2xl border border-gray-100 transition-shadow duration-300 shadow-card-sm hover:shadow-card-md"
                  >
                     <span className="absolute top-6 right-7 text-4xl font-bold text-gray-100 select-none">
                        {item.step}
                     </span>
                     <span className="flex justify-center items-center mb-5 w-12 h-12 text-xl text-blue-600 bg-blue-50 rounded-xl">
                        {item.icon}
                     </span>
                     <h3 className="mb-2 text-lg font-semibold text-gray-900">
                        {item.title}
                     </h3>
                     <p className="text-sm leading-relaxed text-gray-500">
                        {item.description}
                     </p>
                  </div>
               ))}
            </div>

            <div className="flex flex-col gap-3 items-center p-8 mt-10 text-center bg-white rounded-2xl border border-gray-100 shadow-card-sm md:flex-row md:justify-between md:text-left">
               <div>
                  <h3 className="text-lg font-bold text-gray-900">
                     Ready when you are
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                     Your listing goes live in search results as soon as you
                     publish it — no review queue, no fees.
                  </p>
               </div>
               <Button
                  type="primary"
                  size="large"
                  className="flex-shrink-0 px-8 h-12 bg-blue-500 rounded-full"
                  onClick={() =>
                     navigate(`${path.HOST_ROOT}${path.CREATE_APARTMENT}`)
                  }
               >
                  Get started <ArrowRightOutlined />
               </Button>
            </div>
         </div>
      </div>
   );
};

export default HostWelcome;
