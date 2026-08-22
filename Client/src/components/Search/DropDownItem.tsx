import React from 'react';
import { message } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import clsx from 'clsx';

interface DropDownItemProps {
   value: {
      guests: number;
      rooms: number;
   };
   onChange: (newValue: { guests: number; rooms: number }) => void;
}

interface StepperRowProps {
   label: string;
   sublabel: string;
   value: number;
   onDecrease: () => void;
   onIncrease: () => void;
   min?: number;
}

const StepperRow: React.FC<StepperRowProps> = ({
   label,
   sublabel,
   value,
   onDecrease,
   onIncrease,
   min = 1,
}) => (
   <div className="flex justify-between items-center py-4">
      <div>
         <p className="text-sm font-semibold text-gray-900">{label}</p>
         <p className="text-xs text-gray-400">{sublabel}</p>
      </div>
      <div className="flex gap-3 items-center">
         <button
            type="button"
            onClick={onDecrease}
            disabled={value <= min}
            className={clsx(
               'flex justify-center items-center w-8 h-8 rounded-full border bg-white transition-colors',
               value <= min
                  ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                  : 'border-gray-400 text-gray-700 cursor-pointer hover:border-gray-900 hover:text-gray-900',
            )}
         >
            <MinusOutlined className="text-xs" />
         </button>
         <span className="w-6 text-base font-semibold text-center text-gray-900">
            {value}
         </span>
         <button
            type="button"
            onClick={onIncrease}
            className="flex justify-center items-center w-8 h-8 text-gray-700 bg-white rounded-full border border-gray-400 transition-colors cursor-pointer hover:border-gray-900 hover:text-gray-900"
         >
            <PlusOutlined className="text-xs" />
         </button>
      </div>
   </div>
);

const DropDownItem: React.FC<DropDownItemProps> = ({ value, onChange }) => {
   const handleGuestChange = (amount: number) => {
      const nextGuests = Math.max(1, value.guests + amount);
      if (nextGuests < value.rooms) {
         message.error('Rooms cannot exceed the number of guests');
         return;
      }
      onChange({ ...value, guests: nextGuests });
   };

   const handleRoomChange = (amount: number) => {
      onChange({
         ...value,
         rooms: Math.max(1, Math.min(value.guests, value.rooms + amount)),
      });
   };

   return (
      <div className="py-2 px-5 bg-white rounded-2xl border border-gray-100 shadow-card-md min-w-[280px] font-main divide-y divide-gray-100">
         <StepperRow
            label="Guests"
            sublabel="How many people are staying?"
            value={value.guests || 1}
            onDecrease={() => handleGuestChange(-1)}
            onIncrease={() => handleGuestChange(1)}
         />
         <StepperRow
            label="Rooms"
            sublabel="Cannot exceed number of guests"
            value={value.rooms || 1}
            onDecrease={() => handleRoomChange(-1)}
            onIncrease={() => handleRoomChange(1)}
         />
      </div>
   );
};

export default DropDownItem;
