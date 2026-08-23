'use client';

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/apis/axiosConfig';

/**
 * App-wide socket.io singleton (presence + typing + realtime messages).
 * Connected/disconnected by AuthContext following the login state.
 */
let socket: Socket | null = null;

export const getSocket = (): Socket | null => socket;

export const connectSocket = (): Socket | null => {
   const token = getAccessToken();
   if (!token) return null;

   if (socket) {
      socket.auth = { token };
      if (!socket.connected) socket.connect();
      return socket;
   }

   socket = io(process.env.NEXT_PUBLIC_SERVER_URL as string, {
      auth: { token },
      withCredentials: true,
   });

   // Access token rotates via refresh — pick up the latest one on reconnects
   socket.io.on('reconnect_attempt', () => {
      const latest = getAccessToken();
      if (socket && latest) socket.auth = { token: latest };
   });

   return socket;
};

export const disconnectSocket = () => {
   socket?.disconnect();
   socket = null;
};
