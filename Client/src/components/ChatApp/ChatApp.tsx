'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Drawer, Empty, Image, Input, Popconfirm, Popover, Skeleton, Tooltip, message as toast } from 'antd';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import moment from 'moment';
import {
   FiArrowLeft,
   FiCheck,
   FiCornerUpLeft,
   FiEdit2,
   FiImage,
   FiLock,
   FiLogOut,
   FiMessageCircle,
   FiPlus,
   FiRotateCcw,
   FiSearch,
   FiSend,
   FiShield,
   FiSmile,
   FiUserPlus,
   FiUsers,
   FiX,
} from 'react-icons/fi';
import { PiStickerBold } from 'react-icons/pi';
import {
   apiChatAddMembers,
   apiChatMarkRead,
   apiChatMessages,
   apiChatReact,
   apiChatRecall,
   apiChatRemoveMember,
   apiChatRenameGroup,
   apiChatRooms,
   apiChatSend,
   apiChatSendImage,
   apiChatSendSticker,
   apiChatSetRole,
   type ChatMessage,
   type ChatRoom,
} from '@/apis/chat.api';
import { UserAvatar } from '@/components';
import { useAuth, useLockBodyScroll } from '@/hooks';
import { connectSocket, getSocket } from '@/lib/socket';
import { useSearchParams } from '@/lib/router-compat';
import NewChatModal from './NewChatModal';
import StickerPicker, { stickerUrl } from './StickerPicker';
import { showChatNotification } from './useChatNotifications';

const ROOMS_KEY = ['chat-rooms'];
const messagesKey = (roomId: string) => ['chat-messages', roomId];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

const iconButton =
   'flex flex-shrink-0 justify-center items-center rounded-full border-none bg-transparent transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

const RoomAvatar: React.FC<{ room: ChatRoom; size?: number }> = ({ room, size = 44 }) =>
   room.type === 'direct' ? (
      <UserAvatar size={size} src={room.avatar} name={room.name} />
   ) : (
      <span
         className="flex flex-shrink-0 justify-center items-center text-white bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 rounded-full shadow-sm ring-2 ring-white"
         style={{ width: size, height: size }}
      >
         <FiUsers size={Math.round(size * 0.42)} />
      </span>
   );

const previewOf = (room: ChatRoom) => {
   const last = room.lastMessage;
   if (!last) return 'Say hello 👋';
   if (last.type === 'system' || last.recalled) return last.content;
   const who = last.isMine ? 'You' : last.senderName.split(' ')[0];
   return `${who}: ${last.content}`;
};

const notificationBody = (message: ChatMessage) =>
   message.type === 'image' ? '📷 Photo' : message.type === 'sticker' ? '🙂 Sticker' : message.content;

/** Standalone chat: direct + group rooms, stickers, photos, recall, roles, browser notifications. */
const ChatApp: React.FC = () => {
   const queryClient = useQueryClient();
   const { user } = useAuth();
   const [searchParams, setSearchParams] = useSearchParams();
   const selectedId = searchParams.get('r');
   const selectedIdRef = useRef(selectedId);
   useEffect(() => {
      selectedIdRef.current = selectedId;
   }, [selectedId]);
   const [filter, setFilter] = useState('');
   const [draft, setDraft] = useState('');
   const [newOpen, setNewOpen] = useState(false);
   const [addOpen, setAddOpen] = useState(false);
   const [membersOpen, setMembersOpen] = useState(false);
   const [emojiOpen, setEmojiOpen] = useState(false);
   const [stickerOpen, setStickerOpen] = useState(false);
   const [renaming, setRenaming] = useState(false);
   const [nameDraft, setNameDraft] = useState('');
   const [uploading, setUploading] = useState(false);
   const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
   const [reactOpenFor, setReactOpenFor] = useState<string | null>(null);
   const [typing, setTyping] = useState<Record<string, { name: string; until: number }>>({});
   const listRef = useRef<HTMLDivElement>(null);
   const fileRef = useRef<HTMLInputElement>(null);
   const prevBottomOffsetRef = useRef<number | null>(null);
   const typingActiveRef = useRef(false);
   const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   useLockBodyScroll(true);

   /* ---------------- data ---------------- */

   const { data: roomsData, isLoading: roomsLoading } = useQuery({ queryKey: ROOMS_KEY, queryFn: apiChatRooms, refetchInterval: 20_000 });
   const rooms: ChatRoom[] = useMemo(() => roomsData?.data?.rooms || [], [roomsData]);
   const room = rooms.find((r) => r._id === selectedId) || null;

   const { data: messagesData, isLoading: messagesLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
      queryKey: messagesKey(selectedId || ''),
      queryFn: ({ pageParam }) => apiChatMessages(selectedId as string, pageParam),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => (last?.data?.hasMore ? last.data.messages?.[0]?._id : undefined),
      enabled: !!selectedId,
   });
   const messages: ChatMessage[] = useMemo(
      () => [...(messagesData?.pages || [])].reverse().flatMap((p) => p?.data?.messages || []),
      [messagesData],
   );

   const invalidateRoom = useCallback(
      (roomId: string) => {
         queryClient.invalidateQueries({ queryKey: messagesKey(roomId) });
         queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
      },
      [queryClient],
   );

   const afterSend = (res: Res<ChatMessage>) => {
      if (!res.success) {
         toast.error(res.message || 'Not sent');
         return;
      }
      invalidateRoom(selectedId as string);
   };
   const sendText = useMutation({
      mutationFn: ({ content, replyTo: quoted }: { content: string; replyTo?: string }) => apiChatSend(selectedId as string, content, quoted),
      onSuccess: afterSend,
   });
   const sendSticker = useMutation({
      mutationFn: ({ id, replyTo: quoted }: { id: string; replyTo?: string }) => apiChatSendSticker(selectedId as string, id, quoted),
      onSuccess: afterSend,
   });
   const react = useMutation({
      mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) => apiChatReact(messageId, emoji),
      onSuccess: (res) => {
         if (!res.success) return toast.error(res.message || 'Could not react');
         queryClient.invalidateQueries({ queryKey: messagesKey(selectedId as string) });
      },
   });
   const recall = useMutation({
      mutationFn: (messageId: string) => apiChatRecall(messageId),
      onSuccess: (res) => {
         if (!res.success) return toast.error(res.message || 'Could not recall');
         invalidateRoom(selectedId as string);
      },
   });

   /* ---------------- realtime + browser notifications ---------------- */

   const open = useCallback(
      (roomId: string | null) => {
         setDraft('');
         setReplyTo(null);
         setMembersOpen(false);
         setSearchParams(roomId ? { r: roomId } : {});
      },
      [setSearchParams],
   );

   /** Jump to a quoted message if it is on screen (loaded) */
   const jumpTo = (messageId: string) => {
      const el = listRef.current?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);
      if (!el) return toast.info('That message is further up - scroll to load it');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('chat-highlight');
      setTimeout(() => el.classList.remove('chat-highlight'), 1600);
   };

   useEffect(() => {
      const socket = getSocket() || connectSocket();
      if (!socket) return;
      const onMessage = (payload: { roomId: string; message: ChatMessage; recalled?: boolean; reaction?: boolean }) => {
         setTyping((t) => {
            if (!t[payload.roomId]) return t;
            const next = { ...t };
            delete next[payload.roomId];
            return next;
         });
         invalidateRoom(payload.roomId);
         // Alert when the tab is hidden or the message belongs to another room
         const { message } = payload;
         if (payload.recalled || payload.reaction || message.type === 'system' || !message.sender) return;
         if (!document.hidden && selectedIdRef.current === payload.roomId) return;
         const cached = queryClient.getQueryData<Res<{ rooms: ChatRoom[] }>>(ROOMS_KEY);
         const target = cached?.data?.rooms.find((r) => r._id === payload.roomId);
         const title = target?.type === 'group' ? `${message.sender.name} · ${target.name}` : message.sender.name;
         showChatNotification({ title, body: notificationBody(message), icon: message.sender.avatar, roomId: payload.roomId, onOpen: open });
      };
      const onRoom = () => queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
      const onTyping = (payload: { roomId: string; name: string; isTyping: boolean }) => {
         setTyping((t) => {
            const next = { ...t };
            if (payload.isTyping) next[payload.roomId] = { name: payload.name, until: Date.now() + 5000 };
            else delete next[payload.roomId];
            return next;
         });
      };
      socket.on('chat:message', onMessage);
      socket.on('chat:room', onRoom);
      socket.on('chat:typing', onTyping);
      return () => {
         socket.off('chat:message', onMessage);
         socket.off('chat:room', onRoom);
         socket.off('chat:typing', onTyping);
      };
   }, [invalidateRoom, queryClient, open]);

   useEffect(() => {
      const timer = setInterval(() => {
         setTyping((t) => {
            const now = Date.now();
            const next = Object.fromEntries(Object.entries(t).filter(([, v]) => v.until > now));
            return Object.keys(next).length === Object.keys(t).length ? t : next;
         });
      }, 1000);
      return () => clearInterval(timer);
   }, []);

   const emitTyping = (isTyping: boolean) => {
      const socket = getSocket();
      if (!socket || !room) return;
      socket.emit('chat:typing', {
         roomId: room._id,
         memberIds: room.members.map((m) => m._id).filter((id) => id !== user?._id),
         name: user?.firstname || 'Someone',
         isTyping,
      });
   };

   /* ---------------- read state + scrolling ---------------- */

   useEffect(() => {
      if (!selectedId) return;
      apiChatMarkRead(selectedId).then(() => queryClient.invalidateQueries({ queryKey: ROOMS_KEY }));
   }, [selectedId, messages.length, queryClient]);

   const newestId = messages[messages.length - 1]?._id;
   useEffect(() => {
      const el = listRef.current;
      if (!el) return;
      if (prevBottomOffsetRef.current !== null) {
         el.scrollTop = el.scrollHeight - prevBottomOffsetRef.current;
         prevBottomOffsetRef.current = null;
         return;
      }
      el.scrollTop = el.scrollHeight;
   }, [newestId, selectedId, typing]);

   const handleListScroll = () => {
      const el = listRef.current;
      if (!el || el.scrollTop > 80 || !hasNextPage || isFetchingNextPage) return;
      prevBottomOffsetRef.current = el.scrollHeight - el.scrollTop;
      fetchNextPage();
   };

   /* ---------------- actions ---------------- */

   const stopTyping = () => {
      typingActiveRef.current = false;
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
      emitTyping(false);
   };

   const handleSend = () => {
      const content = draft.trim();
      if (!content || !selectedId || sendText.isPending) return;
      setDraft('');
      stopTyping();
      sendText.mutate({ content, replyTo: replyTo?._id });
      setReplyTo(null);
   };

   const handleDraftChange = (value: string) => {
      setDraft(value);
      if (!typingActiveRef.current) {
         typingActiveRef.current = true;
         emitTyping(true);
      }
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
      stopTypingTimerRef.current = setTimeout(() => {
         typingActiveRef.current = false;
         emitTyping(false);
      }, 2500);
   };

   const handleImage = async (file?: File) => {
      if (!file || !selectedId) return;
      if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) return toast.warning('JPG, PNG, GIF or WebP only');
      if (file.size > MAX_IMAGE_BYTES) return toast.warning('Image must be under 5 MB');
      setUploading(true);
      const quoted = replyTo?._id;
      setReplyTo(null);
      try {
         afterSend(await apiChatSendImage(selectedId, file, quoted));
      } finally {
         setUploading(false);
         if (fileRef.current) fileRef.current.value = '';
      }
   };

   const addMembers = async (memberIds: string[]) => {
      const res = await apiChatAddMembers(room!._id, memberIds);
      if (!res.success) throw new Error(res.message);
      invalidateRoom(room!._id);
   };

   const removeMember = async (userId: string) => {
      const res = await apiChatRemoveMember(room!._id, userId);
      if (!res.success) return toast.error(res.message || 'Could not remove member');
      toast.success(res.message);
      if (userId === user?._id) open(null);
      else invalidateRoom(room!._id);
   };

   const setRole = async (userId: string, role: 'admin' | 'member') => {
      const res = await apiChatSetRole(room!._id, userId, role);
      if (!res.success) return toast.error(res.message || 'Could not change role');
      invalidateRoom(room!._id);
   };

   const rename = async () => {
      const name = nameDraft.trim();
      setRenaming(false);
      if (!name || !room || name === room.name) return;
      const res = await apiChatRenameGroup(room._id, name);
      if (!res.success) return toast.error(res.message || 'Could not rename');
      toast.success('Group renamed');
      invalidateRoom(room._id);
   };

   const isOwner = room?.myRole === 'owner';
   const canManage = isOwner || room?.myRole === 'admin';
   const visibleRooms = rooms.filter((r) => !filter || (r.name || '').toLowerCase().includes(filter.toLowerCase()));
   const typingNow = selectedId ? typing[selectedId] : undefined;
   const partner = room?.type === 'direct' ? room.members.find((m) => m._id !== user?._id) : undefined;

   /* ---------------- render ---------------- */

   const renderQuote = (m: ChatMessage) =>
      m.replyTo ? (
         <button
            type="button"
            onClick={() => jumpTo(m.replyTo!._id)}
            className={clsx(
               'flex flex-col mb-1 px-3 py-1.5 w-full max-w-full text-left rounded-xl border-l-4 cursor-pointer',
               m.isMine ? 'text-blue-50 bg-white/15 border-white/60' : 'text-gray-600 bg-gray-100 border-blue-400',
            )}
         >
            <span className={clsx('text-[11px] font-semibold', m.isMine ? 'text-white' : 'text-blue-600')}>{m.replyTo.senderName}</span>
            <span className={clsx('text-xs truncate', m.replyTo.recalled && 'italic')}>{m.replyTo.preview}</span>
         </button>
      ) : null;

   const renderReactions = (m: ChatMessage) =>
      m.reactions?.length ? (
         <div className={clsx('flex flex-wrap gap-1 -mt-2 relative z-10', m.isMine ? 'justify-end mr-1' : 'ml-1')}>
            {m.reactions.map((r) => (
               <button
                  key={r.emoji}
                  type="button"
                  onClick={() => react.mutate({ messageId: m._id, emoji: r.emoji })}
                  className={clsx(
                     'flex gap-0.5 items-center px-1.5 h-6 text-[12px] bg-white rounded-full border shadow-sm cursor-pointer transition-transform hover:scale-110',
                     r.mine ? 'border-blue-300' : 'border-gray-200',
                  )}
                  title={r.mine ? 'You reacted - click to remove' : 'React'}
               >
                  <span className="leading-none">{r.emoji}</span>
                  {r.count > 1 && <span className="font-semibold text-gray-600">{r.count}</span>}
               </button>
            ))}
         </div>
      ) : null;

   const renderBubble = (m: ChatMessage) => {
      if (m.recalled) {
         return (
            <div className="flex gap-1.5 items-center px-3.5 py-2 text-[13px] italic text-gray-400 bg-white rounded-2xl border border-gray-200 border-dashed">
               <FiRotateCcw size={12} /> Message recalled
            </div>
         );
      }
      if (m.type === 'sticker' && m.sticker) {
         // local static asset (animated webp) - next/image would re-encode it
         // eslint-disable-next-line @next/next/no-img-element
         return <img src={stickerUrl(m.sticker)} alt="sticker" className="w-32 h-32 object-contain drop-shadow-md" />;
      }
      if (m.type === 'image' && m.imageUrl) {
         return (
            <Image
               src={m.imageUrl}
               alt="photo"
               style={{ maxWidth: 280, maxHeight: 320, objectFit: 'cover' }}
               rootClassName="overflow-hidden rounded-2xl shadow-sm ring-1 ring-black/5"
            />
         );
      }
      return (
         <div
            className={clsx(
               'px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap rounded-2xl',
               m.isMine
                  ? 'text-white bg-gradient-to-br from-blue-600 to-indigo-500 rounded-br-md shadow-md shadow-blue-200/60'
                  : 'text-gray-800 bg-white rounded-bl-md shadow-sm ring-1 ring-black/5',
            )}
         >
            {renderQuote(m)}
            {m.content}
         </div>
      );
   };

   /** Hover actions next to a bubble: react, reply, recall (own) */
   const renderActions = (m: ChatMessage) =>
      m.recalled ? null : (
         <div className={clsx('flex flex-shrink-0 gap-0.5 items-center mb-1 opacity-0 transition-opacity group-hover/msg:opacity-100 [@media(hover:none)]:opacity-60', m.isMine ? 'flex-row-reverse' : '')}>
            <Popover
               open={reactOpenFor === m._id}
               onOpenChange={(v) => setReactOpenFor(v ? m._id : null)}
               trigger="click"
               placement="top"
               content={
                  <div className="flex gap-0.5">
                     {QUICK_REACTIONS.map((emoji) => (
                        <button key={emoji} type="button" onClick={() => { setReactOpenFor(null); react.mutate({ messageId: m._id, emoji }); }} className="flex justify-center items-center w-8 h-8 text-lg bg-transparent rounded-full border-none transition-transform cursor-pointer hover:scale-125 hover:bg-gray-100">
                           {emoji}
                        </button>
                     ))}
                  </div>
               }
            >
               <button type="button" className={`${iconButton} w-7 h-7 text-gray-400 hover:bg-white hover:text-amber-500`} aria-label="React"><FiSmile size={14} /></button>
            </Popover>
            <button type="button" onClick={() => setReplyTo(m)} className={`${iconButton} w-7 h-7 text-gray-400 hover:bg-white hover:text-blue-600`} aria-label="Reply"><FiCornerUpLeft size={14} /></button>
            {m.isMine && (
               <Popconfirm title="Recall this message for everyone?" okText="Recall" okButtonProps={{ danger: true }} onConfirm={() => recall.mutate(m._id)}>
                  <button type="button" className={`${iconButton} w-7 h-7 text-gray-400 hover:bg-white hover:text-red-500`} aria-label="Recall"><FiRotateCcw size={14} /></button>
               </Popconfirm>
            )}
         </div>
      );

   return (
      <div className="mx-auto w-full h-full max-w-main md:px-4 md:py-4 lg:px-7">
         <div className="flex overflow-hidden h-full bg-white md:rounded-3xl md:border md:border-gray-100 md:shadow-xl md:shadow-gray-200/60">
            {/* ===== Rooms ===== */}
            <aside className={clsx('flex-col flex-shrink-0 w-full bg-white md:flex md:w-[340px] md:border-r md:border-gray-100', selectedId ? 'hidden' : 'flex')}>
               <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                     <div>
                        <h1 className="text-lg font-bold tracking-tight text-gray-900">Chats</h1>
                        <p className="text-xs text-gray-400">{rooms.length} conversation{rooms.length === 1 ? '' : 's'}</p>
                     </div>
                     <Tooltip title="New chat or group">
                        <button
                           type="button"
                           onClick={() => setNewOpen(true)}
                           className={`${iconButton} w-10 h-10 text-white bg-gradient-to-br from-blue-600 to-indigo-500 shadow-md shadow-blue-200 hover:opacity-90`}
                           aria-label="New chat"
                        >
                           <FiPlus size={18} />
                        </button>
                     </Tooltip>
                  </div>
                  <Input
                     allowClear
                     prefix={<FiSearch className="text-gray-400" />}
                     placeholder="Search chats"
                     className="h-10 bg-gray-100 rounded-full border-none"
                     value={filter}
                     onChange={(e) => setFilter(e.target.value)}
                  />
               </div>
               <div className="overflow-y-auto flex-1 px-2 py-2 nice-scrollbar">
                  {roomsLoading ? (
                     <div className="p-4 space-y-4">
                        <Skeleton active avatar paragraph={{ rows: 1 }} />
                        <Skeleton active avatar paragraph={{ rows: 1 }} />
                        <Skeleton active avatar paragraph={{ rows: 1 }} />
                     </div>
                  ) : visibleRooms.length === 0 ? (
                     <Empty className="py-16" image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-gray-400">No chats yet — start one with +</span>} />
                  ) : (
                     visibleRooms.map((r) => {
                        const active = r._id === selectedId;
                        const isTyping = !!typing[r._id];
                        return (
                           <button
                              key={r._id}
                              type="button"
                              onClick={() => open(r._id)}
                              className={clsx(
                                 'flex relative gap-3 items-center px-3 py-2.5 mb-1 w-full text-left bg-transparent rounded-2xl border-none transition-colors cursor-pointer',
                                 active ? 'bg-blue-50/80' : 'hover:bg-gray-50',
                              )}
                           >
                              {active && <span className="absolute left-0 top-1/2 w-1 h-8 bg-blue-500 rounded-full -translate-y-1/2" />}
                              <RoomAvatar room={r} size={46} />
                              <span className="flex-1 min-w-0">
                                 <span className="flex justify-between items-center gap-2">
                                    <span className={clsx('text-[15px] truncate', r.unreadCount ? 'font-bold text-gray-900' : 'font-semibold text-gray-800')}>{r.name}</span>
                                    <span className="flex-shrink-0 text-[11px] text-gray-400">{r.lastMessage ? moment(r.lastMessage.createdAt).fromNow(true) : ''}</span>
                                 </span>
                                 <span className="flex gap-2 justify-between items-center mt-0.5">
                                    <span className={clsx('text-[13px] truncate', isTyping ? 'text-blue-600 italic' : r.unreadCount ? 'font-medium text-gray-800' : 'text-gray-500')}>
                                       {isTyping ? `${typing[r._id].name} is typing…` : previewOf(r)}
                                    </span>
                                    {r.unreadCount > 0 && (
                                       <span className="flex flex-shrink-0 justify-center items-center px-1.5 h-5 min-w-[20px] text-[11px] font-bold text-white bg-blue-500 rounded-full">{r.unreadCount}</span>
                                    )}
                                 </span>
                              </span>
                           </button>
                        );
                     })
                  )}
               </div>
            </aside>

            {/* ===== Conversation ===== */}
            <section className={clsx('flex-col flex-1 min-w-0 bg-[#f4f6fb] md:flex', selectedId ? 'flex' : 'hidden')}>
               {!room ? (
                  <div className="flex flex-col flex-1 justify-center items-center px-6 text-center">
                     <span className="flex justify-center items-center mb-5 w-20 h-20 text-3xl text-white bg-gradient-to-br from-blue-600 to-indigo-500 rounded-3xl shadow-lg shadow-blue-200 rotate-3">
                        <FiMessageCircle />
                     </span>
                     <p className="text-base font-semibold text-gray-800">Pick a chat, or start a new one</p>
                     <p className="flex gap-1.5 items-center mt-2 text-xs text-gray-400">
                        <FiLock size={12} /> Messages and photos are encrypted at rest and only decrypted for members.
                     </p>
                  </div>
               ) : (
                  <>
                     {/* header */}
                     <div className="flex gap-3 items-center px-3 h-[64px] bg-white/90 border-b border-gray-100 backdrop-blur sm:px-5">
                        <button type="button" onClick={() => open(null)} className={`${iconButton} w-9 h-9 text-gray-600 md:hidden hover:bg-gray-100`} aria-label="Back">
                           <FiArrowLeft size={18} />
                        </button>
                        <RoomAvatar room={room} size={40} />
                        <div className="flex-1 min-w-0">
                           {renaming ? (
                              <Input autoFocus size="small" value={nameDraft} maxLength={80} onChange={(e) => setNameDraft(e.target.value)} onPressEnter={rename} onBlur={rename} className="max-w-xs" />
                           ) : (
                              <p className="flex gap-1.5 items-center text-[15px] font-bold text-gray-900 truncate">
                                 {room.name}
                                 {room.type === 'group' && canManage && (
                                    <Tooltip title="Rename group">
                                       <button type="button" onClick={() => { setNameDraft(room.name || ''); setRenaming(true); }} className={`${iconButton} w-6 h-6 text-gray-400 hover:text-blue-600 hover:bg-blue-50`} aria-label="Rename group">
                                          <FiEdit2 size={12} />
                                       </button>
                                    </Tooltip>
                                 )}
                              </p>
                           )}
                           <p className={clsx('text-xs truncate', typingNow ? 'text-blue-600' : 'text-gray-400')}>
                              {typingNow ? `${typingNow.name} is typing…` : room.type === 'group' ? `${room.members.length} members` : partner?.email}
                           </p>
                        </div>
                        <span className="hidden gap-1 items-center px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 rounded-full sm:flex">
                           <FiLock size={11} /> Encrypted
                        </span>
                        {room.type === 'group' && (
                           <button type="button" onClick={() => setMembersOpen(true)} className="flex gap-1.5 items-center px-3 h-9 text-sm font-medium text-gray-700 bg-gray-100 rounded-full border-none cursor-pointer hover:bg-gray-200">
                              <FiUsers size={15} /> <span className="hidden sm:inline">{room.members.length}</span>
                           </button>
                        )}
                     </div>

                     {/* messages */}
                     <div
                        ref={listRef}
                        onScroll={handleListScroll}
                        className="overflow-y-auto flex-1 px-3 py-4 nice-scrollbar sm:px-6"
                        style={{ backgroundImage: 'radial-gradient(rgba(59,130,246,0.08) 1px, transparent 1px)', backgroundSize: '22px 22px' }}
                     >
                        {isFetchingNextPage && <p className="py-1 text-xs text-center text-gray-400">Loading older messages…</p>}
                        {messagesLoading ? (
                           <div className="p-4 space-y-3"><Skeleton active paragraph={{ rows: 4 }} /></div>
                        ) : (
                           messages.map((m, i) => {
                              const prev = messages[i - 1];
                              const showTime = !prev || moment(m.createdAt).diff(moment(prev.createdAt), 'minutes') > 15;
                              const sameSender = !!prev && prev.type !== 'system' && prev.sender?._id === m.sender?._id && !showTime;
                              if (m.type === 'system') {
                                 return (
                                    <div key={m._id} className="flex justify-center my-3">
                                       <span className="px-3 py-1 text-[11px] text-gray-500 bg-white/80 rounded-full ring-1 ring-black/5">{m.content}</span>
                                    </div>
                                 );
                              }
                              return (
                                 <React.Fragment key={m._id}>
                                    {showTime && (
                                       <div className="flex justify-center my-4">
                                          <span className="px-3 py-1 text-[11px] font-medium text-gray-500 bg-white/80 rounded-full ring-1 ring-black/5">{moment(m.createdAt).calendar()}</span>
                                       </div>
                                    )}
                                    <div
                                       data-message-id={m._id}
                                       className={clsx('group/msg flex gap-2 items-end rounded-2xl transition-colors', sameSender ? 'mt-1' : 'mt-3', m.isMine ? 'justify-end' : 'justify-start', m.reactions?.length && 'mb-2')}
                                    >
                                       {!m.isMine && (sameSender ? <span className="flex-shrink-0 w-7" /> : <UserAvatar size={28} src={m.sender?.avatar} name={m.sender?.name} className="flex-shrink-0 ring-2 ring-white" />)}
                                       {m.isMine && renderActions(m)}
                                       <div className="max-w-[78%] md:max-w-[62%]" title={moment(m.createdAt).format('LLL')}>
                                          {!m.isMine && !sameSender && room.type === 'group' && (
                                             <p className="mb-1 ml-1 text-[11px] font-semibold text-gray-500">{m.sender?.name}</p>
                                          )}
                                          {renderBubble(m)}
                                          {renderReactions(m)}
                                       </div>
                                       {!m.isMine && renderActions(m)}
                                    </div>
                                 </React.Fragment>
                              );
                           })
                        )}
                        {typingNow && (
                           <div className="flex gap-2 items-end mt-3">
                              <div className="flex gap-1 items-center px-4 py-3 bg-white rounded-2xl rounded-bl-md shadow-sm ring-1 ring-black/5">
                                 {[0, 1, 2].map((dot) => (
                                    <span key={dot} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${dot * 150}ms` }} />
                                 ))}
                              </div>
                           </div>
                        )}
                     </div>

                     {/* composer */}
                     <div className="px-2 py-2 bg-white/90 border-t border-gray-100 backdrop-blur sm:px-4 sm:py-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                        {replyTo && (
                           <div className="flex gap-2 items-center px-3 py-2 mb-2 bg-blue-50 rounded-2xl border-l-4 border-blue-500">
                              <FiCornerUpLeft className="flex-shrink-0 text-blue-500" size={14} />
                              <div className="flex-1 min-w-0">
                                 <p className="text-[11px] font-semibold text-blue-700">Replying to {replyTo.isMine ? 'yourself' : replyTo.sender?.name}</p>
                                 <p className="text-xs text-gray-600 truncate">
                                    {replyTo.type === 'image' ? '📷 Photo' : replyTo.type === 'sticker' ? '🙂 Sticker' : replyTo.content}
                                 </p>
                              </div>
                              <button type="button" onClick={() => setReplyTo(null)} className={`${iconButton} w-7 h-7 text-gray-500 hover:bg-white`} aria-label="Cancel reply"><FiX size={14} /></button>
                           </div>
                        )}
                        <div className="flex gap-1 items-end p-1.5 bg-gray-50 rounded-3xl ring-1 ring-gray-200 focus-within:ring-blue-300 focus-within:bg-white transition-colors">
                           <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => handleImage(e.target.files?.[0])} />
                           <Tooltip title="Send a photo">
                              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={`${iconButton} w-9 h-9 text-gray-400 hover:text-blue-600 hover:bg-blue-50`} aria-label="Photo">
                                 <FiImage size={20} />
                              </button>
                           </Tooltip>
                           <Popover open={stickerOpen} onOpenChange={setStickerOpen} trigger="click" placement="topLeft" content={<StickerPicker onPick={(id) => { setStickerOpen(false); sendSticker.mutate({ id, replyTo: replyTo?._id }); setReplyTo(null); }} />}>
                              <button type="button" className={`${iconButton} w-9 h-9 text-gray-400 hover:text-violet-600 hover:bg-violet-50`} aria-label="Sticker">
                                 <PiStickerBold size={21} />
                              </button>
                           </Popover>
                           <Popover open={emojiOpen} onOpenChange={setEmojiOpen} trigger="click" placement="topLeft" content={<EmojiPicker height={360} width="min(310px, calc(100vw - 24px))" searchDisabled skinTonesDisabled previewConfig={{ showPreview: false }} onEmojiClick={(emoji: EmojiClickData) => setDraft((prev) => prev + emoji.emoji)} />}>
                              <button type="button" className={`${iconButton} hidden w-9 h-9 text-gray-400 sm:flex hover:text-amber-500 hover:bg-amber-50`} aria-label="Emoji">
                                 <FiSmile size={20} />
                              </button>
                           </Popover>
                           <Input.TextArea
                              placeholder={uploading ? 'Uploading photo…' : 'Type a message…'}
                              className="bg-transparent! border-none! shadow-none! py-2! px-2! text-[15px]! resize-none! focus:shadow-none!"
                              value={draft}
                              autoSize={{ minRows: 1, maxRows: 5 }}
                              maxLength={4000}
                              onChange={(e) => handleDraftChange(e.target.value)}
                              onPressEnter={(e) => {
                                 if (!e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                 }
                              }}
                           />
                           <Button
                              type="primary"
                              shape="circle"
                              size="large"
                              icon={<FiSend />}
                              className={clsx('flex-shrink-0 border-none', draft.trim() ? 'bg-gradient-to-br from-blue-600 to-indigo-500 shadow-md shadow-blue-200' : 'bg-gray-200!')}
                              loading={sendText.isPending}
                              disabled={!draft.trim()}
                              onClick={handleSend}
                           />
                        </div>
                     </div>
                  </>
               )}
            </section>
         </div>

         {/* ===== Members / group settings ===== */}
         <Drawer placement="right" size={380} open={membersOpen && !!room} onClose={() => setMembersOpen(false)} closeIcon={null} styles={{ header: { display: 'none' }, body: { padding: 0 } }} className="font-main">
            {room && (
               <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center px-4 pt-3 pb-3 border-b border-gray-100">
                     <span className="text-base font-semibold text-gray-900">Group settings</span>
                     <button type="button" onClick={() => setMembersOpen(false)} className={`${iconButton} w-9 h-9 text-gray-600 bg-gray-100`} aria-label="Close"><FiX size={18} /></button>
                  </div>

                  <div className="flex flex-col gap-3 items-center px-4 py-5 border-b border-gray-100">
                     <RoomAvatar room={room} size={64} />
                     {canManage ? (
                        <div className="flex gap-2 w-full">
                           <Input value={renaming ? nameDraft : room.name} maxLength={80} onFocus={() => { setNameDraft(room.name || ''); setRenaming(true); }} onChange={(e) => setNameDraft(e.target.value)} onPressEnter={rename} className="h-10 text-center font-semibold rounded-xl" />
                           <Button type="primary" icon={<FiCheck />} onClick={rename} disabled={!renaming || !nameDraft.trim() || nameDraft.trim() === room.name} className="h-10 rounded-xl" />
                        </div>
                     ) : (
                        <p className="text-base font-bold text-gray-900">{room.name}</p>
                     )}
                     <p className="text-xs text-gray-400">{room.members.length} members · you are {room.myRole}</p>
                  </div>

                  <div className="overflow-y-auto flex-1 py-2 nice-scrollbar">
                     {room.members.map((m) => (
                        <div key={m._id} className="flex gap-3 items-center px-4 py-2.5">
                           <UserAvatar size={38} src={m.avatar} name={m.name} />
                           <span className="flex-1 min-w-0">
                              <span className="flex gap-1.5 items-center text-sm font-semibold text-gray-900 truncate">
                                 {m.name}{m._id === user?._id ? ' (you)' : ''}
                                 {m.role !== 'member' && (
                                    <span className={clsx('px-1.5 py-0.5 text-[10px] font-bold uppercase rounded-md', m.role === 'owner' ? 'text-amber-700 bg-amber-50' : 'text-blue-700 bg-blue-50')}>{m.role}</span>
                                 )}
                              </span>
                              <span className="block text-xs text-gray-400 truncate">{m.email}</span>
                           </span>
                           {isOwner && m.role !== 'owner' && (
                              <Tooltip title={m.role === 'admin' ? 'Remove admin' : 'Make admin'}>
                                 <button type="button" onClick={() => setRole(m._id, m.role === 'admin' ? 'member' : 'admin')} className={clsx(iconButton, 'w-8 h-8', m.role === 'admin' ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50')} aria-label="Toggle admin">
                                    <FiShield size={15} />
                                 </button>
                              </Tooltip>
                           )}
                           {canManage && m._id !== user?._id && m.role !== 'owner' && (
                              <Popconfirm title={`Remove ${m.name}?`} okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => removeMember(m._id)}>
                                 <button type="button" className={`${iconButton} w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50`} aria-label={`Remove ${m.name}`}><FiX size={16} /></button>
                              </Popconfirm>
                           )}
                        </div>
                     ))}
                  </div>

                  <div className="flex flex-col gap-2 p-4 border-t border-gray-100">
                     {canManage && <Button icon={<FiUserPlus />} onClick={() => setAddOpen(true)} className="h-10 rounded-xl">Add members</Button>}
                     {!(isOwner && room.members.length > 1) && (
                        <Popconfirm title="Leave this group?" okText="Leave" okButtonProps={{ danger: true }} onConfirm={() => removeMember(user!._id)}>
                           <Button danger icon={<FiLogOut />} className="h-10 rounded-xl">Leave group</Button>
                        </Popconfirm>
                     )}
                     {isOwner && room.members.length > 1 && <p className="text-xs text-center text-gray-400">As the owner you can leave once everyone else has left.</p>}
                  </div>
               </div>
            )}
         </Drawer>

         <NewChatModal open={newOpen} onClose={() => setNewOpen(false)} onCreated={(id) => { queryClient.invalidateQueries({ queryKey: ROOMS_KEY }); open(id); }} />
         {room && room.type === 'group' && (
            <NewChatModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => {}} addToRoom={{ id: room._id, name: room.name || '', memberIds: room.members.map((m) => m._id) }} onAddMembers={addMembers} />
         )}
      </div>
   );
};

export default ChatApp;
