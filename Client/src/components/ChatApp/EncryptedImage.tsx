'use client';

import React, { useEffect, useState } from 'react';
import { Image } from 'antd';
import { FiAlertCircle } from 'react-icons/fi';
import type { RoomKeys } from './useRoomKeys';

interface EncryptedImageProps {
   keys: RoomKeys;
   roomId: string;
   url: string;
   keyId: string;
   iv: string;
   contentType?: string;
   className?: string;
   style?: React.CSSProperties;
   rootClassName?: string;
}

/** blob: URLs survive re-renders and room switches, so decrypt each photo only once */
const blobCache = new Map<string, string>();

/** Downloads the encrypted bytes behind a signed URL and decrypts them with the room key. */
const EncryptedImage: React.FC<EncryptedImageProps> = ({ keys, roomId, url, keyId, iv, contentType = 'image/jpeg', className, style, rootClassName }) => {
   const cacheKey = url.split('?')[0];
   const [src, setSrc] = useState<string | null>(blobCache.get(cacheKey) ?? null);
   const [failed, setFailed] = useState(false);

   useEffect(() => {
      if (src) return;
      let cancelled = false;
      (async () => {
         const res = await fetch(url);
         if (!res.ok) throw new Error('download failed');
         const plain = await keys.decryptFile(roomId, keyId, iv, await res.arrayBuffer());
         if (!plain) throw new Error('decrypt failed');
         const objectUrl = URL.createObjectURL(new Blob([plain], { type: contentType }));
         blobCache.set(cacheKey, objectUrl);
         if (!cancelled) setSrc(objectUrl);
      })().catch(() => {
         if (!cancelled) setFailed(true);
      });
      return () => {
         cancelled = true;
      };
   }, [url, keyId, iv, roomId, contentType, keys, src, cacheKey]);

   if (failed) {
      return (
         <div className="flex flex-col gap-1 justify-center items-center w-[200px] h-[140px] text-xs text-gray-400 bg-gray-100 rounded-2xl">
            <FiAlertCircle size={18} /> Photo unavailable
         </div>
      );
   }
   if (!src) {
      return (
         <div className="flex justify-center items-center w-[200px] h-[140px] bg-gray-200/70 rounded-2xl animate-pulse">
            <span className="w-7 h-7 rounded-full border-[3px] border-blue-500 border-t-transparent animate-spin" />
         </div>
      );
   }
   return <Image src={src} alt="photo" className={className} style={style} rootClassName={rootClassName} />;
};

export default EncryptedImage;
