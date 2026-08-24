import React, { useState } from 'react';
import { Button, Input } from 'antd';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { FiMail, FiCheckCircle } from 'react-icons/fi';
import { apiSignUp } from '@/apis';
import ButtonSignIn from './ButtonSignIn';

interface SignUpProps {
   onSwitchToSignIn?: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onSwitchToSignIn }) => {
   const [message, setMessage] = useState('');
   const {
      handleSubmit,
      control,
      reset,
      formState: { errors },
   } = useForm({
      defaultValues: {
         email: '',
      },
   });
   const signUpMutation = useMutation({
      mutationFn: apiSignUp,
   });
   const handleRegister = (data: ReqSignUp) => {
      signUpMutation.mutate(data, {
         onSuccess: (response) => {
            if (response.success) {
               setMessage(response.message);
               reset();
            }
         },
      });
   };

   if (message) {
      return (
         <div className="flex flex-col items-center py-8 text-center">
            <span className="flex justify-center items-center mb-5 w-16 h-16 text-3xl text-green-500 bg-green-50 rounded-full">
               <FiCheckCircle />
            </span>
            <h2 className="mb-2 text-xl font-bold text-gray-900">
               Check your inbox
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-gray-500">
               {message}
            </p>
            <button
               type="button"
               onClick={onSwitchToSignIn}
               className="p-0 mt-6 text-sm font-semibold text-blue-600 bg-transparent border-none cursor-pointer hover:underline font-main"
            >
               Back to sign in
            </button>
         </div>
      );
   }

   return (
      <form onSubmit={handleSubmit(handleRegister)} className="flex flex-col">
         <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
         <p className="mt-1.5 mb-7 text-sm text-gray-500">
            Enter your email and we&apos;ll send a confirmation link to get you
            started.
         </p>

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
                     prefix={<FiMail size={17} className="mr-2 text-gray-400" />}
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

         <Button
            type="primary"
            htmlType="submit"
            loading={signUpMutation.isPending}
            className="mt-6 w-full h-[48px] text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl border-none shadow-md shadow-blue-500/25 font-main hover:from-blue-700 hover:to-blue-600"
         >
            Create account
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
            Already have an account?{' '}
            <button
               type="button"
               onClick={onSwitchToSignIn}
               className="p-0 font-semibold text-blue-600 bg-transparent border-none cursor-pointer hover:underline font-main"
            >
               Sign in
            </button>
         </p>
      </form>
   );
};

export default SignUp;
