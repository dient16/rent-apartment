import React from 'react';
import { message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IoHeartSharp, IoHeartOutline } from 'react-icons/io5';
import clsx from 'clsx';
import { apiToggleFavorite } from '@/apis';
import { useAuth } from '@/hooks';

interface FavoriteButtonProps {
   apartmentId: string;
   size?: number;
   className?: string;
}

/** Nut tim dung chung: tu biet trang thai tu user.favorites, tu invalidate cache sau khi toggle. */
const FavoriteButton: React.FC<FavoriteButtonProps> = ({
   apartmentId,
   size = 20,
   className,
}) => {
   const queryClient = useQueryClient();
   const { isAuthenticated, user, setAuthModal } = useAuth();
   const isFavorited = !!user?.favorites?.includes(apartmentId);

   const toggleMutation = useMutation({
      mutationFn: () => apiToggleFavorite(apartmentId),
      onSuccess: (response) => {
         if (response.success) {
            message.success(response.message);
            queryClient.invalidateQueries({ queryKey: ['currentUser'] });
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
         } else {
            message.error(response.message);
         }
      },
   });

   const handleToggle = (event: React.MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      if (!isAuthenticated) {
         message.info('Please sign in to save your favorite stays');
         setAuthModal({ isOpen: true, activeTab: 'signin' });
         return;
      }
      toggleMutation.mutate();
   };

   return (
      <button
         type="button"
         aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
         onClick={handleToggle}
         disabled={toggleMutation.isPending}
         className={clsx(
            'flex justify-center items-center rounded-full border-none cursor-pointer transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-card-sm hover:scale-110 disabled:opacity-60',
            className,
         )}
         style={{ width: size * 2, height: size * 2 }}
      >
         {isFavorited ? (
            <IoHeartSharp size={size} className="text-rose-500" />
         ) : (
            <IoHeartOutline size={size} className="text-gray-600" />
         )}
      </button>
   );
};

export default FavoriteButton;
