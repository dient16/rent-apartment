'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { IoClose } from 'react-icons/io5';
import logo from '@/assets/logo-icon.png';
import AuthHero from './AuthHero';

interface AuthShellProps {
   children: React.ReactNode;
   heroTitle?: React.ReactNode;
   heroSubtitle?: React.ReactNode;
   /** Where the close button goes (default: home). */
   closeHref?: string;
}

/**
 * Full-page frame for the standalone auth screens (set / forgot / reset password):
 * the same brand hero as the sign-in screen with the content centered on the right.
 */
const AuthShell: React.FC<AuthShellProps> = ({
   children,
   heroTitle,
   heroSubtitle,
   closeHref = '/',
}) => (
   <div className="flex w-screen h-dvh bg-white font-main">
      <AuthHero title={heroTitle} subtitle={heroSubtitle} />

      <div className="overflow-y-auto relative flex-1 h-full">
         <Link
            href={closeHref}
            aria-label="Close"
            className="flex absolute top-5 right-5 z-10 justify-center items-center w-10 h-10 text-gray-500 bg-gray-100 rounded-full transition-colors hover:bg-gray-200 hover:text-gray-800"
         >
            <IoClose size={22} />
         </Link>

         <div className="flex flex-col justify-center px-6 pt-16 pb-14 mx-auto w-full min-h-full max-w-[430px] sm:px-8">
            {/* Mobile brand */}
            <div className="flex gap-2 justify-center items-center mb-8 lg:hidden">
               <Image src={logo} alt="NestStay" width={30} height={30} />
               <span className="text-lg font-bold text-gray-900">NestStay</span>
            </div>

            {children}
         </div>
      </div>
   </div>
);

/* ---------- Small building blocks shared by the auth screens ---------- */

interface AuthStatusProps {
   tone: 'success' | 'error' | 'info';
   icon: React.ReactNode;
   title: string;
   description: React.ReactNode;
   children?: React.ReactNode;
}

const TONE_CLASSES: Record<AuthStatusProps['tone'], string> = {
   success: 'text-green-500 bg-green-50',
   error: 'text-rose-500 bg-rose-50',
   info: 'text-blue-500 bg-blue-50',
};

/** Centered icon + title + copy, for the "check your inbox" / "link expired" states. */
export const AuthStatus: React.FC<AuthStatusProps> = ({
   tone,
   icon,
   title,
   description,
   children,
}) => (
   <div className="flex flex-col items-center py-4 text-center">
      <span
         className={`flex justify-center items-center mb-5 w-16 h-16 text-3xl rounded-full ${TONE_CLASSES[tone]}`}
      >
         {icon}
      </span>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{title}</h1>
      <div className="max-w-xs text-sm leading-relaxed text-gray-500">
         {description}
      </div>
      {children && (
         <div className="flex flex-col gap-3 items-center mt-7 w-full">
            {children}
         </div>
      )}
   </div>
);

/** Primary CTA used across the auth screens (same look as the sign-in button). */
export const AUTH_PRIMARY_BUTTON =
   'w-full h-[48px] text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl border-none shadow-md shadow-blue-500/25 font-main hover:from-blue-700 hover:to-blue-600';

export const AUTH_INPUT = 'px-4 rounded-xl h-[48px]';

export default AuthShell;
