'use client';

import React from 'react';
import Image from 'next/image';
import logo from '@/assets/logo-icon.png';
import loginImage from '@/assets/login.png';

interface AuthHeroProps {
   title?: React.ReactNode;
   subtitle?: React.ReactNode;
}

/** Brand photo panel shown on the left of every auth screen (desktop only). */
const AuthHero: React.FC<AuthHeroProps> = ({
   title = 'Welcome to Find House',
   subtitle = 'Sign in or create an account to book hand-picked apartments and homestays across Vietnam.',
}) => (
   <div className="hidden overflow-hidden relative w-1/2 lg:block xl:w-[55%] flex-shrink-0">
      <img
         src={loginImage.src}
         alt=""
         className="object-cover absolute inset-0 w-full h-full"
      />
      {/* Darken just enough for the text to read */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/50" />

      {/* Logo */}
      <div className="flex absolute top-8 left-10 gap-2.5 items-center">
         <span className="flex justify-center items-center w-10 h-10 bg-white rounded-xl shadow-lg">
            <Image src={logo} alt="Find House" width={24} height={24} />
         </span>
         <span className="text-lg font-bold text-white">Find House</span>
      </div>

      {/* Message, centered on the photo */}
      <div className="flex absolute inset-0 flex-col justify-center items-center px-12 text-center -translate-y-[calc(12%+20px)]">
         <h2 className="text-4xl font-bold text-white xl:text-5xl drop-shadow-md">
            {title}
         </h2>
         <p className="mt-4 max-w-md text-base text-white/85 xl:text-lg">
            {subtitle}
         </p>
      </div>
   </div>
);

export default AuthHero;
