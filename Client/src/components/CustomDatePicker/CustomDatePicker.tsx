import React, { useState } from 'react';
import { DateRangePicker, Range, RangeKeyDict } from 'react-date-range';
import { Button, Drawer, Popover, Select } from 'antd';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import moment from 'moment';
import { DownOutlined, CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useMediaQuery } from 'react-responsive';
import { HiOutlineArrowLongRight } from 'react-icons/hi2';

interface CustomDatePickerProps {
   value: [Date, Date];
   onChange: (value: [Date, Date]) => void;
   disabledDates?: Date[];
   minDate?: Date;
   maxDate?: Date;
   className?: string;
   isShowLeftIcon?: boolean;
   isShowRightIcon?: boolean;
   isShowNight?: boolean;
   isBorder?: boolean;
   variant?: 'label' | 'button' | 'compact';
   format?: string;
   /** Where the desktop popover anchors relative to the trigger */
   popoverPlacement?: 'bottom' | 'bottomLeft' | 'bottomRight';
   open?: boolean;
   onOpenChange?: (open: boolean) => void;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
   value,
   onChange,
   className,
   disabledDates = [],
   minDate,
   // react-date-range defaults to +20 years, which fills the year dropdown with noise.
   maxDate = moment().add(3, 'years').toDate(),
   isShowLeftIcon = true,
   isShowRightIcon = true,
   isShowNight = true,
   isBorder = true,
   format = 'DD MMM',
   variant = 'button',
   popoverPlacement = 'bottom',
   open,
   onOpenChange,
}) => {
   const [drawerVisible, setDrawerVisible] = useState(false);
   const [uncontrolledPopoverVisible, setUncontrolledPopoverVisible] = useState(false);
   const popoverVisible = open ?? uncontrolledPopoverVisible;
   const setPopoverVisible = (next: boolean) => {
      setUncontrolledPopoverVisible(next);
      onOpenChange?.(next);
   };
   const [dates, setDates] = useState<[Date, Date]>(value);
   const [selectingEndDate, setSelectingEndDate] = useState(false);
   const isMobileOrTablet = useMediaQuery({ query: '(max-width: 1023px)' });
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
            navigatorRenderer={(focusedDate, changeShownDate) => {
               const rangeStart = minDate ?? new Date();
               const shownYear = focusedDate.getFullYear();
               const years = Array.from(
                  { length: maxDate.getFullYear() - rangeStart.getFullYear() + 1 },
                  (_, i) => rangeStart.getFullYear() + i,
               );
               // Months outside [minDate, maxDate] stay listed but greyed out.
               const isMonthDisabled = (month: number) =>
                  (shownYear === rangeStart.getFullYear() &&
                     month < rangeStart.getMonth()) ||
                  (shownYear === maxDate.getFullYear() && month > maxDate.getMonth());
               return (
                  <div className="flex gap-2 justify-between items-center px-4 pt-3 pb-1">
                     <button
                        type="button"
                        aria-label="Previous month"
                        className="datepicker-nav-btn"
                        onClick={() => changeShownDate(-1, 'monthOffset')}
                     >
                        <LeftOutlined />
                     </button>
                     <div className="flex gap-2 items-center">
                        <Select
                           size="small"
                           variant="borderless"
                           popupMatchSelectWidth={150}
                           classNames={{ popup: { root: 'datepicker-nav-popup' } }}
                           value={focusedDate.getMonth()}
                           onChange={(month) => changeShownDate(month, 'setMonth')}
                           options={moment.months().map((label, value) => ({
                              label,
                              value,
                              disabled: isMonthDisabled(value),
                           }))}
                           className="datepicker-nav-select"
                        />
                        <Select
                           size="small"
                           variant="borderless"
                           popupMatchSelectWidth={110}
                           classNames={{ popup: { root: 'datepicker-nav-popup' } }}
                           value={focusedDate.getFullYear()}
                           onChange={(year) => changeShownDate(year, 'setYear')}
                           options={years.map((year) => ({ label: String(year), value: year }))}
                           className="datepicker-nav-select"
                        />
                     </div>
                     <button
                        type="button"
                        aria-label="Next month"
                        className="datepicker-nav-btn"
                        onClick={() => changeShownDate(1, 'monthOffset')}
                     >
                        <RightOutlined />
                     </button>
                  </div>
               );
            }}
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
            maxDate={maxDate}
         />
         <div className="pt-4 px-4 pb-5 w-full bg-white border-t border-gray-100 lg:hidden">
            <div className="grid grid-cols-2 gap-3 mb-4">
               <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="mb-0.5 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                     Check-in
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                     {moment(dates[0]).format('ddd, MMM D, YYYY')}
                  </p>
               </div>
               <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="mb-0.5 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                     Check-out
                  </p>
                  <p className="text-sm font-semibold text-gray-900">
                     {moment(dates[1]).format('ddd, MMM D, YYYY')}
                  </p>
               </div>
            </div>
            <Button
               block
               size="large"
               type="primary"
               onClick={handleConfirm}
               className="h-12! font-semibold bg-blue-500 rounded-xl"
            >
               Confirm · {getNightCount(dates[0], dates[1])} night
               {getNightCount(dates[0], dates[1]) > 1 ? 's' : ''}
            </Button>
         </div>
      </div>
   );
   const Btn = isBorder ? Button : 'div';
   const renderButtonContent = () => (
      <>
         {variant === 'button' && (
            <Btn
               className={`my-2 flex gap-1 ${
                  isShowRightIcon ? 'justify-start' : 'justify-center'
               } items-center w-full bg-white rounded-xl font-main h-[48px] ${className} cursor-pointer lg:hover:text-gray-400`}
               onClick={() => {
                  isMobileOrTablet
                     ? setDrawerVisible(true)
                     : setPopoverVisible(true);
               }}
            >
               {isShowLeftIcon && <CalendarOutlined className="mr-2" />}
               <span className="flex gap-1 items-center min-w-0 truncate">
                  {moment(value[0]).format(format)}
                  <HiOutlineArrowLongRight className="flex-shrink-0" />
                  {moment(value[1]).format(format)}
                  {isShowNight
                     ? `, ${getNightCount(value[0], value[1])} night${
                          getNightCount(value[0], value[1]) > 1 ? 's' : ''
                       }`
                     : ''}
               </span>
               {isShowRightIcon && (
                  <DownOutlined className="flex-shrink-0 ml-auto text-xs text-gray-400" />
               )}
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
               title={
                  <span className="text-base font-semibold">Select dates</span>
               }
               placement="bottom"
               onClose={() => setDrawerVisible(false)}
               open={drawerVisible}
               size="100%"
               zIndex={1000}
            >
               {dateRangePicker}
            </Drawer>
         </div>
         <div className="hidden lg:block">
            <Popover
               content={content}
               trigger="click"
               placement={popoverPlacement}
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
