import React from 'react';
import {
   IoTimeOutline,
   IoShieldCheckmarkOutline,
   IoDocumentTextOutline,
} from 'react-icons/io5';

interface RoomPolicesProps {
   apartment?: {
      houserules?: string[];
      checkInTime?: string;
      checkOutTime?: string;
      safetyInfo?: string[];
      cancellationPolicy?: string;
   };
}

const RoomPolices: React.FC<RoomPolicesProps> = ({ apartment }) => {
   const houseRules = [
      ...(apartment?.checkInTime ? [`Check-in after ${apartment.checkInTime}`] : ['Check-in after 2:00 PM']),
      ...(apartment?.checkOutTime ? [`Check-out before ${apartment.checkOutTime}`] : ['Check-out before 12:00 PM']),
      ...(apartment?.houserules?.length ? apartment.houserules : ['No smoking inside the rooms']),
   ];
   const safety = apartment?.safetyInfo?.length
      ? apartment.safetyInfo
      : ['Smoke detector on every floor', 'Fire extinguisher available'];
   const cancellation = apartment?.cancellationPolicy
      ? [apartment.cancellationPolicy]
      : [
           'Free cancellation up to 48 hours before check-in',
           'After that, the first night is non-refundable',
        ];

   const sections = [
      { title: 'House rules', icon: <IoTimeOutline size={18} />, items: houseRules },
      { title: 'Safety & property', icon: <IoShieldCheckmarkOutline size={18} />, items: safety },
      { title: 'Cancellation policy', icon: <IoDocumentTextOutline size={18} />, items: cancellation },
   ];

   return (
      <div className="font-main">
         <h3 className="mb-5 text-xl font-semibold text-gray-900">Things to know</h3>
         <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {sections.map((section) => (
               <div
                  key={section.title}
                  className="p-5 bg-gray-50 rounded-2xl border border-gray-100"
               >
                  <div className="flex gap-2 items-center mb-3 font-semibold text-gray-900">
                     <span className="flex justify-center items-center w-8 h-8 text-blue-600 bg-blue-50 rounded-lg">
                        {section.icon}
                     </span>
                     {section.title}
                  </div>
                  <ul className="space-y-2">
                     {section.items.map((item, index) => (
                        <li
                           key={index}
                           className="text-sm leading-relaxed text-gray-600"
                        >
                           {item}
                        </li>
                     ))}
                  </ul>
               </div>
            ))}
         </div>
      </div>
   );
};

export default RoomPolices;
