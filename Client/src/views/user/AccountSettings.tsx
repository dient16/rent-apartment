'use client';

import React from 'react';
import { Button, Input, Popconfirm, Select, message } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { LockOutlined, WarningOutlined } from '@ant-design/icons';
import { FiAlertCircle } from 'react-icons/fi';
import { apiChangePassword } from '@/apis';
import PasswordStrength, {
   validatePassword,
} from '@/components/Auth/PasswordStrength';
import { getApiErrorMessage } from '@/utils/helpers';

interface ChangePasswordValues {
   currentPassword: string;
   newPassword: string;
   confirmPassword: string;
}

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
   <label className="block mb-1.5 text-xs font-semibold tracking-wider text-gray-400 uppercase">
      {children}
   </label>
);

/** Account settings: password change is live, preferences and deletion are visual only. */
const AccountSettings: React.FC = () => {
   const {
      control,
      handleSubmit,
      watch,
      reset,
      formState: { errors },
   } = useForm<ChangePasswordValues>({
      mode: 'onTouched',
      defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
   });
   const newPassword = watch('newPassword');

   const changePasswordMutation = useMutation({
      mutationFn: apiChangePassword,
      onSuccess: (response) => {
         message.success(response.message || 'Password updated successfully');
         reset();
      },
   });

   const onSubmit = (values: ChangePasswordValues) =>
      changePasswordMutation.mutate({
         currentPassword: values.currentPassword || undefined,
         newPassword: values.newPassword,
      });

   return (
      <div className="space-y-6 w-full font-main">
         {/* Change password */}
         <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-card-sm">
            <div className="p-4 border-b border-gray-100 md:p-8">
               <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
                  Settings
               </h1>
               <p className="mt-0.5 text-sm text-gray-500">
                  Security and general preferences for your account.
               </p>
            </div>

            <div className="p-4 md:p-8">
               <h2 className="mb-1 text-base font-bold text-gray-900">
                  Change password
               </h2>
               <p className="mb-5 text-sm text-gray-500">
                  Use at least 8 characters with a mix of letters and numbers.
               </p>

               <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="grid gap-4 max-w-lg"
                  noValidate
               >
                  <Controller
                     control={control}
                     name="currentPassword"
                     render={({ field }) => (
                        <div>
                           <FieldLabel>Current password</FieldLabel>
                           <Input.Password
                              size="large"
                              placeholder="••••••••"
                              autoComplete="current-password"
                              {...field}
                              prefix={<LockOutlined className="text-gray-400" />}
                              className="rounded-lg"
                           />
                           <p className="mt-1.5 mb-0 text-xs text-gray-400">
                              Leave empty if you signed up with Google or
                              Facebook and haven&apos;t set a password yet.
                           </p>
                        </div>
                     )}
                  />

                  <Controller
                     control={control}
                     name="newPassword"
                     rules={{
                        required: 'Please enter a new password',
                        validate: validatePassword,
                     }}
                     render={({ field }) => (
                        <div>
                           <FieldLabel>New password</FieldLabel>
                           <Input.Password
                              size="large"
                              placeholder="••••••••"
                              autoComplete="new-password"
                              {...field}
                              status={errors.newPassword && 'error'}
                              prefix={<LockOutlined className="text-gray-400" />}
                              className="rounded-lg"
                           />
                           {errors.newPassword && (
                              <span className="block mt-1.5 text-xs text-red-500">
                                 {errors.newPassword.message}
                              </span>
                           )}
                           <PasswordStrength value={newPassword} className="mt-3" />
                        </div>
                     )}
                  />

                  <Controller
                     control={control}
                     name="confirmPassword"
                     rules={{
                        required: 'Please confirm your new password',
                        validate: (value, values) =>
                           value === values.newPassword || 'Passwords do not match',
                     }}
                     render={({ field }) => (
                        <div>
                           <FieldLabel>Confirm new password</FieldLabel>
                           <Input.Password
                              size="large"
                              placeholder="••••••••"
                              autoComplete="new-password"
                              {...field}
                              status={errors.confirmPassword && 'error'}
                              prefix={<LockOutlined className="text-gray-400" />}
                              className="rounded-lg"
                           />
                           {errors.confirmPassword && (
                              <span className="block mt-1.5 text-xs text-red-500">
                                 {errors.confirmPassword.message}
                              </span>
                           )}
                        </div>
                     )}
                  />

                  {changePasswordMutation.isError && (
                     <div className="flex gap-2 items-start px-3.5 py-3 text-sm text-rose-600 bg-rose-50 rounded-xl border border-rose-100">
                        <FiAlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        <span>
                           {getApiErrorMessage(
                              changePasswordMutation.error,
                              'Could not update your password. Please try again.',
                           )}
                        </span>
                     </div>
                  )}

                  <div>
                     <Button
                        type="primary"
                        htmlType="submit"
                        loading={changePasswordMutation.isPending}
                        className="mt-1 w-full h-10 bg-blue-500 rounded-full sm:px-7 sm:w-auto"
                     >
                        Update password
                     </Button>
                  </div>
               </form>

               <div className="pt-8 mt-8 border-t border-gray-100">
                  <h2 className="mb-4 text-base font-bold text-gray-900">
                     Preferences
                  </h2>
                  <div className="grid gap-4 max-w-lg sm:grid-cols-2">
                     <div>
                        <FieldLabel>Language</FieldLabel>
                        <Select
                           size="large"
                           className="w-full"
                           defaultValue="en"
                           options={[
                              { value: 'en', label: 'English' },
                              { value: 'vi', label: 'Tiếng Việt' },
                           ]}
                        />
                     </div>
                     <div>
                        <FieldLabel>Currency</FieldLabel>
                        <Select
                           size="large"
                           className="w-full"
                           defaultValue="vnd"
                           options={[
                              { value: 'vnd', label: 'VND — Vietnamese Dong' },
                              { value: 'usd', label: 'USD — US Dollar' },
                           ]}
                        />
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Danger zone */}
         <div className="overflow-hidden bg-white rounded-2xl border border-rose-100 shadow-card-sm">
            <div className="flex flex-wrap gap-4 justify-between items-center p-4 md:p-8">
               <div className="flex gap-3 items-start min-w-0">
                  <span className="flex flex-shrink-0 justify-center items-center w-10 h-10 text-rose-500 bg-rose-50 rounded-xl">
                     <WarningOutlined />
                  </span>
                  <div>
                     <h2 className="text-base font-bold text-gray-900">
                        Delete account
                     </h2>
                     <p className="mt-0.5 max-w-md text-sm text-gray-500">
                        Permanently remove your account and all data. This
                        action cannot be undone.
                     </p>
                  </div>
               </div>
               <Popconfirm
                  title="Delete your account?"
                  description="This cannot be undone."
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() =>
                     message.info('Account deletion is coming soon')
                  }
               >
                  <Button danger className="w-full h-10 rounded-full sm:w-auto">
                     Delete account
                  </Button>
               </Popconfirm>
            </div>
         </div>
      </div>
   );
};

export default AccountSettings;
