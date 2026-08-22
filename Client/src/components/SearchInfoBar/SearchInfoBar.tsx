import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Tooltip } from 'antd';
import { FaUser, FaMoon, FaBed } from 'react-icons/fa';
import { CustomDatePicker } from '@/components';

interface SearchInfoBarProps {
   numberOfGuest: number;
   totalRoomCount: number;
   numberOfNights: number;
   startDate: Date;
   endDate: Date;
   handleDateChange: (dates: Date[]) => void;
}

const SearchInfoBar: React.FC<SearchInfoBarProps> = ({
   numberOfGuest,
   totalRoomCount,
   numberOfNights,
   startDate,
   endDate,
   handleDateChange,
}) => {
   const { control } = useFormContext();

   const stats = [
      { icon: <FaMoon size={13} />, value: numberOfNights, label: `night${numberOfNights > 1 ? 's' : ''}` },
      { icon: <FaUser size={13} />, value: numberOfGuest, label: `guest${numberOfGuest > 1 ? 's' : ''}` },
      { icon: <FaBed size={14} />, value: totalRoomCount, label: `room${totalRoomCount > 1 ? 's' : ''}` },
   ];

   return (
      <div className="sticky lg:top-[80px] top-[60px] left-0 right-0 z-40 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
         <div className="flex gap-3 items-center justify-between px-5 lg:px-7 py-2.5 mx-auto max-w-main">
            <Controller
               name="searchDate"
               control={control}
               defaultValue={[startDate, endDate]}
               render={({ field, fieldState }) => (
                  <Tooltip
                     title={fieldState.error?.message}
                     color="red"
                     open={!!fieldState.error}
                     placement="bottom"
                  >
                     <div className="flex items-center px-3 py-1.5 rounded-full border border-gray-200 transition-colors cursor-pointer hover:border-blue-400 hover:bg-blue-50/40">
                        <CustomDatePicker
                           value={field.value}
                           onChange={(dates) => {
                              field.onChange(dates);
                              handleDateChange(dates);
                           }}
                           isShowRightIcon={false}
                           isShowNight={false}
                           isBorder={false}
                           className="!h-[25px] text-sm select-none"
                        />
                     </div>
                  </Tooltip>
               )}
            />
            <div className="flex items-center gap-1.5 md:gap-2">
               {stats.map((stat) => (
                  <div
                     key={stat.label}
                     className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-gray-50 rounded-full border border-gray-100"
                  >
                     <span className="text-gray-400">{stat.icon}</span>
                     <span className="font-semibold text-gray-900">{stat.value}</span>
                     <span className="hidden text-gray-500 md:inline">{stat.label}</span>
                  </div>
               ))}
            </div>
         </div>
      </div>
   );
};

export default SearchInfoBar;
