import React from 'react';
import moment from 'moment';
import { FiSearch } from 'react-icons/fi';

interface SummaryCardProps {
   searchParams: URLSearchParams;
   onClick: () => void;
}

const plural = (count: number, noun: string) =>
   `${count} ${noun}${count === 1 ? '' : 's'}`;

/** Mobile search pill: one tap re-opens the full search sheet. */
const SummaryCard: React.FC<SummaryCardProps> = ({ searchParams, onClick }) => {
   const startDate = searchParams.get('startDate');
   const endDate = searchParams.get('endDate');
   const guests = Number(searchParams.get('numberOfGuest')) || 1;
   const rooms = Number(searchParams.get('roomNumber')) || 1;
   const province = searchParams.get('province');

   const dates =
      startDate && endDate
         ? `${moment(startDate).format('DD MMM')} – ${moment(endDate).format('DD MMM')}`
         : 'Any dates';
   const who = [plural(guests, 'guest'), rooms > 1 ? plural(rooms, 'room') : null]
      .filter(Boolean)
      .join(' · ');

   return (
      <button
         type="button"
         onClick={onClick}
         className="flex flex-1 gap-3 items-center px-3 min-w-0 h-12 text-left bg-white rounded-full border border-gray-200 shadow-card-sm transition-shadow cursor-pointer hover:shadow-card-md"
      >
         <span className="flex flex-shrink-0 justify-center items-center w-8 h-8 text-blue-600 bg-blue-50 rounded-full">
            <FiSearch size={15} />
         </span>
         <span className="flex flex-col min-w-0 leading-tight">
            <span className="text-sm font-semibold text-gray-900 truncate">
               {province || 'Anywhere'}
            </span>
            <span className="text-xs text-gray-500 truncate">
               {dates} · {who}
            </span>
         </span>
      </button>
   );
};

export default SummaryCard;
