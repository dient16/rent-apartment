import icons from '@/utils/icons';
import { Button } from 'antd';
import { useState } from 'react';
const { FcGoogle, SiFacebook } = icons;

const ButtonSignInGoogle: React.FC = () => {
   const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
   const [isLoadingFaceBook, setIsLoadingFaceBook] = useState(false);

   const handleLoginGoogle = async () => {
      window.open(
         `${process.env.NEXT_PUBLIC_SERVER_URL}/api/auth/google`,
         '_self',
      );
   };
   const handleLoginFaceBook = async () => {
      window.open(
         `${process.env.NEXT_PUBLIC_SERVER_URL}/api/auth/facebook`,
         '_self',
      );
   };
   return (
      <div className="grid grid-cols-2 gap-3">
         <Button
            className="flex gap-2 justify-center items-center w-full font-medium text-gray-700 rounded-xl border-gray-300 h-[46px] font-main hover:border-gray-400 hover:text-gray-900"
            icon={<FcGoogle size={20} />}
            loading={isLoadingGoogle}
            onClick={() => {
               setIsLoadingGoogle(true);
               handleLoginGoogle();
            }}
         >
            Google
         </Button>
         <Button
            className="flex gap-2 justify-center items-center w-full font-medium text-gray-700 rounded-xl border-gray-300 h-[46px] font-main hover:border-gray-400 hover:text-gray-900"
            icon={<SiFacebook size={18} className="text-[#1877F2]" />}
            loading={isLoadingFaceBook}
            onClick={() => {
               setIsLoadingFaceBook(true);
               handleLoginFaceBook();
            }}
         >
            Facebook
         </Button>
      </div>
   );
};

export default ButtonSignInGoogle;
