import React, { useState } from 'react';
import logo from '@/assets/logo-icon.png';
import { navigateHosts, navigates, path } from '@/utils/constant';
import { MenuAccount, NotificationBell, UserAvatar } from '@/components';
import AuthModal from '@/components/Auth/AuthModal';
import { NavLink, useNavigate } from '@/lib/router-compat';
import { useIsHydrated } from '@/hooks';
import { Flex, Button, Drawer, Image, Popover, Tooltip } from 'antd';
import { FiHeart, FiLogIn, FiUserPlus, FiX } from 'react-icons/fi';
import { TbHomePlus } from 'react-icons/tb';
import icons from '@/utils/icons';
import { useAuth } from '@/hooks';
import clsx from 'clsx';
interface Props {
   isHost?: boolean;
}
const Header: React.FC<Props> = ({ isHost = false }) => {
   const { CgMenuLeft, HiMenu } = icons;
   const navigate = useNavigate();
   // SSR can't know the login state - render a neutral placeholder until the
   // client restores the session, so signed-in users never see Sign in flash.
   const hydrated = useIsHydrated();
   const [openNavigate, setOpenNavigate] = useState(false);
   const [menuOpen, setMenuOpen] = useState(false);
   const [accountOpen, setAccountOpen] = useState(false);
   const {
      isAuthenticated,
      user: currentUser,
      setAuthModal,
   } = useAuth();

   const goToHost = () => {
      if (isAuthenticated) {
         navigate(`${path.HOST_ROOT}${path.HOST_DASHBOARD}`);
      } else {
         setAuthModal({ isOpen: true, activeTab: 'signin' });
      }
   };

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
               {/* Logo respects the current mode: in host mode it links to the host dashboard */}
               <div
                  className="flex gap-2 items-center cursor-pointer"
                  onClick={() =>
                     navigate(
                        isHost
                           ? `${path.HOST_ROOT}${path.HOST_DASHBOARD}`
                           : `/${path.HOME}`,
                     )
                  }
               >
                  <Image
                     src={logo.src}
                     alt="Find House"
                     className="w-[36px] md:w-[44px]"
                     preview={false}
                  />
                  <span className="font-main text-lg md:text-xl font-bold tracking-tight text-gray-900 whitespace-nowrap">
                     Find House
                  </span>
               </div>
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
                                 'relative font-main text-[17px] font-medium transition duration-300 ease-in-out flex items-center gap-2 py-1',
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

               {!hydrated ? (
                  <span className="hidden lg:block w-[220px] h-10 bg-gray-100 rounded-full animate-pulse" />
               ) : !isAuthenticated && !currentUser ? (
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
                  <>
                     {/* Desktop: popover under the avatar pill */}
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
                        <span className="hidden gap-2 justify-center items-center py-1.5 pr-1.5 pl-3 rounded-full border border-gray-300 transition-shadow cursor-pointer lg:flex hover:shadow-card-lg">
                           <HiMenu size={16} className="text-gray-600" />
                           <UserAvatar
                              size={30}
                              src={currentUser?.avatar}
                              name={currentUser?.firstname}
                           />
                        </span>
                     </Popover>

                     {/* Mobile/tablet: the same pill opens a right-hand sidebar */}
                     <button
                        type="button"
                        aria-label="Account menu"
                        onClick={() => setAccountOpen(true)}
                        className="flex gap-2 justify-center items-center py-1.5 pr-1.5 pl-3 bg-transparent rounded-full border border-gray-300 cursor-pointer lg:hidden"
                     >
                        <HiMenu size={16} className="text-gray-600" />
                        <UserAvatar
                           size={30}
                           src={currentUser?.avatar}
                           name={currentUser?.firstname}
                        />
                     </button>
                  </>
               )}
            </Flex>
         </div>

         <AuthModal />

         {/* ===== Mobile account sidebar (right) ===== */}
         <Drawer
            placement="right"
            size={320}
            onClose={() => setAccountOpen(false)}
            open={accountOpen}
            closeIcon={null}
            styles={{ body: { padding: 0 }, header: { display: 'none' } }}
         >
            <div className="flex flex-col h-full select-none font-main">
               <div className="flex justify-between items-center px-5 h-[60px] border-b border-gray-100">
                  <div className="flex gap-3 items-center min-w-0">
                     <UserAvatar
                        size={36}
                        src={currentUser?.avatar}
                        name={currentUser?.firstname}
                     />
                     <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                           {[currentUser?.firstname, currentUser?.lastname]
                              .filter(Boolean)
                              .join(' ') || 'Your account'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                           {currentUser?.email}
                        </p>
                     </div>
                  </div>
                  <button
                     type="button"
                     aria-label="Close menu"
                     onClick={() => setAccountOpen(false)}
                     className="flex flex-shrink-0 justify-center items-center w-9 h-9 text-gray-500 bg-gray-100 rounded-full border-none cursor-pointer hover:bg-gray-200"
                  >
                     <FiX size={20} />
                  </button>
               </div>
               <div className="overflow-y-auto flex-1 px-2 py-2">
                  <MenuAccount
                     variant="drawer"
                     isHost={isHost}
                     onClose={() => setAccountOpen(false)}
                  />
               </div>
            </div>
         </Drawer>

         {/* ===== Mobile navigation drawer ===== */}
         <Drawer
            placement="left"
            size={320}
            onClose={() => setOpenNavigate(false)}
            open={openNavigate}
            closeIcon={null}
            styles={{ body: { padding: 0 }, header: { display: 'none' } }}
         >
            <div className="flex flex-col h-full select-none font-main">
               {/* Brand + close */}
               <div className="flex justify-between items-center px-5 h-[60px] border-b border-gray-100">
                  <div className="flex gap-2 items-center">
                     <Image
                        src={logo.src}
                        alt="Find House"
                        width={28}
                        height={28}
                        preview={false}
                     />
                     <span className="text-base font-bold text-gray-900">
                        Find House
                     </span>
                  </div>
                  <button
                     type="button"
                     aria-label="Close menu"
                     onClick={() => setOpenNavigate(false)}
                     className="flex justify-center items-center w-9 h-9 text-gray-500 bg-gray-100 rounded-full border-none cursor-pointer hover:bg-gray-200"
                  >
                     <FiX size={20} />
                  </button>
               </div>

               {/* Links */}
               <nav
                  className="flex flex-col flex-1 gap-1 px-3 py-4 overflow-y-auto"
                  onClick={() => setOpenNavigate(false)}
               >
                  <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
                     {isHost ? 'Host panel' : 'Menu'}
                  </p>
                  {(isHost ? navigateHosts : navigates).map((navigateItem) => (
                     <NavLink
                        key={navigateItem.title}
                        to={navigateItem.path}
                        end={navigateItem.path === path.HOME}
                        className={({ isActive }) =>
                           clsx(
                              'flex gap-3 items-center px-3 py-2.5 text-[15px] font-medium rounded-xl transition-colors',
                              isActive
                                 ? 'bg-blue-50 text-blue-600'
                                 : 'text-gray-800 hover:bg-gray-100',
                           )
                        }
                     >
                        {({ isActive }) => (
                           <>
                              <span
                                 className={clsx(
                                    'flex justify-center items-center w-9 h-9 text-lg rounded-lg',
                                    isActive
                                       ? 'bg-blue-100 text-blue-600'
                                       : 'bg-gray-100 text-gray-600',
                                 )}
                              >
                                 {navigateItem.icon}
                              </span>
                              <span>{navigateItem.title}</span>
                           </>
                        )}
                     </NavLink>
                  ))}

                  {!isHost && (
                     <button
                        type="button"
                        onClick={goToHost}
                        className="flex gap-3 items-center px-3 py-3 mt-4 text-left bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl border-none shadow-md cursor-pointer shadow-blue-500/20"
                     >
                        <span className="flex flex-shrink-0 justify-center items-center w-9 h-9 text-lg text-white rounded-lg bg-white/20">
                           <TbHomePlus />
                        </span>
                        <span className="flex flex-col">
                           <span className="text-[15px] font-semibold text-white">
                              Become a Host
                           </span>
                           <span className="text-xs text-blue-100">
                              List your place and start earning
                           </span>
                        </span>
                     </button>
                  )}
               </nav>

               {/* Account */}
               <div className="px-4 py-4 border-t border-gray-100">
                  {isAuthenticated ? (
                     <div
                        className="flex gap-3 items-center p-3 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100"
                        onClick={() => {
                           setOpenNavigate(false);
                           navigate(
                              `/${path.ACCOUNT_SETTINGS}/${path.PERSONAL_INFORMATION}`,
                           );
                        }}
                     >
                        <UserAvatar
                           size={40}
                           src={currentUser?.avatar}
                           name={currentUser?.firstname}
                        />
                        <div className="min-w-0">
                           <p className="text-sm font-semibold text-gray-900 truncate">
                              {[currentUser?.firstname, currentUser?.lastname]
                                 .filter(Boolean)
                                 .join(' ') || 'Your account'}
                           </p>
                           <p className="text-xs text-gray-500 truncate">
                              {currentUser?.email}
                           </p>
                        </div>
                     </div>
                  ) : (
                     <div className="grid grid-cols-2 gap-2">
                        <Button
                           type="primary"
                           icon={<FiLogIn />}
                           className="h-11 font-semibold bg-blue-500 rounded-xl"
                           onClick={() => {
                              setOpenNavigate(false);
                              setAuthModal({ isOpen: true, activeTab: 'signin' });
                           }}
                        >
                           Sign in
                        </Button>
                        <Button
                           icon={<FiUserPlus />}
                           className="h-11 font-semibold rounded-xl"
                           onClick={() => {
                              setOpenNavigate(false);
                              setAuthModal({ isOpen: true, activeTab: 'signup' });
                           }}
                        >
                           Sign up
                        </Button>
                     </div>
                  )}
               </div>
            </div>
         </Drawer>
      </header>
   );
};

export default Header;
