'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { AuthProvider } from '@/contexts';

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
   const [queryClient] = React.useState(
      () =>
         new QueryClient({
            defaultOptions: {
               queries: {
                  // 30s: data revalidates on its own when the user returns to a page
                  staleTime: 30_000,
                  retry: (failureCount, error) => {
                     const status = (error as AxiosError)?.response?.status;
                     if (status === 400 || status === 401) return false;
                     return failureCount <= 1;
                  },
               },
            },
         }),
   );

   return (
      <QueryClientProvider client={queryClient}>
         <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
   );
};

export default Providers;
