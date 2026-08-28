'use client';

import React, { useMemo, useState } from 'react';
import { Button, Input, Modal, Switch, message } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { FiCheck, FiSearch, FiUsers, FiX } from 'react-icons/fi';
import { apiChatCreateGroup, apiChatDirect, apiChatSearchUsers, type ChatUser } from '@/apis/chat.api';
import { UserAvatar } from '@/components';
import { useDebounce } from '@/hooks';

interface NewChatModalProps {
   open: boolean;
   onClose: () => void;
   onCreated: (roomId: string) => void;
   /** existing group: add members instead of creating */
   addToRoom?: { id: string; name: string; memberIds: string[] };
   onAddMembers?: (memberIds: string[]) => Promise<void>;
}

/** Member search + pick: 1 person -> direct chat, several (or the toggle) -> group. */
const NewChatModal: React.FC<NewChatModalProps> = ({ open, onClose, onCreated, addToRoom, onAddMembers }) => {
   const [query, setQuery] = useState('');
   const [picked, setPicked] = useState<ChatUser[]>([]);
   const [asGroup, setAsGroup] = useState(false);
   const [groupName, setGroupName] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const debounced = useDebounce(query, 300);

   const close = () => {
      setQuery('');
      setPicked([]);
      setAsGroup(false);
      setGroupName('');
      onClose();
   };

   const { data, isFetching } = useQuery({
      queryKey: ['chat-users', debounced],
      queryFn: () => apiChatSearchUsers(debounced),
      enabled: open && debounced.trim().length >= 1,
      staleTime: 60_000,
   });
   const excluded = useMemo(() => new Set(addToRoom?.memberIds ?? []), [addToRoom]);
   const results = (data?.data || []).filter((u) => !excluded.has(u._id));
   const isGroup = !!addToRoom || asGroup || picked.length > 1;

   const toggle = (user: ChatUser) =>
      setPicked((current) =>
         current.some((u) => u._id === user._id) ? current.filter((u) => u._id !== user._id) : [...current, user],
      );

   const submit = async () => {
      if (!picked.length) return;
      setSubmitting(true);
      try {
         if (addToRoom && onAddMembers) {
            await onAddMembers(picked.map((u) => u._id));
            close();
            return;
         }
         if (isGroup) {
            const name = groupName.trim();
            if (!name) {
               message.warning('Give the group a name');
               return;
            }
            const res = await apiChatCreateGroup(name, picked.map((u) => u._id));
            if (!res.success || !res.data) throw new Error(res.message);
            onCreated(res.data._id);
         } else {
            const res = await apiChatDirect(picked[0]._id);
            if (!res.success || !res.data) throw new Error(res.message);
            onCreated(res.data._id);
         }
         close();
      } catch (error) {
         message.error((error as Error).message || 'Could not create the chat');
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <Modal
         open={open}
         onCancel={close}
         footer={null}
         title={addToRoom ? `Add members to "${addToRoom.name}"` : 'New chat'}
         className="font-main"
         destroyOnHidden
      >
         <div className="flex flex-col gap-3 mt-2">
            {!addToRoom && (
               <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-xl">
                  <span className="flex gap-2 items-center text-sm text-gray-700">
                     <FiUsers /> Create a group
                  </span>
                  <Switch size="small" checked={isGroup} disabled={picked.length > 1} onChange={setAsGroup} />
               </div>
            )}
            {isGroup && !addToRoom && (
               <Input
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={80}
                  className="h-10 rounded-xl"
               />
            )}

            {picked.length > 0 && (
               <div className="flex flex-wrap gap-1.5">
                  {picked.map((u) => (
                     <span key={u._id} className="flex gap-1.5 items-center py-1 pr-1.5 pl-1 text-sm bg-blue-50 rounded-full">
                        <UserAvatar size={20} src={u.avatar} name={u.name} />
                        {u.name}
                        <button type="button" onClick={() => toggle(u)} className="flex items-center p-0.5 text-gray-500 bg-transparent border-none cursor-pointer hover:text-red-500" aria-label={`Remove ${u.name}`}>
                           <FiX size={14} />
                        </button>
                     </span>
                  ))}
               </div>
            )}

            <Input
               autoFocus
               prefix={<FiSearch className="text-gray-400" />}
               placeholder="Search members by name or email"
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               className="h-11 rounded-xl"
               allowClear
            />

            <div className="overflow-y-auto -mx-2 max-h-72">
               {isFetching && <p className="px-4 py-3 text-sm text-gray-400">Searching…</p>}
               {!isFetching && debounced && results.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-400">No one matches “{debounced}”.</p>
               )}
               {results.map((u) => {
                  const selected = picked.some((p) => p._id === u._id);
                  return (
                     <button
                        key={u._id}
                        type="button"
                        onClick={() => toggle(u)}
                        className="flex gap-3 items-center px-4 py-2 w-full text-left bg-transparent border-none cursor-pointer hover:bg-gray-50"
                     >
                        <UserAvatar size={36} src={u.avatar} name={u.name} />
                        <span className="flex-1 min-w-0">
                           <span className="block text-sm font-semibold text-gray-900 truncate">{u.name}</span>
                           <span className="block text-xs text-gray-400 truncate">{u.email}</span>
                        </span>
                        <span
                           className={`flex justify-center items-center w-6 h-6 rounded-full border ${
                              selected ? 'text-white bg-blue-600 border-blue-600' : 'border-gray-300'
                           }`}
                        >
                           {selected && <FiCheck size={14} />}
                        </span>
                     </button>
                  );
               })}
            </div>

            <Button
               type="primary"
               size="large"
               block
               loading={submitting}
               disabled={!picked.length}
               onClick={submit}
               className={`h-11 font-semibold rounded-xl ${picked.length ? 'bg-gradient-to-r from-blue-600 to-indigo-500 shadow-md shadow-blue-200' : ''}`}
            >
               {addToRoom
                  ? `Add ${picked.length || ''} member${picked.length === 1 ? '' : 's'}`
                  : isGroup
                    ? `Create group (${picked.length + 1})`
                    : picked[0]
                      ? `Chat with ${picked[0].name}`
                      : 'Pick someone'}
            </Button>
         </div>
      </Modal>
   );
};

export default NewChatModal;
