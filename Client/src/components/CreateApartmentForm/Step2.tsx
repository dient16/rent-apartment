import React, { useEffect, useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import RoomDetailsForm from './RoomDetailsForm';
import RoomImagesForm from './RoomImagesForm';
import { Button, Popconfirm, Tooltip } from 'antd';
import { CloseOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface Step2Props {
   setShowBackButton: React.Dispatch<React.SetStateAction<boolean>>;
   setShowNextButton: React.Dispatch<React.SetStateAction<boolean>>;
}

const emptyRoom = {
   roomType: '',
   amenities: [],
   size: '',
   price: '',
   numberOfGuest: '',
   quantity: '',
   images: [],
};

const Step2: React.FC<Step2Props> = ({
   setShowBackButton,
   setShowNextButton,
}) => {
   const { control, watch } = useFormContext();
   const { fields, append, remove } = useFieldArray({
      control,
      name: 'rooms',
   });
   const [activeIndex, setActiveIndex] = useState(0);

   useEffect(() => {
      if (fields.length === 0) {
         append(emptyRoom);
         setActiveIndex(0);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [fields.length]);

   useEffect(() => {
      setShowBackButton(true);
      setShowNextButton(true);
   }, [setShowBackButton, setShowNextButton]);

   const addNewRoom = () => {
      append(emptyRoom);
      setActiveIndex(fields.length);
   };

   const removeRoom = (index: number) => {
      remove(index);
      if (index === activeIndex) {
         setActiveIndex(Math.max(0, index - 1));
      } else if (index < activeIndex) {
         setActiveIndex(activeIndex - 1);
      }
   };

   const roomValues = watch('rooms');

   return (
      <motion.div
         initial={{ opacity: 0, y: 16 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.35 }}
      >
         {/* Danh sach phong dang pill */}
         <div className="flex flex-wrap gap-2 items-center pb-5 mb-6 border-b border-gray-100">
            {fields.map((field, index) => {
               const label =
                  roomValues?.[index]?.roomType?.trim() || `Room ${index + 1}`;
               const isActive = index === activeIndex;
               return (
                  <span
                     key={field.id}
                     className={clsx(
                        'inline-flex overflow-hidden items-center rounded-full border transition-colors',
                        isActive
                           ? 'bg-blue-500 text-white border-blue-500'
                           : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600',
                     )}
                  >
                     <button
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={clsx(
                           'py-2 pl-4 text-sm font-medium bg-transparent border-none cursor-pointer max-w-[180px] truncate',
                           isActive ? 'text-white' : 'text-inherit',
                           fields.length > 1 ? 'pr-1.5' : 'pr-4',
                        )}
                     >
                        {label}
                     </button>
                     {fields.length > 1 && (
                        <Popconfirm
                           title="Remove this room type?"
                           okText="Remove"
                           okButtonProps={{ danger: true }}
                           onConfirm={() => removeRoom(index)}
                        >
                           <button
                              type="button"
                              aria-label={`Remove ${label}`}
                              className={clsx(
                                 'flex justify-center items-center mr-1.5 w-5 h-5 rounded-full border-none cursor-pointer transition-colors',
                                 isActive
                                    ? 'text-white bg-white/20 hover:bg-white/35'
                                    : 'text-gray-400 bg-gray-100 hover:bg-gray-200',
                              )}
                           >
                              <CloseOutlined className="text-[9px]" />
                           </button>
                        </Popconfirm>
                     )}
                  </span>
               );
            })}
            <button
               type="button"
               onClick={addNewRoom}
               className="inline-flex gap-1.5 items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-full border border-blue-100 border-dashed transition-colors cursor-pointer hover:bg-blue-100"
            >
               <PlusOutlined className="text-xs" /> Add room type
            </button>
         </div>

         {/* Form phong dang chon */}
         {fields.map((field, index) => (
            <div
               key={field.id}
               className={index === activeIndex ? 'block' : 'hidden'}
            >
               <div className="flex justify-between items-center mb-5">
                  <h3 className="text-base font-bold text-gray-900">
                     {roomValues?.[index]?.roomType?.trim() ||
                        `Room ${index + 1}`}
                     <span className="ml-2 text-xs font-normal text-gray-400">
                        {index + 1} / {fields.length}
                     </span>
                  </h3>
                  {fields.length > 1 && (
                     <Popconfirm
                        title="Remove this room type?"
                        okText="Remove"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => removeRoom(index)}
                     >
                        <Button
                           danger
                           size="small"
                           icon={<DeleteOutlined />}
                           className="rounded-full"
                        >
                           Remove
                        </Button>
                     </Popconfirm>
                  )}
               </div>
               <RoomDetailsForm index={index} />
               <RoomImagesForm index={index} />
            </div>
         ))}

         {fields.length === 1 && (
            <Tooltip title="">
               <p className="mt-4 text-xs text-gray-400">
                  Tip: add one room type for each kind of room you offer (e.g.
                  Deluxe Double, Family Suite).
               </p>
            </Tooltip>
         )}
      </motion.div>
   );
};

export default Step2;
