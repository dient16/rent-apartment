'use client';

import React from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { IoClose } from 'react-icons/io5';
import logo from '@/assets/logo-icon.png';
import loginImage from '@/assets/login.png';
import SignIn from './SignIn';
import SignUp from './SignUp';

export type AuthTab = 'signin' | 'signup';

interface AuthLayoutProps {
   activeTab: AuthTab;
   onSwitchTab: (tab: AuthTab) => void;
   onClose: () => void;
   /** Called after a successful sign-in (defaults to a full reload). */
   onSignedIn?: () => void;
   setModalOpen: React.Dispatch<
      React.SetStateAction<{ isOpen: boolean; activeTab: string }>
   >;
}

/** Split auth screen: brand hero left, form right — shared by the modal and the /auth page. */
const AuthLayout: React.FC<AuthLayoutProps> = ({
   activeTab,
   onSwitchTab,
   onClose,
   onSignedIn,
   setModalOpen,
}) => {
   return (
      <div className="flex w-full h-full bg-white font-main">
         {/* ===== Brand hero (desktop only) ===== */}
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

            {/* Welcome message, centered on the photo */}
            <div className="flex absolute inset-0 flex-col justify-center items-center px-12 text-center -translate-y-[calc(12%+20px)]">
               <h2 className="text-4xl font-bold text-white xl:text-5xl drop-shadow-md">
                  Welcome to Find House
               </h2>
               <p className="mt-4 max-w-md text-base text-white/85 xl:text-lg">
                  Sign in or create an account to book hand-picked apartments
                  and homestays across Vietnam.
               </p>
            </div>
         </div>

         {/* ===== Form side ===== */}
         <div className="overflow-y-auto relative flex-1 h-full">
            <button
               type="button"
               aria-label="Close"
               onClick={onClose}
               className="flex absolute top-5 right-5 z-10 justify-center items-center w-10 h-10 text-gray-500 bg-gray-100 rounded-full border-none transition-colors cursor-pointer hover:bg-gray-200 hover:text-gray-800"
            >
               <IoClose size={22} />
            </button>

            <div className="flex flex-col justify-start px-6 pt-16 pb-14 mx-auto w-full min-h-full max-w-[430px] sm:px-8 lg:pt-[9vh]">
               {/* Mobile brand */}
               <div className="flex gap-2 justify-center items-center mb-8 lg:hidden">
                  <Image src={logo} alt="Find House" width={30} height={30} />
                  <span className="text-lg font-bold text-gray-900">
                     Find House
                  </span>
               </div>

               {/* Pill switch */}
               <div className="flex p-1 mb-8 bg-gray-100 rounded-full">
                  {(
                     [
                        { key: 'signin', label: 'Sign in' },
                        { key: 'signup', label: 'Sign up' },
                     ] as const
                  ).map((tab) => (
                     <button
                        key={tab.key}
                        type="button"
                        onClick={() => onSwitchTab(tab.key)}
                        className={clsx(
                           'flex-1 py-2.5 text-sm font-semibold rounded-full border-none transition-all cursor-pointer',
                           activeTab === tab.key
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'bg-transparent text-gray-500 hover:text-gray-700',
                        )}
                     >
                        {tab.label}
                     </button>
                  ))}
               </div>

               {activeTab === 'signin' ? (
                  <SignIn
                     setModalOpen={setModalOpen}
                     onSignedIn={onSignedIn}
                     onSwitchToSignUp={() => onSwitchTab('signup')}
                  />
               ) : (
                  <SignUp onSwitchToSignIn={() => onSwitchTab('signin')} />
               )}
            </div>
         </div>
      </div>
   );
};

export default AuthLayout;
