import React, { useState } from 'react';
import { Avatar, Button, DatePicker, Input, Select, Skeleton, message, Upload } from 'antd';
import {
   UserOutlined,
   EditOutlined,
   CameraOutlined,
   MailOutlined,
   PhoneOutlined,
   CalendarOutlined,
   GlobalOutlined,
   HomeOutlined,
   IdcardOutlined,
   ManOutlined,
   CheckCircleFilled,
   CloseOutlined,
   SaveOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { apiEditUser, apiGetCurrentUser } from '@/apis';
import moment from 'moment';
import dayjs from 'dayjs';
import { RcFile } from 'antd/es/upload';
import type { UploadFile } from 'antd/es/upload/interface';
import FullscreenLoader from '@/components/FullscreenLoader/FullscreenLoader';

interface FieldTileProps {
   icon: React.ReactNode;
   label: string;
   value?: React.ReactNode;
   /** Long values (email, address) take the full row on mobile so they never wrap mid-word. */
   wide?: boolean;
}

/** Read-mode info tile: square icon + uppercase label + value */
const FieldTile: React.FC<FieldTileProps> = ({ icon, label, value, wide }) => (
   <div
      className={`flex gap-2.5 items-start min-w-0 md:gap-4 ${
         wide ? 'col-span-2 md:col-span-1' : ''
      }`}
   >
      <span className="flex flex-shrink-0 justify-center items-center w-9 h-9 text-sm text-gray-500 bg-gray-100 rounded-xl md:w-11 md:h-11 md:text-lg">
         {icon}
      </span>
      <div className="min-w-0">
         <p className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase md:text-xs">
            {label}
         </p>
         <p className="mt-0.5 text-sm font-semibold text-gray-900 break-words md:mt-1">
            {value || <span className="font-normal text-gray-400">—</span>}
         </p>
      </div>
   </div>
);

const inputClass = 'h-10 rounded-lg';

/** Mirrors the read-mode card while the profile loads (no fullscreen spinner). */
const ProfileSkeleton: React.FC = () => (
   <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-card-sm">
      <div className="flex gap-3 justify-between items-center p-4 border-b border-gray-100 md:p-8">
         <div className="flex gap-3 items-center sm:gap-5">
            <Skeleton.Avatar active size={56} />
            <div className="flex flex-col gap-2">
               <Skeleton.Input active size="small" className="w-36! h-5! min-w-0!" />
               <Skeleton.Input active size="small" className="w-44! h-3! min-w-0!" />
            </div>
         </div>
         <Skeleton.Button active className="w-9! h-9! min-w-0! rounded-lg! sm:w-32! sm:h-10!" />
      </div>
      <div className="p-4 md:p-8">
         <Skeleton.Input active size="small" className="w-44! h-5! min-w-0!" />
         <div className="mt-2 mb-5">
            <Skeleton.Input active size="small" className="w-56! h-3.5! min-w-0!" />
         </div>
         <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:gap-x-10 md:gap-y-7">
            {Array.from({ length: 8 }).map((_, index) => (
               <div key={index} className="flex gap-2.5 items-start">
                  <Skeleton.Avatar active shape="square" size={36} className="rounded-xl!" />
                  <div className="flex flex-col gap-2 pt-0.5">
                     <Skeleton.Input active size="small" className="w-20! h-2.5! min-w-0!" />
                     <Skeleton.Input active size="small" className="w-36! h-4! min-w-0!" />
                  </div>
               </div>
            ))}
         </div>
      </div>
   </div>
);

const PersonalInformation: React.FC = () => {
   const [isEditing, setIsEditing] = useState<boolean>(false);
   const queryClient = useQueryClient();
   const editProfileMutator = useMutation({
      mutationFn: apiEditUser,
   });
   const {
      handleSubmit,
      control,
      reset,
      formState: { errors },
      getValues,
   } = useForm();
   const { data, isLoading } = useQuery({
      queryKey: ['userProfile'],
      queryFn: apiGetCurrentUser,
   });

   const handleEditUser = (
      data: Record<string, UploadFile | string | undefined>,
   ) => {
      const formData = new FormData();
      if (Array.isArray(data?.avatarEdit) && data.avatarEdit.length > 0) {
         delete (data as Record<string, string>).avatar;
      }
      Object.entries(data).forEach(
         ([key, value]: [string, UploadFile | string | undefined]) => {
            if (key === 'avatarEdit' && value) {
               const files: UploadFile[] = Array.isArray(value)
                  ? value
                  : [value as UploadFile];
               const fileToAppend =
                  files.length > 0
                     ? (files[0].originFileObj as File)
                     : undefined;
               if (fileToAppend) {
                  formData.append('avatar', fileToAppend);
               }
            } else if (value != null) {
               formData.append(key, value as string);
            }
         },
      );

      editProfileMutator.mutate(formData, {
         onSuccess: (response: Res) => {
            if (response.success) {
               message.success('Profile updated successfully');
               setIsEditing(false);
               queryClient.invalidateQueries({ queryKey: ['userProfile'] });
               queryClient.invalidateQueries({ queryKey: ['currentUser'] });
               reset();
            }
         },
         onError: () => {
            message.error('Edit profile failed');
         },
      });
   };

   const getBase64 = (file: RcFile): Promise<string> =>
      new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.readAsDataURL(file);
         reader.onload = () => resolve(reader.result as string);
         reader.onerror = (error) => reject(error);
      });

   const user = data?.data;
   const fullName =
      [user?.firstname, user?.lastname].filter(Boolean).join(' ') || 'Guest';
   const memberSince = user?.createdAt
      ? moment(user.createdAt).format('MMM YYYY')
      : 'N/A';

   /** Field config so both modes render consistently */
   const editableFields = [
      {
         name: 'firstname',
         label: 'First name',
         rules: { required: 'First name is required' },
      },
      {
         name: 'lastname',
         label: 'Last name',
         rules: { required: 'Last name is required' },
      },
      {
         name: 'email',
         label: 'Email address',
         rules: {
            required: 'Email is required',
            pattern: {
               value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
               message: 'Invalid email address',
            },
         },
      },
      {
         name: 'phone',
         label: 'Phone number',
         rules: {
            required: 'Phone is required',
            pattern: { value: /^0\d{9}$/, message: 'Invalid phone number' },
         },
      },
      { name: 'nationality', label: 'Nationality', rules: {} },
      { name: 'address', label: 'Address', rules: {} },
      { name: 'personalId', label: 'Personal ID', rules: {} },
   ];

   if (isLoading) {
      return (
         <div className="pb-10 w-full font-main">
            <ProfileSkeleton />
         </div>
      );
   }

   return (
      <>
         <FullscreenLoader spinning={editProfileMutator.isPending} />
         <div className="pb-6 w-full font-main md:pb-10">
            <form onSubmit={handleSubmit(handleEditUser)} className="w-full">
               <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                  {/* ===== Header ===== */}
                  <div className="flex gap-3 justify-between items-center p-4 border-b border-gray-100 sm:gap-5 md:p-8">
                     <div className="flex gap-3 items-center min-w-0 sm:gap-5">
                        <div className="relative flex-shrink-0">
                           {isEditing ? (
                              <Controller
                                 control={control}
                                 name="avatarEdit"
                                 render={({ field: { onChange, value } }) => (
                                    <Upload
                                       listType="picture-circle"
                                       className="avatar-uploader"
                                       accept="image/*"
                                       showUploadList={false}
                                       customRequest={() => {}}
                                       fileList={
                                          typeof value === 'string'
                                             ? null
                                             : value
                                       }
                                       onChange={({ fileList }) => {
                                          (async () => {
                                             fileList[0].thumbUrl =
                                                await getBase64(
                                                   fileList[0]
                                                      .originFileObj as RcFile,
                                                );
                                             onChange(fileList);
                                          })();
                                       }}
                                       maxCount={1}
                                    >
                                       <div className="relative cursor-pointer group">
                                          <Avatar
                                             size={84}
                                             src={
                                                getValues('avatarEdit')?.[0]
                                                   ?.thumbUrl || user?.avatar
                                             }
                                             icon={<UserOutlined />}
                                          />
                                          <span className="flex absolute inset-0 justify-center items-center text-white rounded-full opacity-0 transition-opacity bg-black/40 group-hover:opacity-100">
                                             <CameraOutlined className="text-xl" />
                                          </span>
                                       </div>
                                    </Upload>
                                 )}
                              />
                           ) : (
                              <>
                                 <Avatar
                                    size={56}
                                    src={user?.avatar}
                                    icon={<UserOutlined />}
                                    className="border-2 border-white shadow-card-sm md:w-[84px]! md:h-[84px]!"
                                 />
                                 <CheckCircleFilled className="absolute right-0 bottom-0 text-base text-green-500 bg-white rounded-full md:text-lg" />
                              </>
                           )}
                        </div>
                        <div className="min-w-0">
                           <div className="flex flex-wrap gap-2 items-center">
                              <h1 className="text-lg font-bold text-gray-900 truncate md:text-2xl">
                                 {fullName}
                              </h1>
                              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider text-blue-600 uppercase bg-blue-50 rounded-md md:px-2.5 md:text-[11px]">
                                 Member
                              </span>
                           </div>
                           {/* Mobile: two short lines; desktop: one line */}
                           <p className="mt-0.5 text-xs text-gray-500 md:mt-1 md:text-sm">
                              Member since {memberSince}
                              <span className="hidden md:inline"> · {user?.email}</span>
                           </p>
                           <p className="text-xs text-gray-500 break-all md:hidden">
                              {user?.email}
                           </p>
                        </div>
                     </div>

                     {!isEditing ? (
                        <Button
                           type="primary"
                           icon={<EditOutlined />}
                           aria-label="Edit profile"
                           className="flex-shrink-0 h-9 bg-blue-500 rounded-lg sm:h-10"
                           onClick={() => setIsEditing(true)}
                        >
                           <span className="hidden sm:inline">Edit Profile</span>
                        </Button>
                     ) : (
                        <div className="flex flex-shrink-0 gap-2 sm:gap-3">
                           <Button
                              icon={<CloseOutlined />}
                              aria-label="Cancel"
                              className="h-9 rounded-lg sm:h-10"
                              onClick={() => {
                                 setIsEditing(false);
                                 reset();
                              }}
                           >
                              <span className="hidden sm:inline">Cancel</span>
                           </Button>
                           <Button
                              type="primary"
                              htmlType="submit"
                              icon={<SaveOutlined />}
                              aria-label="Save changes"
                              loading={editProfileMutator.isPending}
                              className="h-9 bg-blue-500 rounded-lg sm:h-10"
                           >
                              <span className="hidden sm:inline">Save changes</span>
                           </Button>
                        </div>
                     )}
                  </div>

                  {/* ===== Body ===== */}
                  <div className="p-4 md:p-8">
                     <h2 className="text-base font-bold text-gray-900 md:text-lg">
                        Personal Information
                     </h2>
                     <p className="mt-0.5 mb-4 text-sm text-gray-500 md:mb-7">
                        Your account and contact details.
                     </p>

                     {!isEditing ? (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-4 md:gap-x-10 md:gap-y-7">
                           <FieldTile
                              icon={<UserOutlined />}
                              label="Name"
                              value={fullName}
                           />
                           <FieldTile
                              icon={<MailOutlined />}
                              label="Email address"
                              value={user?.email}
                              wide
                           />
                           <FieldTile
                              icon={<PhoneOutlined />}
                              label="Phone number"
                              value={user?.phone}
                           />
                           <FieldTile
                              icon={<CalendarOutlined />}
                              label="Date of birth"
                              value={
                                 user?.dateOfBirth
                                    ? moment(user.dateOfBirth).format(
                                         'DD MMM YYYY',
                                      )
                                    : undefined
                              }
                           />
                           <FieldTile
                              icon={<ManOutlined />}
                              label="Gender"
                              value={user?.gender}
                           />
                           <FieldTile
                              icon={<GlobalOutlined />}
                              label="Nationality"
                              value={user?.nationality}
                           />
                           <FieldTile
                              icon={<HomeOutlined />}
                              label="Address"
                              value={user?.address}
                              wide
                           />
                           <FieldTile
                              icon={<IdcardOutlined />}
                              label="Personal ID"
                              value={user?.personalId}
                           />
                        </div>
                     ) : (
                        <div className="grid gap-4 md:grid-cols-2 md:gap-x-8 md:gap-y-5">
                           {editableFields.map((fieldConfig) => (
                              <Controller
                                 key={fieldConfig.name}
                                 control={control}
                                 name={fieldConfig.name}
                                 defaultValue={user?.[fieldConfig.name]}
                                 rules={fieldConfig.rules}
                                 render={({ field }) => (
                                    <div className="flex flex-col gap-1.5">
                                       <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                          {fieldConfig.label}
                                       </label>
                                       <Input
                                          {...field}
                                          className={inputClass}
                                          status={
                                             errors?.[fieldConfig.name] &&
                                             'error'
                                          }
                                       />
                                       {errors?.[fieldConfig.name] && (
                                          <span className="text-xs text-red-600">
                                             {
                                                errors[fieldConfig.name]
                                                   ?.message as string
                                             }
                                          </span>
                                       )}
                                    </div>
                                 )}
                              />
                           ))}

                           <Controller
                              control={control}
                              name="dateOfBirth"
                              defaultValue={
                                 user?.dateOfBirth
                                    ? dayjs(user.dateOfBirth)
                                    : undefined
                              }
                              render={({ field }) => (
                                 <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                       Date of birth
                                    </label>
                                    <DatePicker
                                       {...field}
                                       format="DD/MM/YYYY"
                                       className={`w-full ${inputClass}`}
                                    />
                                 </div>
                              )}
                           />

                           <Controller
                              control={control}
                              name="gender"
                              defaultValue={user?.gender}
                              render={({ field }) => (
                                 <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                       Gender
                                    </label>
                                    <Select
                                       {...field}
                                       className="h-10"
                                       placeholder="Select gender"
                                       options={[
                                          { value: 'Male', label: 'Male' },
                                          { value: 'Female', label: 'Female' },
                                          { value: 'Other', label: 'Other' },
                                       ]}
                                    />
                                 </div>
                              )}
                           />
                        </div>
                     )}
                  </div>
               </div>
            </form>
         </div>
      </>
   );
};

export default PersonalInformation;
