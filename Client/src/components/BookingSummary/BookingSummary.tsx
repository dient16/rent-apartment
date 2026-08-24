import React, { useState, useMemo } from 'react';
import { Button, Tooltip, Drawer } from 'antd';
import { useFormContext } from 'react-hook-form';
import { PiUserThin } from 'react-icons/pi';
import { FaChevronUp } from 'react-icons/fa';
import moment from 'moment';

interface RoomValue {
   roomId: string;
   count: number;
}

interface BookingSummaryProps {
   apartment: Apartment & { rooms: RoomOption[] };
   numberOfGuest: number;
   startDate: Date;
   endDate: Date;
   numberOfDays: number;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
   apartment,
   numberOfGuest,
   startDate,
   endDate,
   numberOfDays,
}) => {
   const {
      watch,
      formState: { isValid },
   } = useFormContext();
   const [drawerVisible, setDrawerVisible] = useState(false);
   const selectedRooms: RoomValue[] = watch('selectedRooms', []);
   const totalAmountPerNight = useMemo(() => {
      let total = 0;
      selectedRooms.forEach((selectedRoom: RoomValue) => {
         const room = apartment?.rooms.find(
            (r: RoomOption) => r._id === selectedRoom.roomId,
         );
         if (room) {
            total += room.price * selectedRoom.count;
         }
      });
      return total;
   }, [selectedRooms, apartment]);

   const totalAmount = useMemo(() => {
      return totalAmountPerNight * numberOfDays;
   }, [totalAmountPerNight, numberOfDays]);

   const taxAmount = useMemo(() => totalAmount * 0.11, [totalAmount]);

   const finalAmount = useMemo(
      () => totalAmount + taxAmount,
      [totalAmount, taxAmount],
   );
   const roomCosts = useMemo(() => {
      return selectedRooms
         .map((selectedRoom: RoomValue) => {
            const room = apartment?.rooms.find(
               (r: RoomOption) => r._id === selectedRoom.roomId,
            );
            if (room) {
               const totalCost = room.price * selectedRoom.count;
               return {
                  ...room,
                  totalCost,
                  count: selectedRoom.count,
               };
            }
            return null;
         })
         .filter(Boolean);
   }, [selectedRooms, apartment]);
   return (
      <>
         <div className="hidden xl:block sticky p-6 mt-8 bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/70 min-w-[370px] top-[164px] font-main">
            {/* Price headline */}
            <div className="flex gap-1 items-baseline">
               <span className="text-2xl font-bold text-gray-900">
                  {totalAmountPerNight.toLocaleString()}
               </span>
               <span className="text-sm font-medium text-gray-500">
                  VND / night
               </span>
            </div>

            {/* Dates + guests */}
            <div className="mt-4 rounded-xl border border-gray-200 divide-y divide-gray-200 overflow-hidden">
               <div className="grid grid-cols-2 divide-x divide-gray-200">
                  <Tooltip title="Check-in date">
                     <div className="px-4 py-2.5 cursor-default">
                        <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                           Check-in
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                           {moment(startDate).format('DD MMM YYYY')}
                        </p>
                     </div>
                  </Tooltip>
                  <Tooltip title="Check-out date">
                     <div className="px-4 py-2.5 cursor-default">
                        <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                           Check-out
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                           {moment(endDate).format('DD MMM YYYY')}
                        </p>
                     </div>
                  </Tooltip>
               </div>
               <div className="flex gap-2 items-center px-4 py-2.5 cursor-default select-none">
                  <PiUserThin size={20} className="text-gray-500" />
                  <span className="text-sm text-gray-700">
                     {`${numberOfGuest} adult · ${selectedRooms.reduce(
                        (acc, room) => acc + room.count,
                        0,
                     )} room${selectedRooms.reduce((acc, room) => acc + room.count, 0) > 1 ? 's' : ''} · ${numberOfDays} night${numberOfDays > 1 ? 's' : ''}`}
                  </span>
               </div>
            </div>

            <Button
               className={`mt-4 w-full h-11! text-base font-semibold rounded-xl border-none ${
                  isValid
                     ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                     : 'bg-gray-100! text-gray-400! cursor-not-allowed'
               }`}
               htmlType="submit"
               type="primary"
               size="large"
               disabled={!isValid}
            >
               Book now
            </Button>
            {!isValid && (
               <p className="mt-2 text-xs text-center text-gray-400">
                  Select a room to continue
               </p>
            )}

            {/* Price breakdown */}
            <div className="flex flex-col gap-2.5 mt-5 text-sm">
               {roomCosts.map((room) => (
                  <div
                     key={room!._id}
                     className="flex justify-between items-center text-gray-600"
                  >
                     <span>
                        {room!.price.toLocaleString()} VND × {room!.count} room
                        {room!.count > 1 ? 's' : ''}
                     </span>
                     <span>{room!.totalCost.toLocaleString()} VND</span>
                  </div>
               ))}
               <div className="flex justify-between items-center text-gray-600">
                  <span>
                     {totalAmountPerNight.toLocaleString()} VND × {numberOfDays}{' '}
                     night{numberOfDays > 1 ? 's' : ''}
                  </span>
                  <span>
                     {(totalAmountPerNight * numberOfDays).toLocaleString()} VND
                  </span>
               </div>
               <div className="flex justify-between items-center text-gray-600">
                  <span>Taxes &amp; fees (11%)</span>
                  <span>+ {taxAmount.toLocaleString()} VND</span>
               </div>
               <div className="flex justify-between items-center pt-3 mt-1 border-t border-gray-100">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-base font-bold text-blue-600">
                     {finalAmount.toLocaleString()} VND
                  </span>
               </div>
            </div>
         </div>
         {/* ===== Mobile / tablet bottom bar ===== */}
         <div className="flex fixed bottom-0 left-0 right-0 z-50 gap-3 items-center px-4 py-2.5 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] xl:hidden pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
            <button
               type="button"
               onClick={() => setDrawerVisible(true)}
               className="flex flex-1 gap-2 items-center min-w-0 text-left bg-transparent border-none cursor-pointer"
            >
               <span className="flex flex-shrink-0 justify-center items-center w-8 h-8 text-blue-600 bg-blue-50 rounded-full border border-blue-100 transition-colors hover:bg-blue-100">
                  <FaChevronUp size={12} />
               </span>
               <span className="min-w-0">
                  <span className="block text-base font-bold text-gray-900 truncate">
                     {finalAmount.toLocaleString()} VND
                  </span>
                  <span className="block text-xs text-gray-500 truncate">
                     {`${selectedRooms.reduce((acc, room) => acc + room.count, 0)} room${
                        selectedRooms.reduce((acc, room) => acc + room.count, 0) !== 1 ? 's' : ''
                     } · ${numberOfDays} night${numberOfDays > 1 ? 's' : ''} · taxes incl.`}
                  </span>
               </span>
            </button>
            <Button
               className={`flex-shrink-0 h-10! px-6 font-semibold rounded-xl border-none font-main ${
                  isValid
                     ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                     : 'bg-gray-100! text-gray-400!'
               }`}
               id="book-room-btn"
               htmlType="submit"
               type="primary"
               disabled={!isValid}
            >
               Book now
            </Button>
         </div>

         {/* ===== Details sheet: full height on phones, 3/4 on tablets ===== */}
         <Drawer
            placement="bottom"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            title="Booking details"
            styles={{
               wrapper: { height: 'auto', maxHeight: '92%' },
               body: { padding: '16px 20px' },
            }}
            className="font-main"
         >
            <div className="flex flex-col mx-auto w-full max-w-lg">
               <div className="flex gap-1 items-baseline">
                  <span className="text-2xl font-bold text-gray-900">
                     {totalAmountPerNight.toLocaleString()}
                  </span>
                  <span className="text-sm font-medium text-gray-500">
                     VND / night
                  </span>
               </div>

               <div className="mt-4 rounded-xl border border-gray-200 divide-y divide-gray-200 overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                     <div className="px-4 py-2.5">
                        <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                           Check-in
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                           {moment(startDate).format('DD MMM YYYY')}
                        </p>
                     </div>
                     <div className="px-4 py-2.5">
                        <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                           Check-out
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                           {moment(endDate).format('DD MMM YYYY')}
                        </p>
                     </div>
                  </div>
                  <div className="flex gap-2 items-center px-4 py-2.5 select-none">
                     <PiUserThin size={20} className="text-gray-500" />
                     <span className="text-sm text-gray-700">
                        {`${numberOfGuest} adult · ${selectedRooms.reduce(
                           (acc, room) => acc + room.count,
                           0,
                        )} room${selectedRooms.reduce((acc, room) => acc + room.count, 0) !== 1 ? 's' : ''} · ${numberOfDays} night${numberOfDays > 1 ? 's' : ''}`}
                     </span>
                  </div>
               </div>

               <div className="flex flex-col gap-2.5 mt-5 text-sm">
                  {roomCosts.map((room) => (
                     <div
                        key={room!._id}
                        className="flex justify-between items-center text-gray-600"
                     >
                        <span>
                           {room!.price.toLocaleString()} VND × {room!.count} room
                           {room!.count > 1 ? 's' : ''}
                        </span>
                        <span>{room!.totalCost.toLocaleString()} VND</span>
                     </div>
                  ))}
                  <div className="flex justify-between items-center text-gray-600">
                     <span>
                        {totalAmountPerNight.toLocaleString()} VND × {numberOfDays}{' '}
                        night{numberOfDays > 1 ? 's' : ''}
                     </span>
                     <span>{totalAmount.toLocaleString()} VND</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                     <span>Taxes &amp; fees (11%)</span>
                     <span>+ {taxAmount.toLocaleString()} VND</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 mt-1 border-t border-gray-100">
                     <span className="font-semibold text-gray-900">
                        Total, tax included
                     </span>
                     <span className="text-base font-bold text-blue-600">
                        {finalAmount.toLocaleString()} VND
                     </span>
                  </div>
               </div>

               <Button
                  className={`mt-5 w-full h-10! text-sm font-semibold rounded-xl border-none font-main ${
                     isValid
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white'
                        : 'bg-gray-100! text-gray-400! cursor-not-allowed'
                  }`}
                  htmlType="submit"
                  type="primary"
                  disabled={!isValid}
                  onClick={() => {
                     setDrawerVisible(false);
                     document.getElementById('book-room-btn')?.click();
                  }}
               >
                  Book now
               </Button>
               {!isValid && (
                  <p className="mt-2 text-xs text-center text-gray-400">
                     Select a room to continue
                  </p>
               )}
            </div>
         </Drawer>
      </>
   );
};

export default BookingSummary;
