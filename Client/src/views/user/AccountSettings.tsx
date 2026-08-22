import React from 'react';
import { Button, Input, Popconfirm, Select, message } from 'antd';
import { LockOutlined, WarningOutlined } from '@ant-design/icons';

/** Account settings UI — backend not wired yet, buttons are visual only */
const AccountSettings: React.FC = () => {
   return (
      <div className="space-y-6 w-full font-main">
         {/* Change password */}
         <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-card-sm">
            <div className="p-6 border-b border-gray-100 md:p-8">
               <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
                  Settings
               </h1>
               <p className="mt-0.5 text-sm text-gray-500">
                  Security and general preferences for your account.
               </p>
            </div>

            <div className="p-6 md:p-8">
               <h2 className="mb-4 text-base font-bold text-gray-900">
                  Change password
               </h2>
               <div className="grid gap-4 max-w-lg">
                  {['Current password', 'New password', 'Confirm new password'].map(
                     (label) => (
                        <div key={label}>
                           <label className="block mb-1.5 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                              {label}
                           </label>
                           <Input.Password
                              size="large"
                              placeholder="••••••••"
                              prefix={<LockOutlined className="text-gray-400" />}
                              className="rounded-lg"
                           />
                        </div>
                     ),
                  )}
               </div>
               <Button
                  type="primary"
                  className="px-7 mt-5 h-10 bg-blue-500 rounded-full"
                  onClick={() =>
                     message.info('Changing password is coming soon')
                  }
               >
                  Update password
               </Button>

               <div className="pt-8 mt-8 border-t border-gray-100">
                  <h2 className="mb-4 text-base font-bold text-gray-900">
                     Preferences
                  </h2>
                  <div className="grid gap-4 max-w-lg sm:grid-cols-2">
                     <div>
                        <label className="block mb-1.5 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                           Language
                        </label>
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
                        <label className="block mb-1.5 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                           Currency
                        </label>
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
            <div className="flex flex-wrap gap-4 justify-between items-center p-6 md:p-8">
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
                  <Button danger className="h-10 rounded-full">
                     Delete account
                  </Button>
               </Popconfirm>
            </div>
         </div>
      </div>
   );
};

export default AccountSettings;
