import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import clsx from 'clsx';

interface PaginationBarProps {
   page: number;
   pageSize: number;
   total: number;
   onChange: (page: number) => void;
   /** Singular noun for the summary text, e.g. "stay" */
   itemLabel?: string;
}

/** Pages to render: 1 … (current-1, current, current+1) … last */
const buildPages = (current: number, last: number): (number | 'gap')[] => {
   if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1);
   const pages = new Set<number>([1, last, current - 1, current, current + 1]);
   if (current <= 3) [2, 3, 4].forEach((page) => pages.add(page));
   if (current >= last - 2) [last - 1, last - 2, last - 3].forEach((page) => pages.add(page));
   const sorted = [...pages].filter((page) => page >= 1 && page <= last).sort((a, b) => a - b);
   const result: (number | 'gap')[] = [];
   sorted.forEach((page, index) => {
      if (index > 0 && page - (sorted[index - 1] as number) > 1) result.push('gap');
      result.push(page);
   });
   return result;
};

const PaginationBar: React.FC<PaginationBarProps> = ({
   page,
   pageSize,
   total,
   onChange,
   itemLabel = 'result',
}) => {
   const last = Math.max(1, Math.ceil(total / pageSize));
   const from = (page - 1) * pageSize + 1;
   const to = Math.min(page * pageSize, total);

   const navButton =
      'flex justify-center items-center gap-1.5 h-10 px-3.5 text-sm font-medium rounded-xl border transition-colors';

   return (
      <div className="flex flex-col gap-4 items-center px-1 py-5 mt-2 border-t border-gray-100 sm:flex-row sm:justify-between">
         <span className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-900">{from}–{to}</span> of{' '}
            <span className="font-semibold text-gray-900">{total}</span> {itemLabel}
            {total > 1 ? 's' : ''}
         </span>

         {last > 1 && (
            <nav className="flex gap-1.5 items-center" aria-label="Pagination">
               <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onChange(page - 1)}
                  className={clsx(
                     navButton,
                     page <= 1
                        ? 'text-gray-300 bg-white border-gray-100 cursor-not-allowed'
                        : 'text-gray-700 bg-white border-gray-200 cursor-pointer hover:border-blue-400 hover:text-blue-600',
                  )}
               >
                  <FaChevronLeft size={11} />
                  <span className="hidden sm:inline">Prev</span>
               </button>

               {buildPages(page, last).map((item, index) =>
                  item === 'gap' ? (
                     <span key={`gap-${index}`} className="px-1 text-gray-400 select-none">
                        …
                     </span>
                  ) : (
                     <button
                        key={item}
                        type="button"
                        onClick={() => onChange(item)}
                        aria-current={item === page ? 'page' : undefined}
                        className={clsx(
                           'flex justify-center items-center w-10 h-10 text-sm font-semibold rounded-xl border transition-colors cursor-pointer',
                           item === page
                              ? 'text-white bg-blue-600 border-blue-600 shadow-md shadow-blue-200'
                              : 'text-gray-700 bg-white border-gray-200 hover:border-blue-400 hover:text-blue-600',
                        )}
                     >
                        {item}
                     </button>
                  ),
               )}

               <button
                  type="button"
                  disabled={page >= last}
                  onClick={() => onChange(page + 1)}
                  className={clsx(
                     navButton,
                     page >= last
                        ? 'text-gray-300 bg-white border-gray-100 cursor-not-allowed'
                        : 'text-gray-700 bg-white border-gray-200 cursor-pointer hover:border-blue-400 hover:text-blue-600',
                  )}
               >
                  <span className="hidden sm:inline">Next</span>
                  <FaChevronRight size={11} />
               </button>
            </nav>
         )}
      </div>
   );
};

export default PaginationBar;
