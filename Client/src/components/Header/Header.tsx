import React, { useState } from 'react';
import logo from '@/assets/logo.png';
import { navigateHosts, navigates, path } from '@/utils/constant';
import { MenuAccount, NotificationBell, SignIn, SignUp, UserAvatar } from '@/components';
import { NavLink, useNavigate } from '@/lib/router-compat';
import {
   Flex,
   Button,
   Modal,
   Tabs,
   Drawer,
   Image,
   Popover,
   Avatar,
   Tooltip,
} from 'antd';
import type { TabsProps } from 'antd';
import { FiHeart } from 'react-icons/fi';
import { TbHomePlus } from 'react-icons/tb';
import icons from '@/utils/icons';
import { useAuth } from '@/hooks';
import clsx from 'clsx';
interface Props {
   isHost?: boolean;
}
const Header: React.FC<Props> = ({ isHost = false }) => {
   const { SlClose, AiOutlineUsergroupAdd, PiSignInBold, CgMenuLeft, HiMenu } =
      icons;
   const navigate = useNavigate();
   const [openNavigate, setOpenNavigate] = useState(false);
   const [menuOpen, setMenuOpen] = useState(false);
   const {
      isAuthenticated,
      user: currentUser,
      authModal,
      setAuthModal,
   } = useAuth();

   const goToHost = () => {
      if (isAuthenticated) {
         navigate(`${path.HOST_ROOT}${path.HOST_DASHBOARD}`);
      } else {
         setAuthModal({ isOpen: true, activeTab: 'signin' });
      }
   };

   const tabItemsModal: TabsProps['items'] = [
      {
         key: 'signin',
         label: (
            <div
               className="flex justify-center items-center text-xl font-main w-[120px] sm:w-[300px] md:w-[350px] lg:w-[390px]"
               onClick={() =>
                  setAuthModal({ isOpen: true, activeTab: 'signin' })
               }
            >
               Sign In
            </div>
         ),
         children: <SignIn setModalOpen={setAuthModal} />,
      },
      {
         key: 'signup',
         label: (
            <div
               className="flex justify-center items-center text-xl font-main w-[120px] sm:w-[300px] md:w-[350px] lg:w-[390px]"
               onClick={() =>
                  setAuthModal({ isOpen: true, activeTab: 'signup' })
               }
            >
               Sign Up
            </div>
         ),
         children: <SignUp />,
      },
   ];
   return (
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
         <div className="flex justify-between items-center px-3 mx-auto w-full h-[60px] select-none md:px-10 lg:h-[80px] max-w-main">
            <Flex align="center" gap={12}>
               <div
                  className="p-1 rounded-md transition-colors cursor-pointer lg:hidden hover:bg-gray-100"
                  onClick={() => setOpenNavigate(true)}
               >
                  <CgMenuLeft size={26} />
               </div>
               <Image
                  src={logo}
                  className="cursor-pointer w-[110px] md:w-[150px]"
                  preview={false}
                  // Logo respects the current mode: in host mode it links to the host dashboard
                  onClick={() =>
                     navigate(
                        isHost
                           ? `${path.HOST_ROOT}${path.HOST_DASHBOARD}`
                           : `/${path.HOME}`,
                     )
                  }
               />
            </Flex>

            {/* Center nav: desktop only */}
            <nav className="hidden absolute left-1/2 -translate-x-1/2 lg:block">
               <Flex gap={30} align="center">
                  {(isHost ? navigateHosts : navigates).map(
                     (navigateItem, index) => (
                        <NavLink
                           key={index}
                           to={navigateItem.path}
                           className={({ isActive }) =>
                              clsx(
                                 'relative font-main text-base font-medium transition duration-300 ease-in-out flex items-center gap-2 py-1',
                                 isActive
                                    ? 'navLink-active text-blue-600'
                                    : 'text-gray-700 hover:text-blue-600',
                                 'navLink',
                              )
                           }
                        >
                           <span>{navigateItem.title}</span>
                        </NavLink>
                     ),
                  )}
               </Flex>
            </nav>

            <Flex gap={8} align="center">
               {!isHost && (
                  <Button
                     type="text"
                     onClick={goToHost}
                     className="hidden items-center gap-1.5 px-4 h-10 rounded-full font-main text-base font-medium text-gray-700 lg:flex hover:text-blue-600 hover:bg-blue-50"
                     icon={<TbHomePlus size={18} />}
                  >
                     Become a Host
                  </Button>
               )}

               {isAuthenticated && <NotificationBell />}

               {isAuthenticated && !isHost && (
                  <Tooltip title="My favorites">
                     <button
                        aria-label="My favorites"
                        onClick={() => navigate(`/${path.FAVORITES}`)}
                        className="hidden justify-center items-center w-10 h-10 rounded-full border-none bg-transparent transition-colors cursor-pointer md:flex hover:bg-rose-50 hover:text-rose-500 text-gray-600"
                     >
                        <FiHeart size={19} />
                     </button>
                  </Tooltip>
               )}

               {!isAuthenticated && !currentUser ? (
                  <Flex gap={10} align="center">
                     <Button
                        className="hidden px-6 h-10 rounded-full border-gray-300 lg:block font-main hover:border-blue-500 hover:text-blue-600"
                        onClick={() =>
                           setAuthModal({ isOpen: true, activeTab: 'signup' })
                        }
                     >
                        Sign up
                     </Button>
                     <Button
                        type="primary"
                        className="hidden px-6 h-10 text-white bg-blue-500 rounded-full shadow-none lg:block font-main hover:bg-blue-600"
                        onClick={() =>
                           setAuthModal({ isOpen: true, activeTab: 'signin' })
                        }
                     >
                        Sign in
                     </Button>
                  </Flex>
               ) : (
                  <Popover
                     placement="bottomRight"
                     content={
                        <MenuAccount
                           isHost={isHost}
                           onClose={() => setMenuOpen(false)}
                        />
                     }
                     arrow={false}
                     trigger="click"
                     open={menuOpen}
                     onOpenChange={setMenuOpen}
                  >
                     <span className="flex gap-2 justify-center items-center py-1.5 pr-1.5 pl-3 rounded-full border border-gray-300 transition-shadow cursor-pointer hover:shadow-card-lg">
                        <HiMenu size={16} className="text-gray-600" />
                        <UserAvatar
                           size={30}
                           src={currentUser?.avatar}
                           name={currentUser?.firstname}
                        />
                     </span>
                  </Popover>
               )}
            </Flex>
         </div>

         <Modal
            centered
            open={authModal.isOpen}
            onOk={() => setAuthModal({ isOpen: false, activeTab: 'signin' })}
            onCancel={() =>
               setAuthModal({ isOpen: false, activeTab: 'signin' })
            }
            width={840}
            footer={null}
            closeIcon={<SlClose size={25} />}
            styles={{
               mask: {
                  backdropFilter: 'blur(10px)',
               },
            }}
         >
            <Tabs
               centered={true}
               activeKey={authModal.activeTab}
               items={tabItemsModal}
               tabBarGutter={0}
            />
         </Modal>
         <Drawer
            title={
               <div
                  className="flex justify-end items-center w-full cursor-pointer"
                  onClick={() => setOpenNavigate(false)}
               >
                  <SlClose size={28} />
               </div>
            }
            placement="left"
            width="100%"
            onClose={() => setOpenNavigate(false)}
            open={openNavigate}
            closeIcon={null}
         >
            <div
               className="flex flex-col gap-5 select-none"
               onClick={() => setOpenNavigate(false)}
            >
               <Flex gap={20} vertical>
                  {(isHost ? navigateHosts : navigates).map(
                     (navigateItem, index) => (
                        <NavLink
                           className="flex gap-5 items-center font-medium font-main text-[22px]"
                           key={index}
                           to={navigateItem.path}
                        >
                           <span>{navigateItem.icon}</span>
                           <span>{navigateItem.title}</span>
                        </NavLink>
                     ),
                  )}
                  {!isHost && (
                     <span
                        className="flex gap-5 items-center font-medium cursor-pointer font-main text-[22px]"
                        onClick={goToHost}
                     >
                        <TbHomePlus />
                        <span>Become a Host</span>
                     </span>
                  )}
               </Flex>
               {!isAuthenticated && (
                  <Flex gap={20} vertical>
                     <span
                        className="flex gap-5 items-center font-medium cursor-pointer font-main text-[22px]"
                        onClick={() =>
                           setAuthModal({ isOpen: true, activeTab: 'signin' })
                        }
                     >
                        <PiSignInBold />
                        <span>Sign in</span>
                     </span>
                     <span
                        className="flex gap-5 items-center font-medium cursor-pointer font-main text-[22px]"
                        onClick={() =>
                           setAuthModal({ isOpen: true, activeTab: 'signup' })
                        }
                     >
                        <span>
                           <AiOutlineUsergroupAdd />
                        </span>
                        <span> Sign up</span>
                     </span>
                  </Flex>
               )}
            </div>
         </Drawer>
      </header>
   );
};

export default Header;
