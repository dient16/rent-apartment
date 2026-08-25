import {
   FiCalendar,
   FiClipboard,
   FiCompass,
   FiGrid,
   FiHome,
   FiInfo,
   FiMail,
   FiMessageCircle,
   FiKey,
} from 'react-icons/fi';

export const path: { [key: string]: string } = {
   ROOT: '/',
   HOME: '',
   ALL: '/*',
   LISTING: 'listing',
   ABOUT: 'about',
   APARTMENT_DETAIL: 'apartment/:apartmentId',
   FAVORITES: 'favorites',
   CONTACT: 'contact',
   BOOKING_CONFIRM: 'booking-confirm',
   BOOKING_COMPLETION: 'booking-completion/:bookingId',
   ACCOUNT_SETTINGS: 'account-settings',
   PERSONAL_INFORMATION: 'personal-information',
   PAYMENT_INFORMATION: 'payment',
   NOTIFICATION_SETTINGS: 'notification',
   SETTINGS: 'settings',
   SET_PASSWORD: 'set-password/:token',
   FORGOT_PASSWORD: 'forgot-password',
   RESET_PASSWORD: 'reset-password/:token',
   SIGNIN_GOOGLE_SUCCESS: 'signin-success/:userId',
   MY_BOOKING: 'my-booking',
   NOTIFICATIONS: 'notifications',
   MESSAGES: 'messages',
   BOOKING_DETAIL: 'my-booking/:bookingId',

   // path to admin
   ADMIN_DASHBOARD: 'admin/dashboard',
   USER_MANAGEMENT: 'admin/user-management',
   REPORTS: 'admin/reports',

   // path to host
   HOST_ROOT: '/host/',
   HOST_DASHBOARD: 'dashboard',
   HOST_WELCOME: 'welcome',
   HOST_CALENDAR: 'calendar',
   CREATE_APARTMENT: 'create-apartment',
   HOST_LISTINGS: 'listings',
   HOST_BOOKINGS: 'bookings',
   HOST_PROFILE: 'profile',
   RENTAL_LIST: 'rental-list',
   ROOM_DETAILS: 'room-details/:id',
   APARTMENT_ROOMS: 'apartment-rooms/:apartmentId',
   HOST_MESSAGES: 'messages',
};

export const navigates: {
   title: string;
   path: string;
   icon: React.ReactNode;
}[] = [
   { title: 'Home', path: path.HOME, icon: <FiHome /> },
   { title: 'Explore', path: path.LISTING, icon: <FiCompass /> },
   { title: 'About', path: path.ABOUT, icon: <FiInfo /> },
   { title: 'Contact', path: path.CONTACT, icon: <FiMail /> },
];

export const navigateHosts: {
   title: string;
   path: string;
   icon: React.ReactNode;
}[] = [
   {
      title: 'Dashboard',
      path: `${path.HOST_ROOT}${path.HOST_DASHBOARD}`,
      icon: <FiGrid />,
   },
   { title: 'Bookings', path: `${path.HOST_ROOT}${path.HOST_BOOKINGS}`, icon: <FiClipboard /> },
   { title: 'Calendar', path: `${path.HOST_ROOT}${path.HOST_CALENDAR}`, icon: <FiCalendar /> },
   { title: 'Rental Listings', path: `${path.HOST_ROOT}${path.HOST_LISTINGS}`, icon: <FiKey /> },
   { title: 'Messages', path: `${path.HOST_ROOT}${path.HOST_MESSAGES}`, icon: <FiMessageCircle /> },
];
