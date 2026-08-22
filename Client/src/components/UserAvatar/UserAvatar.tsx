import React from 'react';
import { Avatar } from 'antd';
import type { AvatarProps } from 'antd';

interface UserAvatarProps extends Omit<AvatarProps, 'src'> {
   src?: string | null;
   name?: string | null;
}

/** Bang mau nen cho avatar chu cai dau — chon theo hash ten de moi user 1 mau on dinh */
const PALETTE = [
   '#3b82f6', // blue
   '#8b5cf6', // violet
   '#ec4899', // pink
   '#f59e0b', // amber
   '#10b981', // emerald
   '#06b6d4', // cyan
   '#f97316', // orange
   '#6366f1', // indigo
];

const colorFor = (name: string) => {
   let hash = 0;
   for (let index = 0; index < name.length; index++) {
      hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
   }
   return PALETTE[hash % PALETTE.length];
};

/**
 * Avatar dung chung: co anh thi hien anh; khong co anh / anh loi
 * -> hien chu cai dau tren nen mau (khong bao gio trong tron).
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
   src,
   name,
   style,
   ...rest
}) => {
   const displayName = (name || '').trim();
   const initial = displayName ? displayName[0].toUpperCase() : '?';
   const background = colorFor(displayName || '?');

   return (
      <Avatar
         {...rest}
         src={src || undefined}
         style={{
            backgroundColor: background,
            color: '#fff',
            fontWeight: 600,
            ...style,
         }}
      >
         {initial}
      </Avatar>
   );
};

export default UserAvatar;
