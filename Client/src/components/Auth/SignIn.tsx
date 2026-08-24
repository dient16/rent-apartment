import React from 'react';
import { Button, Input, message } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { FiMail, FiLock } from 'react-icons/fi';
import { apiLogin } from '@/apis';
import { useAuth } from '@/hooks';
import { signIn } from '@/contexts/auth/reduces';
import ButtonSignIn from './ButtonSignIn';
import FullscreenLoader from '@/components/FullscreenLoader/FullscreenLoader';

interface SignInProps {
   setModalOpen: React.Dispatch<
      React.SetStateAction<{ isOpen: boolean; activeTab: string }>
   >;
   onSwitchToSignUp?: () => void;
   /** Override the post-login behavior (default: reload the current page). */
   onSignedIn?: () => void;
}

const SignIn: React.FC<SignInProps> = ({ setModalOpen, onSwitchToSignUp, onSignedIn }) => {
   const { dispatch } = useAuth();
   const {
      handleSubmit,
      control,
      formState: { errors },
      reset,
   } = useForm({
      defaultValues: {
         email: '',
         password: '',
      },
   });
   const loginMutation = useMutation({ mutationFn: apiLogin });
   const handleLogin = (data: ReqSignIn) => {
      loginMutation.mutate(data, {
         onSuccess: (response) => {
            if (response.success) {
               const { accessToken, user } = response.data || {};
               setModalOpen({ isOpen: false, activeTab: 'signin' });
               dispatch(signIn({ accessToken, user }));
               message.success('Login successfully');
               reset();
               if (onSignedIn) onSignedIn();
               else window.location.reload();
            }
         },
         onError: () => {
            message.error('Login failed');
         },
      });
   };

   return (
      <>
         <FullscreenLoader spinning={loginMutation.isPending} />
         <form onSubmit={handleSubmit(handleLogin)} className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="mt-1.5 mb-7 text-sm text-gray-500">
               Sign in to manage your bookings and favorite stays.
            </p>

            <div className="flex flex-col gap-4">
               <Controller
                  control={control}
                  name="email"
                  rules={{
                     required: 'Email is required',
                     pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                     },
                  }}
                  render={({ field }) => (
                     <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700">
                           Email
                        </label>
                        <Input
                           size="large"
                           placeholder="you@example.com"
                           {...field}
                           status={errors.email && 'error'}
                           prefix={
                              <FiMail size={17} className="mr-2 text-gray-400" />
                           }
                           className="px-4 rounded-xl h-[48px]"
                        />
                        {errors.email && (
                           <span className="text-xs text-red-500 font-main">
                              {errors.email.message}
                           </span>
                        )}
                     </div>
                  )}
               />
               <Controller
                  control={control}
                  name="password"
                  rules={{
                     required: 'Password is required',
                     minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters',
                     },
                  }}
                  render={({ field }) => (
                     <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-gray-700">
                           Password
                        </label>
                        <Input.Password
                           size="large"
                           placeholder="Your password"
                           {...field}
                           status={errors.password && 'error'}
                           prefix={
                              <FiLock size={17} className="mr-2 text-gray-400" />
                           }
                           className="px-4 rounded-xl h-[48px]"
                        />
                        {errors.password && (
                           <span className="text-xs text-red-500 font-main">
                              {errors.password.message}
                           </span>
                        )}
                     </div>
                  )}
               />
            </div>

            <Button
               type="primary"
               htmlType="submit"
               disabled={loginMutation.isPending}
               className="mt-6 w-full h-[48px] text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl border-none shadow-md shadow-blue-500/25 font-main hover:from-blue-700 hover:to-blue-600"
            >
               Sign in
            </Button>

            <div className="flex gap-3 items-center my-6">
               <span className="flex-1 h-px bg-gray-200" />
               <span className="text-xs font-medium tracking-wide text-gray-400 uppercase">
                  or continue with
               </span>
               <span className="flex-1 h-px bg-gray-200" />
            </div>

            <ButtonSignIn />

            <p className="mt-7 text-sm text-center text-gray-500">
               Don&apos;t have an account?{' '}
               <button
                  type="button"
                  onClick={onSwitchToSignUp}
                  className="p-0 font-semibold text-blue-600 bg-transparent border-none cursor-pointer hover:underline font-main"
               >
                  Sign up for free
               </button>
            </p>
         </form>
      </>
   );
};

export default SignIn;
