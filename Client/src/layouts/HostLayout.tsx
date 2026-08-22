import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { message } from 'antd';
import { Header } from '@/components';
import { Footer } from '@/components';
import { useAuth } from '@/hooks';
import { path } from '@/utils/constant';

const HostLayout: React.FC = () => {
   const { user } = useAuth();
   const location = useLocation();

   // Guard theo token trong localStorage (sync) de khong da nguoi dung that
   // ra ngoai trong luc auth context con dang tai currentUser.
   const hasToken = !!localStorage.getItem('ACCESS_TOKEN');

   if (!hasToken) {
      message.info('Please sign in to access the host panel');
      return <Navigate to={`/${path.HOME}`} replace />;
   }

   // Lan dau chuyen sang che do host -> trang chao mung (flag luu tren server)
   const isWelcomePage = location.pathname.includes(
      `${path.HOST_ROOT}${path.HOST_WELCOME}`,
   );
   const welcomeSeen = user ? user.hasSeenHostWelcome !== false : true; // user chua tai xong: khong redirect voi
   if (!welcomeSeen && !isWelcomePage) {
      return <Navigate to={`${path.HOST_ROOT}${path.HOST_WELCOME}`} replace />;
   }

   return (
      <div className="flex flex-col justify-center items-center w-full font-main">
         <Header isHost={true} />
         <div className="w-full min-h-screen bg-gray-50">
            <Outlet />
         </div>
         <Footer />
      </div>
   );
};

export default HostLayout;
