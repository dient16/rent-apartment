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
         <div className="hidden xl:block sticky p-6 mt-5 bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/70 min-w-[370px] top-[140px] font-main">
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
               className="mt-4 w-full !h-11 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl border-none"
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
         <div className="fixed bottom-0 z-50 left-0 right-0 px-4 py-1 bg-white border-t-2 xl:hidden">
            <div className="flex justify-between items-center mt-1">
               <div>
                  <span className="block text-lg font-medium">
                     {finalAmount.toLocaleString()} VND
                  </span>
                  <span className="block text-sm font-light">
                     {`${selectedRooms.reduce(
                        (acc, room) => acc + room.count,
                        0,
                     )} rooms · ${numberOfDays} nights`}
                  </span>
               </div>
               <div className="flex flex-col gap-3 align-center justify-center">
                  <span
                     className="text-white rounded-lg border hover:bg-gray-100 p-1 flex justify-center align-center"
                     onClick={() => setDrawerVisible(true)}
                  >
                     <FaChevronUp color="#000" />
                  </span>
                  <Button
                     className="bg-blue-500 h-[38px] font-main"
                     id="book-room-btn"
                     htmlType="submit"
                     type="primary"
                     disabled={!isValid}
                  >
                     Book now
                  </Button>
               </div>
            </div>
         </div>
         <Drawer
            placement="bottom"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            height="60%"
         >
            <div className="flex flex-col gap-3 justify-center items-center w-full">
               <div className="text-xl font-medium">
                  <span>{totalAmountPerNight.toLocaleString()} VND</span>
                  <span className="text-base font-light">/ night</span>
               </div>
               <div className="flex flex-col justify-center w-full px-6">
                  <div className="flex justify-between items-center py-2 border-b">
                     <span>Check-in:</span>
                     <span>{moment(startDate).format('DD MMM YYYY')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                     <span>Check-out:</span>
                     <span>{moment(endDate).format('DD MMM YYYY')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                     <span>Nights:</span>
                     <span>{numberOfDays}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                     <span>Guests:</span>
                     <span>{numberOfGuest}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                     <span>Rooms:</span>
                     <span>
                        {selectedRooms.reduce(
                           (acc, room) => acc + room.count,
                           0,
                        )}
                     </span>
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                     <div className="flex justify-between items-center mt-3 w-full font-light">
                        <span>
                           <span>
                              {totalAmountPerNight.toLocaleString()} VND
                           </span>
                           <span>{` x ${numberOfDays} night`}</span>
                        </span>
                        <span>
                           {(
                              totalAmountPerNight * numberOfDays
                           ).toLocaleString()}{' '}
                           VND
                        </span>
                     </div>
                     <div className="flex justify-between items-center mt-1 w-full font-light">
                        <div>
                           <span>
                              {totalAmountPerNight.toLocaleString()} VND
                           </span>
                           <span>{` x ${selectedRooms.reduce(
                              (acc, room) => acc + room.count,
                              0,
                           )} rooms`}</span>
                        </div>
                        <span>{totalAmount.toLocaleString()} VND</span>
                     </div>
                     <div className="flex justify-between items-center pt-5 w-full font-light border-t border-gray-500">
                        <span>Tax fee 11%</span>
                        <span>{`+ ${taxAmount.toLocaleString()} VND`}</span>
                     </div>
                     <div className="flex justify-between items-center pt-1 w-full font-light border-t">
                        <span className="flex-1">
                           Total amount, tax included
                        </span>
                        <span className="flex-2 text-right">
                           {finalAmount.toLocaleString()} VND
                        </span>
                     </div>
                  </div>
                  <Button
                     className="mt-3 bg-blue-500 font-main"
                     htmlType="submit"
                     type="primary"
                     disabled={!isValid}
                     onClick={() =>
                        document.getElementById('book-room-btn')?.click()
                     }
                  >
                     Book now
                  </Button>
               </div>
            </div>
         </Drawer>
      </>
   );
};

export default BookingSummary;
