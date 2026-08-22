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
      <div className="space-y-5">
         <Button
            className="flex gap-2 justify-center items-center py-7 px-10 w-full text-red-500 border-red-500 font-main"
            icon={<FcGoogle size={23} />}
            loading={isLoadingGoogle}
            onClick={() => {
               setIsLoadingGoogle(true);
               handleLoginGoogle();
            }}
         >
            Sign in with Google
         </Button>
         <Button
            className="flex gap-2 justify-center items-center py-7 px-10 w-full text-blue-500 border-blue-500 font-main"
            icon={<SiFacebook size={22} />}
            loading={isLoadingFaceBook}
            onClick={() => {
               setIsLoadingFaceBook(true);
               handleLoginFaceBook();
            }}
         >
            Sign in with Facebook
         </Button>
      </div>
   );
};

export default ButtonSignInGoogle;
