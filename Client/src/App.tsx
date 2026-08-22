import Router from './router/Router';
import { AuthProvider } from './contexts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { AxiosError } from 'axios';
import { RouterProvider } from 'react-router-dom';

const App: React.FC = () => {
   const queryClient = new QueryClient({
      defaultOptions: {
         queries: {
            // 30s: quay lai trang la du lieu tu lam moi (Infinity truoc day
            // khien moi trang hien cache cu vinh vien, khong bao gio refetch)
            staleTime: 30_000,
            retry: (failureCount, error: AxiosError) => {
               if (
                  error?.response?.status === 400 ||
                  error?.response?.status === 401
               ) {
                  return false;
               }
               return failureCount <= 1;
            },
         },
      },
   });

   const router = Router();

   return (
      <QueryClientProvider client={queryClient}>
         <AuthProvider>
            <RouterProvider router={router} />
         </AuthProvider>
         <ReactQueryDevtools />
      </QueryClientProvider>
   );
};

export default App;
