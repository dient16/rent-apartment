import { useEffect } from 'react';

/**
 * Freezes page scrolling while `locked` is true.
 *
 * antd's `Spin fullscreen` paints an overlay but — unlike Modal/Drawer — does not
 * lock the body, so the page still scrolls behind the spinner. Hiding the scrollbar
 * would shift the layout sideways, so its width is added back as padding.
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
