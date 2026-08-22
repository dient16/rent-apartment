import React from 'react';
import clsx from 'clsx';

export type BookingStatus = 'pending' | 'confirmed' | 'canceled' | 'completed';

export const BOOKING_STATUS_STYLES: Record<
   BookingStatus,
   { badge: string; dot: string; label: string }
> = {
   pending: {
      badge: 'bg-amber-50 text-amber-600 border-amber-200',
      dot: 'bg-amber-500',
      label: 'Pending',
   },
   confirmed: {
      badge: 'bg-green-50 text-green-600 border-green-200',
      dot: 'bg-green-500',
      label: 'Confirmed',
   },
   completed: {
      badge: 'bg-blue-50 text-blue-600 border-blue-200',
      dot: 'bg-blue-500',
      label: 'Completed',
   },
   canceled: {
      badge: 'bg-rose-50 text-rose-600 border-rose-200',
      dot: 'bg-rose-500',
      label: 'Canceled',
   },
};

interface StatusBadgeProps {
   status?: string;
   size?: 'sm' | 'md';
}

/** Booking status badge shared by user & host */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
   const style =
      BOOKING_STATUS_STYLES[(status as BookingStatus) || 'pending'] ??
      BOOKING_STATUS_STYLES.pending;
   return (
      <span
         className={clsx(
            'inline-flex gap-1.5 items-center font-semibold rounded-full border whitespace-nowrap',
            size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
            style.badge,
         )}
      >
         <span className={clsx('rounded-full', size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2', style.dot)} />
         {style.label}
      </span>
   );
};

export default StatusBadge;
