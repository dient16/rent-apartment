import { createBrowserRouter, RouteObject } from 'react-router-dom';
import {
    ApartmentDetail,
    Listing,
    Home,
    MainLayout,
    BookingConfirm,
    BookingCompletion,
    SetPassword,
    LoginSuccess,
} from '@/pages/Public';
import { path } from '@/utils/constant';
import { CreateApartment, ManageAccount, MyFavorites, ManagerApartment, PersonalInformation } from '@/pages/User';

const Router = () => {
    const routes: RouteObject[] = [
        {
            path: path.HOME,
            element: <Home />,
        },
        {
            path: path.CREATE_APARTMENT,
            element: <CreateApartment />,
        },
        {
            path: path.LISTING,
            element: <Listing />,
        },
        {
            path: path.FAVORITES,
            element: <MyFavorites />,
        },
        {
            path: path.APARTMENT_DETAIL,
            element: <ApartmentDetail />,
        },
        {
            path: path.BOOKING_CONFIRM,
            element: <BookingConfirm />,
        },
        {
            path: path.BOOKING_COMPLETION,
            element: <BookingCompletion />,
        },
        {
            path: path.SET_PASSWORD,
            element: <SetPassword />,
        },
        {
            path: path.SIGNIN_GOOGLE_SUCCESS,
            element: <LoginSuccess />,
        },

        {
            path: path.ACCOUNT_SETTINGS,
            element: <ManageAccount />,
            children: [
                {
                    path: path.PERSONAL_INFORMATION,
                    element: <PersonalInformation />,
                },
                {
                    path: path.MANAGE_APARTMENT,
                    element: <ManagerApartment />,
                },
            ],
        },
        {
            path: path.ALL,
            element: <h1>404</h1>,
        },
    ];

    const router = createBrowserRouter([
        {
            path: path.ROOT,
            element: <MainLayout />,
            children: routes,
        },
        {
            path: path.ALL,
            element: <h1>404</h1>,
        },
    ]);

    return router;
};

export default Router;
