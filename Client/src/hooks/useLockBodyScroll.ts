import { useEffect } from 'react';

/**
 * antd's `Spin fullscreen` does not lock the body the way Modal/Drawer do, so the page
 * scrolls behind the spinner. The scrollbar width is re-added as padding to avoid a shift.
 */
const useLockBodyScroll = (locked: boolean) => {
   useEffect(() => {
      if (!locked) return;

      const { body } = document;
      const previousOverflow = body.style.overflow;
      const previousPaddingRight = body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
         const current = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
         body.style.paddingRight = `${current + scrollbarWidth}px`;
      }

      return () => {
         body.style.overflow = previousOverflow;
         body.style.paddingRight = previousPaddingRight;
      };
   }, [locked]);
};

export default useLockBodyScroll;
