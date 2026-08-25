'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Spin } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FiAlertCircle, FiCheckCircle, FiShield } from 'react-icons/fi';
import { apiSetPassword, apiVerifySetPasswordToken } from '@/apis';
import { useParams } from '@/lib/router-compat';
import { useAuth } from '@/hooks';
import { signIn } from '@/contexts/auth/reduces';
import AuthShell, {
   AUTH_PRIMARY_BUTTON,
   AuthStatus,
} from '@/components/Auth/AuthShell';
import NewPasswordForm from '@/components/Auth/NewPasswordForm';
import { getApiErrorMessage } from '@/utils/helpers';

/** Landing page of the confirmation email: the user picks their first password here. */
const SetPasswordPage: React.FC = () => {
   const { token = '' } = useParams<{ token: string }>();
   const { dispatch } = useAuth();
   const [done, setDone] = useState(false);

   // The server redirects here with "invalid" when the email link was bad — skip the request.
   const hasToken = Boolean(token) && token !== 'invalid';

   const verify = useQuery({
      queryKey: ['set-password-token', token],
      queryFn: () => apiVerifySetPasswordToken(token),
      enabled: hasToken,
      retry: false,
   });

   const setPasswordMutation = useMutation({
      mutationFn: apiSetPassword,
      onSuccess: (response) => {
         const { accessToken, user } = response.data || {};
         dispatch(signIn({ accessToken, user }));
         setDone(true);
      },
   });

   const invalidMessage = !hasToken
      ? 'This confirmation link is invalid or has already been used.'
      : verify.isError
        ? getApiErrorMessage(
             verify.error,
             'This confirmation link is invalid or has already been used.',
          )
        : null;

   const renderContent = () => {
      if (done) {
         return (
            <AuthStatus
               tone="success"
               icon={<FiCheckCircle />}
               title="You're all set"
               description="Your password has been saved and you are now signed in. Enjoy your stay hunting!"
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
                  Start exploring
               </Button>
            </AuthStatus>
         );
      }

      if (invalidMessage) {
         return (
            <AuthStatus
               tone="error"
               icon={<FiAlertCircle />}
               title="Link not valid"
               description={
                  <>
                     {invalidMessage}
                     <br />
                     If you already have a password, just sign in. Otherwise
                     start the sign-up again to get a fresh link.
                  </>
               }
            >
               <Link href="/auth" className="w-full">
                  <Button type="primary" className={AUTH_PRIMARY_BUTTON}>
                     Go to sign in
                  </Button>
               </Link>
               <Link
                  href="/auth?tab=signup"
                  className="text-sm font-semibold text-blue-600 hover:underline"
               >
                  Sign up again
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
               <FiShield />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">
               Create your password
            </h1>
            <p className="mt-1.5 mb-7 text-sm text-gray-500">
               Your email is confirmed. Choose a password to finish setting up
               your account.
            </p>
            <NewPasswordForm
               email={verify.data?.data?.email}
               submitLabel="Save password & sign in"
               loading={setPasswordMutation.isPending}
               error={
                  setPasswordMutation.isError
                     ? getApiErrorMessage(
                          setPasswordMutation.error,
                          'Could not save your password. Please try again.',
                       )
                     : null
               }
               onSubmit={(password) =>
                  setPasswordMutation.mutate({ token, password })
               }
            />
         </>
      );
   };

   return (
      <AuthShell
         heroTitle="Almost there"
         heroSubtitle="One last step — create a password to secure your new Find House account."
      >
         {renderContent()}
      </AuthShell>
   );
};

export default SetPasswordPage;
