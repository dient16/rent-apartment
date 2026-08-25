import React, { useState } from 'react';
import AppImage from '@/components/AppImage/AppImage';
import { FaBed, FaCheck, FaMinus, FaPlus, FaRulerCombined, FaUsers } from 'react-icons/fa';
import { Modal } from 'antd';
import { RoomInfo } from '@/components';

interface RoomOption {
   _id: string;
   roomType: string;
   size: number;
   quantity: number;
   numberOfGuest: number;
   price: number;
   totalPrice: number;
   bedType?: string;
   amenities?: { name: string; icon: string }[];
   images: string[];
}

interface RoomSelectionProps {
   roomOption: RoomOption;
   onChange: (selectedRoom: {
      roomId: string;
      roomType: string;
      count: number;
   }) => void;
   selectedCount: number;
}

const PERKS = ['Free cancellation before check-in', 'Pay at the property', 'Instant confirmation'];

const RoomSelection: React.FC<RoomSelectionProps> = ({
   roomOption,
   onChange,
   selectedCount,
}) => {
   const [count, setCount] = useState<number>(selectedCount);
   const [isModalVisible, setIsModalVisible] = useState(false);

   const [lastSelectedCount, setLastSelectedCount] = useState(selectedCount);
   if (lastSelectedCount !== selectedCount) {
      setLastSelectedCount(selectedCount);
      setCount(selectedCount);
   }

   const handleCountChange = (value: number) => {
      setCount(value);
      onChange({
         roomId: roomOption._id,
         roomType: roomOption.roomType,
         count: value,
      });
   };

   const increment = () => {
      if (count < roomOption.quantity) handleCountChange(count + 1);
   };
   const decrement = () => {
      if (count > 0) handleCountChange(count - 1);
   };

   const isSelected = count > 0;

   return (
      <div
         className={`overflow-hidden bg-white rounded-2xl border transition-all ${
            isSelected
               ? 'border-blue-500 ring-1 ring-blue-500 shadow-lg shadow-blue-100'
               : 'border-gray-200 shadow-sm hover:shadow-md'
         }`}
      >
         <div className="flex flex-col md:flex-row">
            {/* Photo */}
            <div className="relative md:w-[280px] flex-shrink-0">
               <AppImage
                  alt={roomOption.roomType}
                  src={roomOption.images[0]}
                  wrapperClassName="w-full h-[180px] md:h-full object-cover"
               />
               <span className="flex absolute top-3 left-3 gap-1.5 items-center px-2.5 py-1 text-xs font-medium text-gray-800 bg-white/90 rounded-full backdrop-blur">
                  <FaRulerCombined size={11} />
                  {roomOption.size} m²
               </span>
               {isSelected && (
                  <span className="flex absolute top-3 right-3 gap-1 items-center px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full">
                     <FaCheck size={10} />
                     {count} selected
                  </span>
               )}
            </div>

            {/* Info */}
            <div className="flex flex-col flex-1 gap-2.5 p-4 min-w-0 md:gap-3 md:p-5">
               <div>
                  <h3 className="text-base font-semibold text-gray-900 md:text-lg">
                     {roomOption.roomType}
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-gray-600">
                     <span className="flex gap-1.5 items-center">
                        <FaUsers size={13} className="text-gray-400" />
                        Up to {roomOption.numberOfGuest} guest
                        {roomOption.numberOfGuest > 1 ? 's' : ''}
                     </span>
                     {roomOption.bedType && (
                        <span className="flex gap-1.5 items-center">
                           <FaBed size={14} className="text-gray-400" />
                           {roomOption.bedType}
                        </span>
                     )}
                  </div>
               </div>

               {/* Amenity chips from real data */}
               {!!roomOption.amenities?.length && (
                  <div className="flex flex-wrap gap-1.5">
                     {roomOption.amenities.slice(0, 5).map((amenity) => (
                        <span
                           key={amenity.name}
                           className="px-2.5 py-1 text-xs text-gray-600 bg-gray-50 rounded-full border border-gray-100"
                        >
                           {amenity.name}
                        </span>
                     ))}
                     {roomOption.amenities.length > 5 && (
                        <span className="px-2.5 py-1 text-xs text-gray-400">
                           +{roomOption.amenities.length - 5} more
                        </span>
                     )}
                  </div>
               )}

               <ul className="space-y-1">
                  {PERKS.map((perk) => (
                     <li
                        key={perk}
                        className="flex gap-2 items-center text-sm text-green-700"
                     >
                        <FaCheck size={10} className="flex-shrink-0" />
                        {perk}
                     </li>
                  ))}
               </ul>

               <button
                  type="button"
                  onClick={() => setIsModalVisible(true)}
                  className="self-start text-sm font-medium text-blue-600 cursor-pointer hover:underline"
               >
                  View room details
               </button>
            </div>

            {/* Price + stepper: one row on phones, a column on md+ */}
            <div className="flex flex-row flex-shrink-0 gap-3 justify-between items-center p-4 bg-gray-50/70 border-t border-gray-100 md:flex-col md:items-stretch md:p-5 md:w-[220px] md:border-t-0 md:border-l">
               <div className="min-w-0 text-left md:text-right">
                  <p className="text-lg font-bold text-gray-900 md:text-xl">
                     {roomOption.totalPrice.toLocaleString()}{' '}
                     <span className="text-sm font-medium text-gray-500">VND</span>
                  </p>
                  <p className="text-xs text-gray-400">
                     per night · taxes included
                  </p>
                  <p
                     className={`mt-0.5 text-xs md:hidden ${
                        roomOption.quantity <= 3 ? 'font-medium text-red-500' : 'text-gray-400'
                     }`}
                  >
                     {roomOption.quantity <= 3
                        ? `Only ${roomOption.quantity} left!`
                        : `${roomOption.quantity} available`}
                  </p>
               </div>

               <div className="flex flex-shrink-0 justify-between items-center px-2 py-1.5 bg-white rounded-xl border border-gray-200">
                  <button
                     type="button"
                     onClick={decrement}
                     disabled={count === 0}
                     className={`flex justify-center items-center w-8 h-8 rounded-full border transition-colors ${
                        count === 0
                           ? 'text-gray-300 border-gray-100 cursor-not-allowed'
                           : 'text-gray-700 border-gray-200 cursor-pointer hover:bg-gray-50 hover:border-gray-300'
                     }`}
                  >
                     <FaMinus size={11} />
                  </button>
                  <span className="w-8 text-lg font-semibold text-center text-gray-900 select-none md:w-10">
                     {count}
                  </span>
                  <button
                     type="button"
                     onClick={increment}
                     disabled={count === roomOption.quantity}
                     className={`flex justify-center items-center w-8 h-8 rounded-full border transition-colors ${
                        count === roomOption.quantity
                           ? 'text-gray-300 border-gray-100 cursor-not-allowed'
                           : 'text-blue-600 border-blue-200 cursor-pointer hover:bg-blue-50 hover:border-blue-300'
                     }`}
                  >
                     <FaPlus size={11} />
                  </button>
               </div>

               <p
                  className={`hidden text-xs text-center md:block ${
                     roomOption.quantity <= 3
                        ? 'font-medium text-red-500'
                        : 'text-gray-400'
                  }`}
               >
                  {roomOption.quantity <= 3
                     ? `Only ${roomOption.quantity} room${roomOption.quantity > 1 ? 's' : ''} left!`
                     : `${roomOption.quantity} rooms available`}
               </p>
            </div>
         </div>

         <Modal
            title="Room Details"
            open={isModalVisible}
            onOk={() => setIsModalVisible(false)}
            onCancel={() => setIsModalVisible(false)}
            width={1100}
            style={{ maxWidth: '92vw' }}
            footer={null}
            styles={{
               mask: {
                  backdropFilter: 'blur(5px)',
               },
            }}
         >
            <RoomInfo roomInfo={roomOption} />
         </Modal>
      </div>
   );
};

export default RoomSelection;
