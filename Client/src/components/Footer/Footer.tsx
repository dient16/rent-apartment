import React from 'react';
import { Link } from '@/lib/router-compat';
import { Input, message } from 'antd';
import {
   EnvironmentOutlined,
   FacebookFilled,
   InstagramFilled,
   MailOutlined,
   PhoneOutlined,
   SendOutlined,
   YoutubeFilled,
} from '@ant-design/icons';
import logo from '@/assets/logo.png';
import { path } from '@/utils/constant';

const exploreLinks = [
   { label: 'Explore stays', to: `/${path.LISTING}` },
   { label: 'Popular destinations', to: `/${path.HOME}` },
   { label: 'Become a host', to: `${path.HOST_ROOT}${path.HOST_DASHBOARD}` },
   { label: 'My bookings', to: `/${path.MY_BOOKING}` },
];

const companyLinks = [
   { label: 'About us', to: `/${path.ABOUT}` },
   { label: 'Contact', to: `/${path.CONTACT}` },
   { label: 'Account settings', to: `/${path.ACCOUNT_SETTINGS}` },
   { label: 'Notifications', to: `/${path.NOTIFICATIONS}` },
];

const Footer: React.FC = () => {
   const handleSubscribe = () => {
      message.success('Thanks for subscribing! 🎉');
   };

   return (
      <footer className="z-30 mt-5 w-full bg-midnight-blue font-main">
         <div className="px-5 pt-14 pb-8 mx-auto w-full max-w-main lg:px-7">
            <div className="grid gap-10 lg:grid-cols-12">
               {/* Brand */}
               <div className="lg:col-span-4">
                  <img
                     src={logo}
                     alt="Find House"
                     className="w-[140px] brightness-0 invert"
                  />
                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-midnight-blue-500">
                     Hand-picked apartments and homestays across Vietnam —
                     transparent pricing, instant booking and hosts who care.
                  </p>
                  <div className="flex gap-3 mt-6">
                     {[
                        { icon: <FacebookFilled />, label: 'Facebook' },
                        { icon: <InstagramFilled />, label: 'Instagram' },
                        { icon: <YoutubeFilled />, label: 'YouTube' },
                     ].map((social) => (
                        <a
                           key={social.label}
                           href="#"
                           aria-label={social.label}
                           className="flex justify-center items-center w-9 h-9 text-white rounded-full transition-colors bg-white/10 hover:bg-blue-500"
                        >
                           {social.icon}
                        </a>
                     ))}
                  </div>
               </div>

               {/* Explore */}
               <div className="lg:col-span-2">
                  <h3 className="mb-4 text-sm font-bold tracking-wider text-white uppercase">
                     Explore
                  </h3>
                  <ul className="space-y-2.5">
                     {exploreLinks.map((link) => (
                        <li key={link.label}>
                           <Link
                              to={link.to}
                              className="text-sm transition-colors text-midnight-blue-500 hover:text-white"
                           >
                              {link.label}
                           </Link>
                        </li>
                     ))}
                  </ul>
               </div>

               {/* Company */}
               <div className="lg:col-span-2">
                  <h3 className="mb-4 text-sm font-bold tracking-wider text-white uppercase">
                     Company
                  </h3>
                  <ul className="space-y-2.5">
                     {companyLinks.map((link) => (
                        <li key={link.label}>
                           <Link
                              to={link.to}
                              className="text-sm transition-colors text-midnight-blue-500 hover:text-white"
                           >
                              {link.label}
                           </Link>
                        </li>
                     ))}
                  </ul>
               </div>

               {/* Contact + subscribe */}
               <div className="lg:col-span-4">
                  <h3 className="mb-4 text-sm font-bold tracking-wider text-white uppercase">
                     Contact
                  </h3>
                  <ul className="space-y-2.5 text-sm text-midnight-blue-500">
                     <li className="flex gap-2.5 items-center">
                        <EnvironmentOutlined className="text-blue-400" />
                        123 Elm Street, District 1, Ho Chi Minh City
                     </li>
                     <li className="flex gap-2.5 items-center">
                        <PhoneOutlined className="text-blue-400" />
                        <a
                           href="tel:+84123456789"
                           className="transition-colors text-midnight-blue-500 hover:text-white"
                        >
                           +84 123 456 789
                        </a>
                     </li>
                     <li className="flex gap-2.5 items-center">
                        <MailOutlined className="text-blue-400" />
                        <a
                           href="mailto:info@findhouse.vn"
                           className="transition-colors text-midnight-blue-500 hover:text-white"
                        >
                           info@findhouse.vn
                        </a>
                     </li>
                  </ul>

                  <h3 className="mt-6 mb-3 text-sm font-bold tracking-wider text-white uppercase">
                     Get travel deals
                  </h3>
                  <div className="flex gap-2 items-center max-w-xs">
                     <Input
                        placeholder="Your email"
                        className="px-4 h-11 rounded-full border-none bg-white/10 text-white placeholder:text-midnight-blue-500"
                     />
                     <button
                        type="button"
                        aria-label="Subscribe"
                        onClick={handleSubscribe}
                        className="flex flex-shrink-0 justify-center items-center w-11 h-11 text-white bg-blue-500 rounded-full border-none transition-colors cursor-pointer hover:bg-blue-600"
                     >
                        <SendOutlined />
                     </button>
                  </div>
               </div>
            </div>

            {/* Bottom bar */}
            <div className="flex flex-col gap-3 justify-between items-center pt-6 mt-10 border-t sm:flex-row border-white/10">
               <p className="text-xs text-midnight-blue-500">
                  © {new Date().getFullYear()} Find House. All rights reserved.
               </p>
               <div className="flex gap-5 text-xs text-midnight-blue-500">
                  <Link to={`/${path.ABOUT}`} className="transition-colors hover:text-white">
                     Privacy
                  </Link>
                  <Link to={`/${path.ABOUT}`} className="transition-colors hover:text-white">
                     Terms
                  </Link>
                  <Link to={`/${path.CONTACT}`} className="transition-colors hover:text-white">
                     Support
                  </Link>
               </div>
            </div>
         </div>
      </footer>
   );
};

export default Footer;
