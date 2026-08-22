import React, {
   createContext,
   Dispatch,
   FC,
   useEffect,
   useLayoutEffect,
   useReducer,
   useState,
} from 'react';
import { AuthActionType } from './types';
import { initialize, reducer, signOut } from './reduces';
import { apiGetCurrentUser } from '@/apis';
import { AUTH_SESSION_EXPIRED_EVENT } from '@/apis/axiosConfig';
import { useQuery } from '@tanstack/react-query';
import { message, Spin } from 'antd';

interface AuthProviderProps {
   children: React.ReactNode;
}

export interface PayloadAction<T> {
   type: AuthActionType;
   payload?: T;
   dispatch?: Dispatch<PayloadAction<AuthState>>;
}

export interface AuthContextType extends AuthState {
   dispatch: Dispatch<PayloadAction<AuthState>>;
   authModal: { isOpen: boolean; activeTab: string };
   setAuthModal: Dispatch<
      React.SetStateAction<{ isOpen: boolean; activeTab: string }>
   >;
}

const initialState: AuthState = {
   isAuthenticated: false,
   accessToken: null,
   user: null,
};

export const AuthContext = createContext<AuthContextType>({
   ...initialState,
   dispatch: () => null,
   authModal: { isOpen: false, activeTab: 'signin' },
   setAuthModal: () => {},
});

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
   const [state, dispatch] = useReducer(reducer, initialState);
   const [authModal, setAuthModal] = useState<{
      isOpen: boolean;
      activeTab: string;
   }>({
      isOpen: false,
      activeTab: 'signin',
   });

   const { data, isError, isLoading } = useQuery({
      queryKey: ['currentUser'],
      queryFn: apiGetCurrentUser,
      enabled: !!localStorage.getItem('ACCESS_TOKEN'),
   });
   // axiosConfig lo viec refresh access token (single-flight); khi refresh
   // that bai no phat su kien nay de dang xuat va bao nguoi dung.
   useEffect(() => {
      const onSessionExpired = () => {
         dispatch(signOut());
         message.error('Session expired, please login again!');
      };

      window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
      return () => {
         window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, onSessionExpired);
      };
   }, [dispatch]);

   useLayoutEffect(() => {
      if (!data && !data?.success && !isLoading) {
         dispatch(
            initialize({
               isAuthenticated: false,
               accessToken: null,
               user: null,
            }),
         );
      } else if (data && !isError && !!localStorage.getItem('ACCESS_TOKEN')) {
         const token = JSON.parse(
            localStorage.getItem('ACCESS_TOKEN') as string,
         );
         dispatch(
            initialize({
               isAuthenticated: true,
               accessToken: token,
               user: data?.data,
            }),
         );
      }
   }, [data, isError, isLoading, state.accessToken]);

   return (
      <AuthContext.Provider
         value={{ ...state, dispatch, authModal, setAuthModal }}
      >
         <Spin spinning={isLoading} fullscreen={isLoading} size="large">
            {children}
         </Spin>
      </AuthContext.Provider>
   );
};
