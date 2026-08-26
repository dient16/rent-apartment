'use client';

import React from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { IoClose } from 'react-icons/io5';
import logo from '@/assets/logo-icon.png';
import AuthHero from './AuthHero';
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
         <AuthHero />

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
                  <Image src={logo} alt="NestStay" width={30} height={30} />
                  <span className="text-lg font-bold text-gray-900">
                     NestStay
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
