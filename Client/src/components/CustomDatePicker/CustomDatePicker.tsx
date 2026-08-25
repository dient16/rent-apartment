import React, { useState } from 'react';
import { DateRangePicker, Range, RangeKeyDict } from 'react-date-range';
import { Button, Drawer, Popover } from 'antd';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import moment from 'moment';
import { DownOutlined, CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useMediaQuery } from 'react-responsive';
import { HiOutlineArrowLongRight } from 'react-icons/hi2';
import { FiChevronDown } from 'react-icons/fi';

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
   // Month/year jump panel in the calendar header
   const [navOpen, setNavOpen] = useState(false);
   const [navYear, setNavYear] = useState(() => moment().year());
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
                     {/* Month/year jump: plain buttons (no inputs, so phones never pop the keyboard) */}
                     <div className="relative">
                        <button
                           type="button"
                           onClick={() => {
                              setNavYear(shownYear);
                              setNavOpen((current) => !current);
                           }}
                           className="datepicker-nav-title"
                        >
                           {moment(focusedDate).format('MMMM YYYY')}
                           <FiChevronDown
                              size={16}
                              className={`text-gray-500 transition-transform ${
                                 navOpen ? 'rotate-180' : ''
                              }`}
                           />
                        </button>

                        {navOpen && (
                           <>
                              {/* Click-away layer */}
                              <div
                                 className="fixed inset-0 z-10"
                                 onClick={() => setNavOpen(false)}
                              />
                              <div className="absolute left-1/2 top-full z-20 p-3 mt-2 w-64 bg-white rounded-2xl border border-gray-100 shadow-xl -translate-x-1/2">
                                 <div className="flex justify-between items-center mb-2">
                                    <button
                                       type="button"
                                       aria-label="Previous year"
                                       className="datepicker-nav-btn"
                                       disabled={navYear <= years[0]}
                                       onClick={() => setNavYear((year) => year - 1)}
                                    >
                                       <LeftOutlined />
                                    </button>
                                    <span className="text-sm font-bold text-gray-900">
                                       {navYear}
                                    </span>
                                    <button
                                       type="button"
                                       aria-label="Next year"
                                       className="datepicker-nav-btn"
                                       disabled={navYear >= years[years.length - 1]}
                                       onClick={() => setNavYear((year) => year + 1)}
                                    >
                                       <RightOutlined />
                                    </button>
                                 </div>
                                 <div className="grid grid-cols-3 gap-1.5">
                                    {moment.monthsShort().map((label, month) => {
                                       const disabled =
                                          (navYear === rangeStart.getFullYear() &&
                                             month < rangeStart.getMonth()) ||
                                          (navYear === maxDate.getFullYear() &&
                                             month > maxDate.getMonth());
                                       const active =
                                          navYear === shownYear &&
                                          month === focusedDate.getMonth();
                                       return (
                                          <button
                                             key={label}
                                             type="button"
                                             disabled={disabled}
                                             onClick={() => {
                                                changeShownDate(new Date(navYear, month, 1), 'set');
                                                setNavOpen(false);
                                             }}
                                             className={`h-9 text-sm font-medium rounded-lg border-none transition-colors ${
                                                active
                                                   ? 'bg-blue-500 text-white'
                                                   : disabled
                                                     ? 'text-gray-300 bg-transparent cursor-not-allowed'
                                                     : 'text-gray-700 bg-gray-50 cursor-pointer hover:bg-blue-50 hover:text-blue-600'
                                             }`}
                                          >
                                             {label}
                                          </button>
                                       );
                                    })}
                                 </div>
                              </div>
                           </>
                        )}
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
         <div className="pt-3 px-4 pb-5 w-full bg-white border-t border-gray-100 lg:hidden">
            <div className="flex gap-2 items-center mb-3">
               <div className="flex-1 px-3 py-2 min-w-0 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                     Check-in
                  </p>
                  <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                     {moment(dates[0]).format('ddd, D MMM')}
                  </p>
               </div>
               <HiOutlineArrowLongRight size={18} className="flex-shrink-0 text-gray-400" />
               <div className="flex-1 px-3 py-2 min-w-0 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                     Check-out
                  </p>
                  <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                     {moment(dates[1]).format('ddd, D MMM')}
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
               // Default autoFocus lands on the month <Select>'s hidden input and
               // pops the soft keyboard on phones.
               autoFocus={false}
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
