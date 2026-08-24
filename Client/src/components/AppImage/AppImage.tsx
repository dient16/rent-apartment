'use client';

import React, { useState } from 'react';
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
