import { AuthContext, AuthContextType } from '@/contexts';
import { useContext } from 'react';

export default function useAuth(): AuthContextType {
   const context = useContext(AuthContext);

   if (!context) {
      throw new Error('Auth context must be provided');
   }

   return context;
}
