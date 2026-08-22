import React, { useState } from 'react';
import { DateRangePicker, Range, RangeKeyDict } from 'react-date-range';
import { Button, Drawer, Popover } from 'antd';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import moment from 'moment';
import { DownOutlined, CalendarOutlined } from '@ant-design/icons';
import { useMediaQuery } from 'react-responsive';
import { HiOutlineArrowLongRight } from 'react-icons/hi2';

interface CustomDatePickerProps {
   value: [Date, Date];
   onChange: (value: [Date, Date]) => void;
   disabledDates?: Date[];
   minDate?: Date;
   className?: string;
   isShowLeftIcon?: boolean;
   isShowRightIcon?: boolean;
   isShowNight?: boolean;
   isBorder?: boolean;
   variant?: 'label' | 'button' | 'compact';
   format?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
   value,
   onChange,
   className,
   disabledDates = [],
   minDate,
   isShowLeftIcon = true,
   isShowRightIcon = true,
   isShowNight = true,
   isBorder = true,
   format = 'DD MMM',
   variant = 'button',
}) => {
   const [drawerVisible, setDrawerVisible] = useState(false);
   const [popoverVisible, setPopoverVisible] = useState(false);
   const [dates, setDates] = useState<[Date, Date]>(value);
   const [selectingEndDate, setSelectingEndDate] = useState(false);
   const isMobileOrTablet = useMediaQuery({ query: '(max-width: 800px)' });
   const isMobile = useMediaQuery({ query: '(max-width: 440px)' });
   const handleDateChange = (ranges: RangeKeyDict) => {
      const selection = ranges.selection as Range;
      const newStartDate = selection.startDate as Date;
      const newEndDate = selection.endDate as Date;

      setDates([newStartDate, newEndDate]);
      if (
         !selectingEndDate &&
         newStartDate &&
         (!dates[1] || newEndDate !== dates[1])
      ) {
         setSelectingEndDate(true);
      } else if (newEndDate) {
         setSelectingEndDate(false);
         if (!isMobileOrTablet) {
            onChange([newStartDate, newEndDate]);
            setPopoverVisible(false);
         }
      }
   };

   const handleConfirm = () => {
      onChange(dates);
      setDrawerVisible(false);
   };

   const getNightCount = (startDate: Date, endDate: Date) => {
      return moment(endDate).diff(moment(startDate), 'days');
   };

   const dateRangePicker = (
      <div className="h-full flex flex-col justify-between items-center">
         <DateRangePicker
            ranges={[
               {
                  startDate: dates[0],
                  endDate: dates[1],
                  key: 'selection',
               },
            ]}
            onChange={handleDateChange}
            moveRangeOnFirstSelection={false}
            months={isMobile ? 1 : 2}
            direction="horizontal"
            className="custom-datepicker"
            staticRanges={[]}
            inputRanges={[]}
            showDateDisplay={false}
            rangeColors={['#3b82f6']}
            disabledDates={disabledDates}
            minDate={minDate}
         />
         <div className="flex justify-between items-center pt-5 border-t bg-white lg:hidden px-2 pb-5 sm:p-5 w-full">
            <div className="flex flex-col">
               <span className="text-sm text-gray-500">Check-in</span>
               <span className="text-blue-600">
                  {moment(dates[0]).format('dddd, MMM D, YYYY')}
               </span>
            </div>
            <div className="flex flex-col">
               <span className="text-sm text-gray-500">Check-out</span>
               <span className="text-blue-600">
                  {moment(dates[1]).format('dddd, MMM D, YYYY')}
               </span>
            </div>
            <Button
               className="bg-blue-500"
               type="primary"
               onClick={handleConfirm}
            >
               Confirm
            </Button>
         </div>
      </div>
   );
   const Btn = isBorder ? Button : 'div';
   const renderButtonContent = () => (
      <>
         {variant === 'button' && (
            <Btn
               className={`my-2 flex gap-1 justify-center items-center w-full bg-white rounded-xl font-main h-[48px] ${className} cursor-pointer lg:hover:text-gray-400`}
               onClick={() => {
                  isMobileOrTablet
                     ? setDrawerVisible(true)
                     : setPopoverVisible(true);
               }}
            >
               {isShowLeftIcon && <CalendarOutlined className="mr-2" />}
               {moment(value[0]).format(format)}
               <HiOutlineArrowLongRight />
               {moment(value[1]).format(format)}
               {isShowNight
                  ? `, ${getNightCount(value[0], value[1])} nights`
                  : ''}
               {isShowRightIcon && <DownOutlined className="ml-2" />}
            </Btn>
         )}
         {variant === 'compact' && (
            <div
               className={`flex gap-2 items-center text-sm text-gray-800 cursor-pointer whitespace-nowrap ${className}`}
               onClick={() => {
                  isMobileOrTablet
                     ? setDrawerVisible(true)
                     : setPopoverVisible(true);
               }}
            >
               {!value[0] || !value[1] ? (
                  <span className="text-gray-400">Add dates</span>
               ) : (
                  <>
                     {moment(value[0]).format(format)}
                     <HiOutlineArrowLongRight className="text-gray-400" />
                     {moment(value[1]).format(format)}
                     <span className="text-gray-400">
                        · {getNightCount(value[0], value[1])} night
                        {getNightCount(value[0], value[1]) > 1 ? 's' : ''}
                     </span>
                  </>
               )}
            </div>
         )}
         {variant === 'label' && (
            <div className="flex items-end text-base font-medium md:gap-3 sm:gap-5 gap-2 max-w-[280px] w-full justify-around">
               <div className="flex flex-col items-start gap-1">
                  <div>Check-in</div>
                  <div
                     className="text-lg font-normal cursor-pointer"
                     onClick={() => {
                        isMobileOrTablet
                           ? setDrawerVisible(true)
                           : setPopoverVisible(true);
                     }}
                  >
                     {!dates[0] ? (
                        <div className="text-gray-400">Add date</div>
                     ) : (
                        <div>{moment(value[0]).format(format)}</div>
                     )}
                  </div>
               </div>
               <div className="pb-1">
                  <HiOutlineArrowLongRight />
               </div>
               <div className="flex flex-col items-start gap-1">
                  <div>Check-out</div>
                  <div
                     className="text-lg font-normal cursor-pointer"
                     onClick={() => {
                        isMobileOrTablet
                           ? setDrawerVisible(true)
                           : setPopoverVisible(true);
                     }}
                  >
                     {!dates[1] ? (
                        <div className="text-gray-400">Add date</div>
                     ) : (
                        <div>{moment(value[1]).format(format)}</div>
                     )}
                  </div>
               </div>
            </div>
         )}
      </>
   );

   const content = <div>{dateRangePicker}</div>;

   return (
      <>
         <div className="block lg:hidden">
            {renderButtonContent()}

            <Drawer
               title="Select Dates"
               placement="bottom"
               onClose={() => setDrawerVisible(false)}
               open={drawerVisible}
               height="100%"
               zIndex={1000}
            >
               {dateRangePicker}
            </Drawer>
         </div>
         <div className="hidden lg:block">
            <Popover
               content={content}
               trigger="click"
               placement="bottom"
               align={{ offset: [0, 24] }}
               open={popoverVisible}
               onOpenChange={setPopoverVisible}
            >
               {renderButtonContent()}
            </Popover>
         </div>
      </>
   );
};

export default CustomDatePicker;
