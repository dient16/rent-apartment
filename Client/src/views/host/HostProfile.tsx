import type { FC } from 'react';
import { Navigate } from '@/lib/router-compat';
import { path } from '@/utils/constant';

/** Host profile reuses the account Personal Information page */
const HostProfile: FC = () => {
   return (
      <Navigate
         to={`/${path.ACCOUNT_SETTINGS}/${path.PERSONAL_INFORMATION}`}
         replace
      />
   );
};

export default HostProfile;
