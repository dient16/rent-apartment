'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Spin } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FiAlertCircle, FiCheckCircle, FiKey } from 'react-icons/fi';
import { apiResetPassword, apiVerifyResetToken } from '@/apis';
import { useParams } from '@/lib/router-compat';
import { useAuth } from '@/hooks';
import { signIn } from '@/contexts/auth/reduces';
import AuthShell, {
   AUTH_PRIMARY_BUTTON,
   AuthStatus,
} from '@/components/Auth/AuthShell';
import NewPasswordForm from '@/components/Auth/NewPasswordForm';
import { getApiErrorMessage } from '@/utils/helpers';

/** Step 2 of password recovery: landing page of the reset email. */
const ResetPasswordPage: React.FC = () => {
   const { token = '' } = useParams<{ token: string }>();
   const { dispatch } = useAuth();
   const [done, setDone] = useState(false);

   const verify = useQuery({
      queryKey: ['reset-password-token', token],
      queryFn: () => apiVerifyResetToken(token),
      enabled: Boolean(token),
      retry: false,
   });

   const resetMutation = useMutation({
      mutationFn: apiResetPassword,
      onSuccess: (response) => {
         const { accessToken, user } = response.data || {};
         dispatch(signIn({ accessToken, user }));
         setDone(true);
      },
   });

   const renderContent = () => {
      if (done) {
         return (
            <AuthStatus
               tone="success"
               icon={<FiCheckCircle />}
               title="Password updated"
               description="Your password has been changed and you are signed in on this device. Any other sessions have been signed out."
            >
               <Button
                  type="primary"
                  className={AUTH_PRIMARY_BUTTON}
                  onClick={() => {
                     // Full navigation so the header picks up the new session
                     // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                     window.location.href = '/';
                  }}
               >
                  Continue to Find House
               </Button>
            </AuthStatus>
         );
      }

      if (!token || verify.isError) {
         return (
            <AuthStatus
               tone="error"
               icon={<FiAlertCircle />}
               title="Link expired"
               description={
                  <>
                     {getApiErrorMessage(
                        verify.error,
                        'This reset link is invalid or has expired.',
                     )}
                     <br />
                     Reset links only work for 1 hour and can be used once —
                     request a new one below.
                  </>
               }
            >
               <Link href="/forgot-password" className="w-full">
                  <Button type="primary" className={AUTH_PRIMARY_BUTTON}>
                     Request a new link
                  </Button>
               </Link>
               <Link
                  href="/auth"
                  className="text-sm font-semibold text-blue-600 hover:underline"
               >
                  Back to sign in
               </Link>
            </AuthStatus>
         );
      }

      if (verify.isPending) {
         return (
            <div className="flex flex-col gap-4 justify-center items-center py-16 text-sm text-gray-500">
               <Spin size="large" />
               Checking your link…
            </div>
         );
      }

      return (
         <>
            <span className="flex justify-center items-center mb-5 w-12 h-12 text-xl text-blue-600 bg-blue-50 rounded-2xl">
               <FiKey />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">
               Choose a new password
            </h1>
            <p className="mt-1.5 mb-7 text-sm text-gray-500">
               Pick something you haven&apos;t used before. You&apos;ll be signed
               in as soon as it&apos;s saved.
            </p>
            <NewPasswordForm
               email={verify.data?.data?.email}
               submitLabel="Update password"
               loading={resetMutation.isPending}
               error={
                  resetMutation.isError
                     ? getApiErrorMessage(
                          resetMutation.error,
                          'Could not update your password. Please try again.',
                       )
                     : null
               }
               onSubmit={(password) => resetMutation.mutate({ token, password })}
            />
         </>
      );
   };

   return (
      <AuthShell
         heroTitle="Choose a new password"
         heroSubtitle="Make it strong and unique — it keeps your bookings and payment details safe."
         closeHref="/auth"
      >
         {renderContent()}
      </AuthShell>
   );
};

export default ResetPasswordPage;
