import type { FC } from 'react';
import { Navigate } from 'react-router-dom';
import { path } from '@/utils/constant';

/** Ho so host dung chung trang Personal Information cua tai khoan */
const HostProfile: FC = () => {
   return (
      <Navigate
         to={`/${path.ACCOUNT_SETTINGS}/${path.PERSONAL_INFORMATION}`}
         replace
      />
   );
};

export default HostProfile;
