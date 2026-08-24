import { useEffect } from 'react';

/**
 * antd's `Spin fullscreen` does not lock the body the way Modal/Drawer do, so the page
 * scrolls behind the spinner. The scrollbar width is re-added as padding to avoid a shift.
 *
 * Locks are ref-counted globally: several components may lock at the same time
 * (auth loader + form loader), and the body is only restored when the LAST one
 * releases — a naive save/restore would re-apply a stale `overflow: hidden`.
 */
let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

const acquire = () => {
   if (lockCount === 0) {
      const { body } = document;
      savedOverflow = body.style.overflow;
      savedPaddingRight = body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
         const current = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
         body.style.paddingRight = `${current + scrollbarWidth}px`;
      }
   }
   lockCount += 1;
};

const release = () => {
   lockCount = Math.max(0, lockCount - 1);
   if (lockCount === 0) {
      const { body } = document;
      body.style.overflow = savedOverflow;
      body.style.paddingRight = savedPaddingRight;
   }
};

const useLockBodyScroll = (locked: boolean) => {
   useEffect(() => {
      if (!locked) return;
      acquire();
      return release;
   }, [locked]);
};

export default useLockBodyScroll;
