'use client';

import { useCallback, useRef } from 'react';
import { apiChatRoomKey } from '@/apis/chat.api';
import {
   type CipherPayload,
   cryptoSupported,
   decryptBytes,
   decryptString,
   encryptBytes,
   encryptString,
   importRoomKey,
} from '@/lib/chatCrypto';

interface RoomKey {
   keyId: string;
   key: CryptoKey;
}

/**
 * Room keys, fetched from the server once per room and kept in memory for the session.
 * Every member of a room gets the same key, so any device can read the history right away -
 * the encryption exists so request bodies are ciphertext, not to lock anyone out.
 */
export const useRoomKeys = () => {
   const supported = cryptoSupported();
   const keys = useRef(new Map<string, RoomKey>());
   const inFlight = useRef(new Map<string, Promise<RoomKey | null>>());

   const getKey = useCallback(
      async (roomId: string): Promise<RoomKey | null> => {
         if (!supported || !roomId) return null;
         const cached = keys.current.get(roomId);
         if (cached) return cached;
         const running = inFlight.current.get(roomId);
         if (running) return running;

         const task = (async () => {
            const res = await apiChatRoomKey(roomId);
            if (!res.success || !res.data?.key) return null;
            const entry: RoomKey = { keyId: res.data.keyId, key: await importRoomKey(res.data.key) };
            keys.current.set(roomId, entry);
            return entry;
         })()
            .catch(() => null)
            .finally(() => inFlight.current.delete(roomId));
         inFlight.current.set(roomId, task);
         return task;
      },
      [supported],
   );

   const encryptFor = useCallback(
      async (roomId: string, plain: string): Promise<CipherPayload | null> => {
         const entry = await getKey(roomId);
         return entry ? encryptString(entry.key, entry.keyId, plain) : null;
      },
      [getKey],
   );

   const encryptFile = useCallback(
      async (roomId: string, file: File) => {
         const entry = await getKey(roomId);
         if (!entry) return null;
         const { iv, data } = await encryptBytes(entry.key, await file.arrayBuffer());
         return { keyId: entry.keyId, iv, blob: new Blob([data], { type: 'application/octet-stream' }), contentType: file.type };
      },
      [getKey],
   );

   const decryptWith = useCallback(
      async (roomId: string, payload: CipherPayload): Promise<string | null> => {
         const entry = await getKey(roomId);
         return entry && entry.keyId === payload.keyId ? decryptString(entry.key, payload) : null;
      },
      [getKey],
   );

   const decryptFile = useCallback(
      async (roomId: string, keyId: string, iv: string, data: ArrayBuffer) => {
         const entry = await getKey(roomId);
         return entry && entry.keyId === keyId ? decryptBytes(entry.key, iv, data) : null;
      },
      [getKey],
   );

   return { supported, getKey, encryptFor, encryptFile, decryptWith, decryptFile };
};

export type RoomKeys = ReturnType<typeof useRoomKeys>;
