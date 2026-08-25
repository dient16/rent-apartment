'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Spin } from 'antd';
import { FiAlertCircle } from 'react-icons/fi';
import { apiLoginGoogleSuccess } from '@/apis';
import { signIn } from '@/contexts/auth/reduces';
import { useAuth } from '@/hooks';
import { useParams } from '@/lib/router-compat';
import AuthShell, {
   AUTH_PRIMARY_BUTTON,
   AuthStatus,
} from '@/components/Auth/AuthShell';

/** OAuth providers redirect here; we swap the user id for tokens, then go home. */
const LoginSuccess: React.FC = () => {
   const { userId = '' } = useParams<{ userId: string }>();
   const { dispatch } = useAuth();
   const [failed, setFailed] = useState(false);

   useEffect(() => {
      let cancelled = false;
      const finishLogin = async () => {
         try {
            const response = await apiLoginGoogleSuccess({ userId });
            if (cancelled) return;
            if (!response.success) throw new Error(response.message);
            dispatch(
               signIn({
                  accessToken: response.data.accessToken,
                  user: response.data.user,
               }),
            );
            // Full navigation so the header picks up the new session
            window.location.replace('/');
         } catch {
            if (!cancelled) setFailed(true);
         }
      };
      finishLogin();
      return () => {
         cancelled = true;
      };
   }, [dispatch, userId]);

   return (
      <AuthShell>
         {failed ? (
            <AuthStatus
               tone="error"
               icon={<FiAlertCircle />}
               title="Sign-in didn't go through"
               description="We couldn't complete the sign-in with your social account. Please try again."
            >
               <Link href="/auth" className="w-full">
                  <Button type="primary" className={AUTH_PRIMARY_BUTTON}>
                     Back to sign in
                  </Button>
               </Link>
            </AuthStatus>
         ) : (
            <div className="flex flex-col gap-5 justify-center items-center py-16 text-center">
               <Spin size="large" />
               <div>
                  <h1 className="text-xl font-bold text-gray-900">
                     Signing you in…
                  </h1>
                  <p className="mt-1 text-sm text-gray-500">
                     Just a moment while we set up your session.
                  </p>
               </div>
            </div>
         )}
      </AuthShell>
   );
};

export default LoginSuccess;
