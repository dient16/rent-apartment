import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Input, InputNumber } from 'antd';
import clsx from 'clsx';

interface InputFieldProps {
   name: string;
   rules?: object;
   type?: 'text' | 'number' | 'textarea';
   label: string;
   className?: string;
   rows?: number;
   suffix?: string;
   formatter?: (value: string) => string;
   parser?: (value: string) => string;
}

const InputField: React.FC<InputFieldProps> = ({
   name,
   rules,
   type = 'text',
   label,
   className,
   rows,
   suffix,
   formatter,
   parser,
}) => {
   const { control, clearErrors } = useFormContext();
   const isRequired = rules?.['required'];

   return (
      <Controller
         control={control}
         name={name}
         rules={rules}
         render={({ field, fieldState: { error } }) => (
            <div className={clsx('mb-4', className)}>
               <label
                  htmlFor={name}
                  className="block text-sm font-normal text-gray-700 mb-1"
               >
                  {label}
                  {isRequired && <span className="text-red-600"> *</span>}
               </label>
               {type === 'textarea' ? (
                  <Input.TextArea
                     {...field}
                     rows={rows}
                     id={name}
                     size="large"
                     status={error && 'error'}
                     className="w-full"
                     onChange={(value) => {
                        clearErrors(name);
                        field.onChange(value);
                     }}
                  />
               ) : type === 'number' ? (
                  <InputNumber
                     {...field}
                     id={name}
                     className="w-full"
                     size="large"
                     status={error && 'error'}
                     suffix={suffix}
                     formatter={formatter}
                     parser={parser}
                     onChange={(value) => {
                        clearErrors(name);
                        field.onChange(value);
                     }}
                  />
               ) : (
                  <Input
                     {...field}
                     type={type}
                     id={name}
                     className="w-full"
                     size="large"
                     status={error && 'error'}
                     suffix={suffix}
                     onChange={(value) => {
                        clearErrors(name);
                        field.onChange(value);
                     }}
                  />
               )}
               {error && (
                  <span className="text-red-600 text-sm">{error.message}</span>
               )}
            </div>
         )}
      />
   );
};

export default InputField;
