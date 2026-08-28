'use client';

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'CHAT_NOTIFICATIONS';

/**
 * Browser (Web Notifications API) alerts for the chat. Opt-in: the toggle in the chat
 * header asks for permission; the choice is remembered per browser in localStorage.
 * `notify()` is a no-op unless enabled + granted, and skips while the tab is focused
 * on that very room (the caller passes `active`).
 */
export const useChatNotifications = () => {
   const supported = typeof window !== 'undefined' && 'Notification' in window;
   const [permission, setPermission] = useState<NotificationPermission>(() => (supported ? Notification.permission : 'denied'));
   const [wanted, setWanted] = useState<boolean>(() => {
      try {
         return localStorage.getItem(STORAGE_KEY) === 'on';
      } catch {
         return false;
      }
   });

   const enabled = supported && wanted && permission === 'granted';

   const toggle = useCallback(async () => {
      if (!supported) return;
      if (enabled) {
         setWanted(false);
         try {
            localStorage.setItem(STORAGE_KEY, 'off');
         } catch {
            /* private mode */
         }
         return;
      }
      const result = permission === 'granted' ? 'granted' : await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
         setWanted(true);
         try {
            localStorage.setItem(STORAGE_KEY, 'on');
         } catch {
            /* private mode */
         }
         new Notification('NestStay Chat', { body: 'Browser notifications are on 🔔', icon: '/logo.png', silent: true });
      }
   }, [supported, enabled, permission]);

   return { supported, permission, enabled, toggle };
};

/** Fire a notification if the user opted in; clicking it focuses the tab and opens the room. */
export const showChatNotification = (options: { title: string; body: string; icon?: string | null; roomId: string; onOpen: (roomId: string) => void }) => {
   if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
   try {
      if (localStorage.getItem(STORAGE_KEY) !== 'on') return;
   } catch {
      return;
   }
   const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/logo.png',
      tag: `chat-${options.roomId}`,
   });
   notification.onclick = () => {
      window.focus();
      options.onOpen(options.roomId);
      notification.close();
   };
};
