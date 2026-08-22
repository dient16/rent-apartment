import { apiLogout } from '@/apis';
import { signOut } from '@/contexts/auth/reduces';
import { useAuth } from '@/hooks';
import { path } from '@/utils/constant';
import icons from '@/utils/icons';
import { Button, Flex } from 'antd';
import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { IoHeartOutline } from 'react-icons/io5';

const MenuAccount: FC = () => {
   const { AiOutlineUser, LiaSignOutAltSolid, BsHouses, TbBrandBooking } =
      icons;
   const { dispatch } = useAuth();

   return (
      <div className="w-full max-w-[300px] min-w-[200px]">
         <Flex vertical gap={15}>
            <Flex align="center" gap={10}>
               <AiOutlineUser size={20} />
               <Link
                  className="p-0 m-0 w-full text-base text-left font-main"
                  to={`/${path.ACCOUNT_SETTINGS}/${path.PERSONAL_INFORMATION}`}
               >
                  Manage Account
               </Link>
            </Flex>
            <Flex align="center" gap={10}>
               <BsHouses size={20} />
               <Link
                  className="p-0 m-0 w-full text-base text-left font-main"
                  to={`${path.HOST_ROOT}${path.HOST_DASHBOARD}`}
               >
                  Manage Rental House
               </Link>
            </Flex>
            <Flex align="center" gap={10}>
               <IoHeartOutline size={20} />
               <Link
                  className="p-0 m-0 w-full text-base text-left font-main"
                  to={`/${path.FAVORITES}`}
               >
                  My Favorites
               </Link>
            </Flex>
            <Flex align="center" gap={10}>
               <TbBrandBooking size={20} />
               <Link
                  className="p-0 m-0 w-full text-base text-left font-main"
                  to={`/${path.MY_BOOKING}`}
               >
                  Booking & trip
               </Link>
            </Flex>

            <Flex align="center" gap={10}>
               <LiaSignOutAltSolid size={20} />
               <Button
                  className="flex p-0 m-0 text-base text-left border-none outline-none font-main h-fit"
                  onClick={async () => {
                     try {
                        // Huy refresh token o server (xoa cookie + DB) roi moi xoa state
                        await apiLogout();
                     } finally {
                        dispatch(signOut());
                     }
                  }}
               >
                  Sign out
               </Button>
            </Flex>
         </Flex>
      </div>
   );
};

export default MenuAccount;
