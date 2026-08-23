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

/**
 * Shared heart button. The toggle is optimistic: the `currentUser` cache flips
 * immediately so the heart responds on click, and the request settles in the
 * background. A failure rolls the cache back.
 */
const FavoriteButton: React.FC<FavoriteButtonProps> = ({
   apartmentId,
   size = 20,
   className,
}) => {
   const queryClient = useQueryClient();
   const { isAuthenticated, user, setAuthModal } = useAuth();
   const isFavorited = !!user?.favorites?.includes(apartmentId);

   const toggleMutation = useMutation({
      mutationKey: ['toggle-favorite', apartmentId],
      mutationFn: () => apiToggleFavorite(apartmentId),

      onMutate: async () => {
         // Stop an in-flight refetch from overwriting the optimistic value.
         await queryClient.cancelQueries({ queryKey: ['currentUser'] });
         const previousUser = queryClient.getQueryData(['currentUser']);
         const previousFavorites = queryClient.getQueriesData({
            queryKey: ['favorites'],
         });

         queryClient.setQueryData(['currentUser'], (old: any) => {
            if (!old?.data) return old;
            const favorites: string[] = old.data.favorites || [];
            return {
               ...old,
               data: {
                  ...old.data,
                  favorites: favorites.includes(apartmentId)
                     ? favorites.filter((id) => id !== apartmentId)
                     : [...favorites, apartmentId],
               },
            };
         });

         // On the favorites page, un-hearting should drop the card right away.
         if (isFavorited) {
            queryClient.setQueriesData({ queryKey: ['favorites'] }, (old: any) => {
               if (!old?.data?.favorites) return old;
               return {
                  ...old,
                  data: {
                     ...old.data,
                     favorites: old.data.favorites.filter(
                        (apartment: { _id: string }) => apartment._id !== apartmentId,
                     ),
                  },
               };
            });
         }

         return { previousUser, previousFavorites };
      },

      onError: (_error, _variables, context) => {
         if (context?.previousUser) {
            queryClient.setQueryData(['currentUser'], context.previousUser);
         }
         context?.previousFavorites?.forEach(([key, value]) =>
            queryClient.setQueryData(key, value),
         );
         message.error('Could not update your favorites, please try again');
      },

      onSettled: () => {
         // Reconcile only after the last click lands — otherwise a quick
         // double-toggle gets clobbered by the first response's refetch.
         const stillRunning = queryClient.isMutating({
            mutationKey: ['toggle-favorite', apartmentId],
         });
         if (stillRunning > 1) return;
         queryClient.invalidateQueries({ queryKey: ['currentUser'] });
         queryClient.invalidateQueries({ queryKey: ['favorites'] });
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
         className={clsx(
            'flex justify-center items-center rounded-full border-none cursor-pointer transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-card-sm hover:scale-110 active:scale-90',
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
