import { useEffect, useState, type RefObject } from 'react';

interface Options {
   /** Height of one data row in px. */
   rowHeight: number;
   /** Fixed space inside the container that is not rows (table header, pagination bar…). */
   reserved?: number;
   min?: number;
   max?: number;
}

/**
 * How many rows fit between the top of `ref` and the bottom of the viewport,
 * so a paginated table fills the screen without forcing the page to scroll.
 * Re-measures on resize (debounced); `null` until the first measurement.
 */
const useRowsPerPage = (
   ref: RefObject<HTMLElement | null>,
   { rowHeight, reserved = 0, min = 5, max = 20 }: Options,
): number | null => {
   const [rows, setRows] = useState<number | null>(null);

   useEffect(() => {
      let timer: ReturnType<typeof setTimeout> | undefined;

      const measure = () => {
         const element = ref.current;
         if (!element) return;
         const top = element.getBoundingClientRect().top + window.scrollY;
         const available = window.innerHeight - top - reserved;
         const fit = Math.floor(available / rowHeight);
         setRows(Math.min(max, Math.max(min, fit)));
      };

      const onResize = () => {
         clearTimeout(timer);
         timer = setTimeout(measure, 150);
      };

      measure();
      window.addEventListener('resize', onResize);
      return () => {
         clearTimeout(timer);
         window.removeEventListener('resize', onResize);
      };
   }, [ref, rowHeight, reserved, min, max]);

   return rows;
};

export default useRowsPerPage;
