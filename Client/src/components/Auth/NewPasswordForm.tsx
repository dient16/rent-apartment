'use client';

import React from 'react';
import { Button, Input } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { FiAlertCircle, FiLock, FiMail } from 'react-icons/fi';
import PasswordStrength, { validatePassword } from './PasswordStrength';
import { AUTH_INPUT, AUTH_PRIMARY_BUTTON } from './AuthShell';

interface NewPasswordFormProps {
   /** Account the password is for — shown read-only so the user knows which one. */
   email?: string;
   submitLabel: string;
   loading?: boolean;
   /** Server-side failure to show above the button. */
   error?: string | null;
   onSubmit: (password: string) => void;
}

interface FormValues {
   password: string;
   confirmPassword: string;
}

/** "New password + confirm" form shared by the set-password and reset-password screens. */
const NewPasswordForm: React.FC<NewPasswordFormProps> = ({
   email,
   submitLabel,
   loading = false,
   error,
   onSubmit,
}) => {
   const {
      control,
      handleSubmit,
      watch,
      formState: { errors },
   } = useForm<FormValues>({
      mode: 'onTouched',
      defaultValues: { password: '', confirmPassword: '' },
   });
   const password = watch('password');

   return (
      <form
         onSubmit={handleSubmit((values) => onSubmit(values.password))}
         className="flex flex-col gap-4"
         noValidate
      >
         {email && (
            <div className="flex flex-col gap-1.5">
               <label className="text-sm font-medium text-gray-700">Account</label>
               <Input
                  size="large"
                  value={email}
                  readOnly
                  disabled
                  prefix={<FiMail size={17} className="mr-2 text-gray-400" />}
                  className={`${AUTH_INPUT} text-gray-700!`}
               />
            </div>
         )}

         <Controller
            control={control}
            name="password"
            rules={{
               required: 'Please enter a password',
               validate: validatePassword,
            }}
            render={({ field }) => (
               <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                     New password
                  </label>
                  <Input.Password
                     size="large"
                     placeholder="Create a strong password"
                     autoComplete="new-password"
                     autoFocus
                     {...field}
                     status={errors.password && 'error'}
                     prefix={<FiLock size={17} className="mr-2 text-gray-400" />}
                     className={AUTH_INPUT}
                  />
                  {errors.password && (
                     <span className="text-xs text-red-500">
                        {errors.password.message}
                     </span>
                  )}
               </div>
            )}
         />

         <PasswordStrength value={password} className="px-1" />

         <Controller
            control={control}
            name="confirmPassword"
            rules={{
               required: 'Please confirm your password',
               validate: (value, values) =>
                  value === values.password || 'Passwords do not match',
            }}
            render={({ field }) => (
               <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">
                     Confirm password
                  </label>
                  <Input.Password
                     size="large"
                     placeholder="Repeat the password"
                     autoComplete="new-password"
                     {...field}
                     status={errors.confirmPassword && 'error'}
                     prefix={<FiLock size={17} className="mr-2 text-gray-400" />}
                     className={AUTH_INPUT}
                  />
                  {errors.confirmPassword && (
                     <span className="text-xs text-red-500">
                        {errors.confirmPassword.message}
                     </span>
                  )}
               </div>
            )}
         />

         {error && (
            <div className="flex gap-2 items-start px-3.5 py-3 text-sm text-rose-600 bg-rose-50 rounded-xl border border-rose-100">
               <FiAlertCircle size={16} className="mt-0.5 flex-shrink-0" />
               <span>{error}</span>
            </div>
         )}

         <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            className={`mt-2 ${AUTH_PRIMARY_BUTTON}`}
         >
            {submitLabel}
         </Button>
      </form>
   );
};

export default NewPasswordForm;
