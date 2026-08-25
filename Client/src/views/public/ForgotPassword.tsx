'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Input } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { FiAlertCircle, FiArrowLeft, FiKey, FiMail } from 'react-icons/fi';
import { apiForgotPassword } from '@/apis';
import AuthShell, {
   AUTH_INPUT,
   AUTH_PRIMARY_BUTTON,
   AuthStatus,
} from '@/components/Auth/AuthShell';
import { getApiErrorMessage } from '@/utils/helpers';

const RESEND_COOLDOWN_SECONDS = 30;

/** Step 1 of password recovery: ask for the email and send the reset link. */
const ForgotPasswordPage: React.FC = () => {
   const [sentTo, setSentTo] = useState<string | null>(null);
   const [cooldown, setCooldown] = useState(0);

   const {
      control,
      handleSubmit,
      formState: { errors },
   } = useForm({ defaultValues: { email: '' } });

   const forgotMutation = useMutation({
      mutationFn: apiForgotPassword,
      onSuccess: (_response, variables) => {
         setSentTo(variables.email);
         setCooldown(RESEND_COOLDOWN_SECONDS);
      },
   });

   // Simple countdown so the user cannot hammer "resend"
   useEffect(() => {
      if (cooldown <= 0) return;
      const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
      return () => clearTimeout(timer);
   }, [cooldown]);

   const backToSignIn = (
      <Link
         href="/auth"
         className="inline-flex gap-1.5 items-center text-sm font-semibold text-gray-500 hover:text-gray-800"
      >
         <FiArrowLeft size={15} /> Back to sign in
      </Link>
   );

   return (
      <AuthShell
         heroTitle="Forgot your password?"
         heroSubtitle="No worries — we'll email you a link to choose a new one and get you back to booking."
      >
         {sentTo ? (
            <AuthStatus
               tone="success"
               icon={<FiMail />}
               title="Check your inbox"
               description={
                  <>
                     If an account exists for{' '}
                     <span className="font-semibold text-gray-800">{sentTo}</span>
                     , we&apos;ve sent a link to reset your password. It expires
                     in 1 hour.
                  </>
               }
            >
               <Button
                  type="primary"
                  className={AUTH_PRIMARY_BUTTON}
                  disabled={cooldown > 0}
                  loading={forgotMutation.isPending}
                  onClick={() => forgotMutation.mutate({ email: sentTo })}
               >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
               </Button>
               <p className="m-0 text-xs text-gray-400">
                  Didn&apos;t get it? Check your spam folder or try again.
               </p>
               <div className="mt-2">{backToSignIn}</div>
            </AuthStatus>
         ) : (
            <form
               onSubmit={handleSubmit((values) => forgotMutation.mutate(values))}
               className="flex flex-col"
               noValidate
            >
               <span className="flex justify-center items-center mb-5 w-12 h-12 text-xl text-blue-600 bg-blue-50 rounded-2xl">
                  <FiKey />
               </span>
               <h1 className="text-2xl font-bold text-gray-900">
                  Reset your password
               </h1>
               <p className="mt-1.5 mb-7 text-sm text-gray-500">
                  Enter the email you signed up with and we&apos;ll send you a
                  link to choose a new password.
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
                           type="email"
                           placeholder="you@example.com"
                           autoComplete="email"
                           autoFocus
                           {...field}
                           status={errors.email && 'error'}
                           prefix={
                              <FiMail size={17} className="mr-2 text-gray-400" />
                           }
                           className={AUTH_INPUT}
                        />
                        {errors.email && (
                           <span className="text-xs text-red-500">
                              {errors.email.message}
                           </span>
                        )}
                     </div>
                  )}
               />

               {forgotMutation.isError && (
                  <div className="flex gap-2 items-start px-3.5 py-3 mt-4 text-sm text-rose-600 bg-rose-50 rounded-xl border border-rose-100">
                     <FiAlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                     <span>
                        {getApiErrorMessage(
                           forgotMutation.error,
                           'Could not send the email. Please try again.',
                        )}
                     </span>
                  </div>
               )}

               <Button
                  type="primary"
                  htmlType="submit"
                  loading={forgotMutation.isPending}
                  className={`mt-6 ${AUTH_PRIMARY_BUTTON}`}
               >
                  Send reset link
               </Button>

               <div className="mt-7 text-center">{backToSignIn}</div>
            </form>
         )}
      </AuthShell>
   );
};

export default ForgotPasswordPage;
