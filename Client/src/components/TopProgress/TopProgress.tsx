'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Slim route-change progress bar. The old page stays visible during
 * navigation; this bar is the only "loading" signal between pages.
 */
const TopProgress: React.FC = () => {
   const pathname = usePathname();
   const [visible, setVisible] = useState(false);
   const [progress, setProgress] = useState(0);
   const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
   const firstRender = useRef(true);

   // Start on internal link clicks
   useEffect(() => {
      const handleClick = (event: MouseEvent) => {
         if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
         ) {
            return;
         }
         const anchor = (event.target as HTMLElement).closest('a');
         if (!anchor) return;
         const href = anchor.getAttribute('href');
         if (!href || !href.startsWith('/') || anchor.target === '_blank') return;
         if (href.split('?')[0] === window.location.pathname) return;

         setVisible(true);
         setProgress(15);
         if (timerRef.current) clearInterval(timerRef.current);
         timerRef.current = setInterval(() => {
            setProgress((value) => (value < 85 ? value + Math.random() * 10 : value));
         }, 250);
      };

      document.addEventListener('click', handleClick);
      return () => {
         document.removeEventListener('click', handleClick);
         if (timerRef.current) clearInterval(timerRef.current);
      };
   }, []);

   // Finish when the route actually changed
   useEffect(() => {
      if (firstRender.current) {
         firstRender.current = false;
         return;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      const timeout = setTimeout(() => {
         setVisible(false);
         setProgress(0);
      }, 300);
      return () => clearTimeout(timeout);
   }, [pathname]);

   if (!visible) return null;

   return (
      <div
         className="fixed top-0 left-0 z-[9999] h-[3px] rounded-r-full bg-gradient-to-r from-blue-600 to-sky-400 shadow-[0_0_8px_rgba(37,99,235,0.6)] transition-[width] duration-200 ease-out"
         style={{ width: `${progress}%` }}
      />
   );
};

export default TopProgress;
