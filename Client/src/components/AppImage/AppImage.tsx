'use client';

import React, { useCallback, useState } from 'react';
import clsx from 'clsx';
import { FiImage } from 'react-icons/fi';

interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
   /** Extra classes for the wrapper (sizing/rounding usually goes here). */
   wrapperClassName?: string;
}

/**
 * Content image with a loading shimmer, native lazy-loading, a fade-in on load
 * and a neutral fallback when the file is missing.
 * Size it via `wrapperClassName` (or className); the img always covers the box.
 */
const AppImage: React.FC<AppImageProps> = ({
   wrapperClassName,
   className,
   alt = '',
   loading = 'lazy',
   src,
   ...rest
}) => {
   const [loaded, setLoaded] = useState(false);
   const [failed, setFailed] = useState(false);

   // New src: start over so the shimmer shows again instead of the stale image.
   const [prevSrc, setPrevSrc] = useState(src);
   if (prevSrc !== src) {
      setPrevSrc(src);
      setLoaded(false);
      setFailed(false);
   }

   // The image can finish loading before React hydrates and attaches `onLoad`
   // (SSR + browser cache on reload), so the `load` event is lost and the img
   // would stay at opacity-0 forever. Read the element's own state when React
   // attaches the ref instead.
   const checkAlreadyComplete = useCallback((img: HTMLImageElement | null) => {
      if (!img || !img.complete) return;
      if (img.naturalWidth > 0) setLoaded(true);
      else setFailed(true);
   }, []);

   return (
      <span
         className={clsx(
            'block overflow-hidden relative bg-gray-100',
            wrapperClassName,
            className,
         )}
      >
         {/* Shimmer while the bytes arrive */}
         {!loaded && !failed && (
            <span className="absolute inset-0 img-shimmer" aria-hidden />
         )}

         {failed ? (
            <span className="flex absolute inset-0 justify-center items-center text-gray-300">
               <FiImage size={28} />
            </span>
         ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
               // Remount per src so the ref callback re-checks the new image.
               key={typeof src === 'string' ? src : undefined}
               ref={checkAlreadyComplete}
               src={src}
               alt={alt}
               loading={loading}
               decoding="async"
               onLoad={() => setLoaded(true)}
               onError={() => setFailed(true)}
               className={clsx(
                  'object-cover absolute inset-0 w-full h-full transition-opacity duration-300',
                  loaded ? 'opacity-100' : 'opacity-0',
               )}
               {...rest}
            />
         )}
      </span>
   );
};

export default AppImage;
