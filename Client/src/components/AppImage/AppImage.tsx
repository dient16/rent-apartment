'use client';

import React, { useState } from 'react';
import clsx from 'clsx';
import { FiImage } from 'react-icons/fi';

interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
   /** Extra classes for the wrapper (sizing/rounding usually goes here). */
   wrapperClassName?: string;
}

/**
 * Loading shimmer + fade-in is disabled for now: on reload, images inside
 * carousels could stay hidden behind the shimmer. Flip this to re-enable it.
 */
const SHOW_LOADING_STATE = false;

/**
 * Content image with native lazy-loading and a neutral fallback when the file
 * is missing. Size it via `wrapperClassName` (or className); the img always
 * covers the box.
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

   const visible = !SHOW_LOADING_STATE || loaded;

   return (
      <span
         className={clsx(
            'block overflow-hidden relative bg-gray-100',
            wrapperClassName,
            className,
         )}
      >
         {SHOW_LOADING_STATE && !loaded && !failed && (
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
                  'object-cover absolute inset-0 w-full h-full',
                  SHOW_LOADING_STATE && 'transition-opacity duration-300',
                  visible ? 'opacity-100' : 'opacity-0',
               )}
               {...rest}
            />
         )}
      </span>
   );
};

export default AppImage;
