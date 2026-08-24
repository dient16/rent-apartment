import icons from '@/utils/icons';
import { Button } from 'antd';
import { useEffect, useState } from 'react';
const { FcGoogle, SiFacebook } = icons;

type Provider = 'google' | 'facebook';

const ButtonSignInGoogle: React.FC = () => {
   const [loadingProvider, setLoadingProvider] = useState<Provider | null>(
      null,
   );

   // Clicking navigates away to the OAuth provider. If the user presses Back,
   // the browser restores this page from the back/forward cache with the old
   // React state, so the button would spin forever. `pageshow` fires on that
   // restore (persisted === true); reset there.
   useEffect(() => {
      const reset = (event: PageTransitionEvent) => {
         if (event.persisted) setLoadingProvider(null);
      };
      window.addEventListener('pageshow', reset);
      return () => window.removeEventListener('pageshow', reset);
   }, []);

   const startOAuth = (provider: Provider) => {
      setLoadingProvider(provider);
      window.open(
         `${process.env.NEXT_PUBLIC_SERVER_URL}/api/auth/${provider}`,
         '_self',
      );
   };

   const buttonClassName =
      'flex gap-2 justify-center items-center w-full font-medium text-gray-700 rounded-xl border-gray-300 h-[46px] font-main hover:border-gray-400 hover:text-gray-900';

   return (
      <div className="grid grid-cols-2 gap-3">
         <Button
            className={buttonClassName}
            icon={<FcGoogle size={20} />}
            loading={loadingProvider === 'google'}
            disabled={loadingProvider !== null}
            onClick={() => startOAuth('google')}
         >
            Google
         </Button>
         <Button
            className={buttonClassName}
            icon={<SiFacebook size={18} className="text-[#1877F2]" />}
            loading={loadingProvider === 'facebook'}
            disabled={loadingProvider !== null}
            onClick={() => startOAuth('facebook')}
         >
            Facebook
         </Button>
      </div>
   );
};

export default ButtonSignInGoogle;
