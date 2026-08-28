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
   FiPhone,
   FiPlus,
   FiRotateCcw,
   FiSearch,
   FiSend,
   FiShield,
   FiSmile,
   FiUserPlus,
   FiUsers,
   FiVideo,
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
import CallOverlay from './CallOverlay';
import { useCall } from './useCall';
import { showChatNotification } from './useChatNotifications';

const ROOMS_KEY = ['chat-rooms'];
const messagesKey = (roomId: string) => ['chat-messages', roomId];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];
const MAX_IMAGES_PER_SEND = 10;
/** 1-6 emoji and nothing else -> shown big without a bubble (Messenger style) */
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*\s?){1,6}$/u;

interface UploadItem {
   id: string;
   name: string;
   preview: string;
   progress: number;
   status: 'uploading' | 'done' | 'error';
}

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
   const [uploads, setUploads] = useState<UploadItem[]>([]);
   const uploading = uploads.some((u) => u.status === 'uploading');
   const call = useCall(user);
   const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
   const [reactOpenFor, setReactOpenFor] = useState<string | null>(null);
   /** roomId -> userId -> who is typing (expires after 5s without a signal) */
   const [typing, setTyping] = useState<Record<string, Record<string, { name: string; avatar: string | null; until: number }>>>({});
   const [dragging, setDragging] = useState(false);
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

   /* ---- optimistic cache: messages show up instantly, the server response only confirms ---- */

   type MessagesCache = { pages: Res<{ messages: ChatMessage[]; hasMore: boolean }>[]; pageParams: unknown[] };

   /** Insert or replace a message in the cached pages (newest page is pages[0]). */
   const upsertMessage = useCallback(
      (roomId: string, message: ChatMessage, replaceId?: string) => {
         queryClient.setQueryData<MessagesCache>(messagesKey(roomId), (cache) => {
            if (!cache?.pages?.length) return cache;
            const target = replaceId ?? message._id;
            let found = false;
            const pages = cache.pages.map((page) => {
               const list = page?.data?.messages;
               if (!list) return page;
               const index = list.findIndex((m) => m._id === target);
               if (index < 0) return page;
               found = true;
               const next = [...list];
               next[index] = { ...next[index], ...message };
               return { ...page, data: { ...page.data, messages: next } };
            });
            if (found) return { ...cache, pages };
            const first = pages[0];
            return { ...cache, pages: [{ ...first, data: { ...first.data, messages: [...(first.data?.messages ?? []), message] } }, ...pages.slice(1)] };
         });
      },
      [queryClient],
   );

   const patchMessage = useCallback(
      (roomId: string, messageId: string, patch: (m: ChatMessage) => ChatMessage) => {
         queryClient.setQueryData<MessagesCache>(messagesKey(roomId), (cache) => {
            if (!cache?.pages?.length) return cache;
            return {
               ...cache,
               pages: cache.pages.map((page) =>
                  page?.data?.messages?.some((m) => m._id === messageId)
                     ? { ...page, data: { ...page.data, messages: page.data.messages.map((m) => (m._id === messageId ? patch(m) : m)) } }
                     : page,
               ),
            };
         });
      },
      [queryClient],
   );

   const tempMessage = (partial: Partial<ChatMessage>): ChatMessage => ({
      _id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'text',
      content: '',
      imageUrl: null,
      sticker: null,
      recalled: false,
      reactions: [],
      replyTo: replyTo ? { _id: replyTo._id, type: replyTo.type, preview: replyTo.type === 'image' ? '📷 Photo' : replyTo.type === 'sticker' ? '🙂 Sticker' : replyTo.content, senderName: replyTo.sender?.name ?? '', recalled: replyTo.recalled } : null,
      sender: user ? { _id: user._id, name: user.firstname || 'You', avatar: user.avatar ?? null } : null,
      isMine: true,
      createdAt: new Date().toISOString(),
      ...partial,
   });

   const settle = (roomId: string, tempId: string, res: Res<ChatMessage>) => {
      if (!res.success || !res.data) {
         toast.error(res.message || 'Not sent');
         queryClient.invalidateQueries({ queryKey: messagesKey(roomId) });
         return;
      }
      upsertMessage(roomId, { ...res.data, isMine: true }, tempId);
      queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
   };

   const sendText = useMutation({
      mutationFn: async ({ content, replyTo: quoted }: { content: string; replyTo?: string }) => {
         const roomId = selectedId as string;
         const temp = tempMessage({ content });
         upsertMessage(roomId, temp);
         settle(roomId, temp._id, await apiChatSend(roomId, content, quoted));
      },
   });
   const sendSticker = useMutation({
      mutationFn: async ({ id, replyTo: quoted }: { id: string; replyTo?: string }) => {
         const roomId = selectedId as string;
         const temp = tempMessage({ type: 'sticker', sticker: id });
         upsertMessage(roomId, temp);
         settle(roomId, temp._id, await apiChatSendSticker(roomId, id, quoted));
      },
   });
   const react = useMutation({
      mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
         const roomId = selectedId as string;
         // flip the chip locally first
         patchMessage(roomId, messageId, (m) => {
            const mine = m.reactions.find((r) => r.emoji === emoji && r.mine);
            const me = user?.firstname || 'You';
            const reactions = mine
               ? m.reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, mine: false, users: r.users.filter((n) => n !== me) } : r)).filter((r) => r.count > 0)
               : m.reactions.some((r) => r.emoji === emoji)
                 ? m.reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, mine: true, users: [...r.users, me] } : r))
                 : [...m.reactions, { emoji, count: 1, mine: true, users: [me] }];
            return { ...m, reactions };
         });
         const res = await apiChatReact(messageId, emoji);
         if (!res.success) {
            toast.error(res.message || 'Could not react');
            queryClient.invalidateQueries({ queryKey: messagesKey(roomId) });
         } else if (res.data) {
            upsertMessage(roomId, res.data);
         }
      },
   });
   const recall = useMutation({
      mutationFn: async (messageId: string) => {
         const roomId = selectedId as string;
         patchMessage(roomId, messageId, (m) => ({ ...m, recalled: true, content: '', imageUrl: null, sticker: null, reactions: [] }));
         const res = await apiChatRecall(messageId);
         if (!res.success) {
            toast.error(res.message || 'Could not recall');
            queryClient.invalidateQueries({ queryKey: messagesKey(roomId) });
         } else {
            queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
         }
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
         const from = payload.message.sender?._id;
         if (from) {
            setTyping((t) => {
               if (!t[payload.roomId]?.[from]) return t;
               const room = { ...t[payload.roomId] };
               delete room[from];
               return { ...t, [payload.roomId]: room };
            });
         }
         // Open room: drop the message straight into the cache (no refetch). Other rooms
         // only need their unread badge / preview refreshed.
         if (selectedIdRef.current === payload.roomId && queryClient.getQueryData(messagesKey(payload.roomId))) {
            upsertMessage(payload.roomId, { ...payload.message, isMine: payload.message.sender?._id === user?._id });
            queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
         } else {
            invalidateRoom(payload.roomId);
         }
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
      const onTyping = (payload: { roomId: string; from: string; name: string; avatar?: string | null; isTyping: boolean }) => {
         setTyping((t) => {
            const room = { ...(t[payload.roomId] ?? {}) };
            if (payload.isTyping) room[payload.from] = { name: payload.name, avatar: payload.avatar ?? null, until: Date.now() + 5000 };
            else delete room[payload.from];
            return { ...t, [payload.roomId]: room };
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
   }, [invalidateRoom, queryClient, open, upsertMessage, user?._id]);

   useEffect(() => {
      const timer = setInterval(() => {
         setTyping((t) => {
            const now = Date.now();
            let changed = false;
            const next: typeof t = {};
            for (const [roomId, users] of Object.entries(t)) {
               const alive = Object.fromEntries(Object.entries(users).filter(([, v]) => v.until > now));
               if (Object.keys(alive).length !== Object.keys(users).length) changed = true;
               next[roomId] = alive;
            }
            return changed ? next : t;
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
         avatar: user?.avatar ?? null,
         isTyping,
      });
   };

   // call outcome messages (declined, missed, permission denied...)
   useEffect(() => {
      if (!call.error) return;
      toast.info(call.error);
      call.clearError();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [call.error]);

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

   /** Send one or many photos; each gets its own progress row above the composer. */
   const handleImages = async (list?: FileList | File[] | null) => {
      const files = Array.from(list ?? []).filter(Boolean);
      if (!files.length || !selectedId) return;
      if (files.length > MAX_IMAGES_PER_SEND) toast.info(`Sending the first ${MAX_IMAGES_PER_SEND} photos`);
      const roomId = selectedId;
      const quoted = replyTo?._id;
      setReplyTo(null);
      if (fileRef.current) fileRef.current.value = '';

      const items: UploadItem[] = [];
      for (const file of files.slice(0, MAX_IMAGES_PER_SEND)) {
         if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
            toast.warning(`${file.name}: JPG, PNG, GIF or WebP only`);
            continue;
         }
         if (file.size > MAX_IMAGE_BYTES) {
            toast.warning(`${file.name}: must be under 5 MB`);
            continue;
         }
         items.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: file.name, preview: URL.createObjectURL(file), progress: 0, status: 'uploading' });
      }
      if (!items.length) return;
      setUploads((u) => [...u, ...items]);
      const update = (id: string, patch: Partial<UploadItem>) => setUploads((u) => u.map((it) => (it.id === id ? { ...it, ...patch } : it)));

      // sequential keeps the order the user picked
      const valid = files.filter((f) => /^image\/(jpeg|png|gif|webp)$/.test(f.type) && f.size <= MAX_IMAGE_BYTES).slice(0, items.length);
      for (const [i, file] of valid.entries()) {
         const item = items[i];
         try {
            const res = await apiChatSendImage(roomId, file, i === 0 ? quoted : undefined, (p) => update(item.id, { progress: p }));
            if (!res.success || !res.data) throw new Error(res.message);
            update(item.id, { progress: 100, status: 'done' });
            upsertMessage(roomId, { ...res.data, isMine: true });
            queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
         } catch (error) {
            update(item.id, { status: 'error' });
            toast.error(`${file.name}: ${(error as Error).message || 'upload failed'}`);
         }
      }
      setTimeout(() => {
         items.forEach((it) => URL.revokeObjectURL(it.preview));
         setUploads((u) => u.filter((it) => !items.some((x) => x.id === it.id)));
      }, 1200);
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
   const typersOf = (roomId: string) => Object.values(typing[roomId] ?? {});
   const typers = selectedId ? typersOf(selectedId) : [];
   const typingLabel = (list: { name: string }[]) =>
      list.length === 0 ? '' : list.length === 1 ? `${list[0].name} is typing…` : list.length === 2 ? `${list[0].name} and ${list[1].name} are typing…` : `${list[0].name}, ${list[1].name} and ${list.length - 2} more are typing…`;
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

   const reactorNames = (r: ChatMessage['reactions'][number]) => {
      const others = r.users.filter((n) => n !== (user?.firstname || '') && n !== `${user?.firstname ?? ''} ${user?.lastname ?? ''}`.trim());
      const names = r.mine ? ['You', ...others] : r.users;
      return names.join(', ');
   };

   const renderReactions = (m: ChatMessage) =>
      m.reactions?.length ? (
         <div className={clsx('flex relative z-10 flex-wrap gap-0.5 -mt-2.5', m.isMine ? 'justify-end mr-2' : 'ml-2')}>
            {m.reactions.map((r) => (
               <Tooltip key={r.emoji} title={<span className="text-xs">{reactorNames(r)}</span>} placement="top">
                  <button
                     type="button"
                     onClick={() => react.mutate({ messageId: m._id, emoji: r.emoji })}
                     className={clsx(
                        'flex gap-1 items-center px-1.5 h-[22px] text-[13px] leading-none bg-white rounded-full shadow-md cursor-pointer transition-all ring-1 hover:-translate-y-0.5',
                        r.mine ? 'ring-blue-300 bg-blue-50' : 'ring-black/5',
                     )}
                  >
                     <span>{r.emoji}</span>
                     {r.count > 1 && <span className={clsx('text-[11px] font-semibold', r.mine ? 'text-blue-700' : 'text-gray-600')}>{r.count}</span>}
                  </button>
               </Tooltip>
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
         return (
            <div className="flex flex-col gap-1">
               {renderQuote(m)}
               {/* local static asset (animated webp) - next/image would re-encode it */}
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={stickerUrl(m.sticker)} alt="sticker" className="w-40 h-40 object-contain drop-shadow-lg" />
            </div>
         );
      }
      if (m.type === 'text' && EMOJI_ONLY.test(m.content.trim())) {
         // emoji-only messages: big, no bubble (like Messenger)
         return (
            <div className="flex flex-col gap-1">
               {renderQuote(m)}
               <span className="text-5xl leading-tight drop-shadow-sm" style={{ letterSpacing: '0.1em' }}>{m.content.trim()}</span>
            </div>
         );
      }
      if (m.type === 'image' && m.imageUrl) {
         // shown whole (no crop, no rounding); click opens the full-size preview
         return (
            <div className="flex flex-col gap-1">
               {renderQuote(m)}
               <Image src={m.imageUrl} alt="photo" className="block h-auto max-w-full" style={{ maxWidth: 440 }} rootClassName="block max-w-full shadow-sm" />
            </div>
         );
      }
      return (
         <div
            className={clsx(
               'px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap rounded-2xl',
               m.isMine
                  ? 'text-white bg-gradient-to-br from-blue-600 to-indigo-500 rounded-br-md shadow-md shadow-blue-200/60'
                  : 'text-gray-800 bg-white rounded-bl-md shadow-sm ring-1 ring-black/5',
               m._id.startsWith('tmp-') && 'opacity-70',
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
                  <div className="flex gap-1 px-1 py-0.5">
                     {QUICK_REACTIONS.map((emoji) => {
                        const active = m.reactions?.some((r) => r.emoji === emoji && r.mine);
                        return (
                           <button
                              key={emoji}
                              type="button"
                              onClick={() => { setReactOpenFor(null); react.mutate({ messageId: m._id, emoji }); }}
                              className={clsx('flex justify-center items-center w-9 h-9 text-[22px] leading-none rounded-full border-none transition-transform cursor-pointer hover:scale-125', active ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-transparent hover:bg-gray-100')}
                              aria-label={emoji}
                           >
                              {emoji}
                           </button>
                        );
                     })}
                  </div>
               }
               styles={{ container: { padding: 4, borderRadius: 9999 } }}
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
                        const roomTypers = typersOf(r._id);
                        const isTyping = roomTypers.length > 0;
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
                                       {isTyping ? typingLabel(roomTypers) : previewOf(r)}
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
            <section
               className={clsx('relative flex-col flex-1 min-w-0 bg-[#f4f6fb] md:flex', selectedId ? 'flex' : 'hidden')}
               onDragOver={(e) => {
                  if (!room || !e.dataTransfer.types.includes('Files')) return;
                  e.preventDefault();
                  setDragging(true);
               }}
               onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
               }}
               onDrop={(e) => {
                  if (!room) return;
                  e.preventDefault();
                  setDragging(false);
                  handleImages(e.dataTransfer.files);
               }}
            >
               {dragging && room && (
                  <div className="flex absolute inset-0 z-20 justify-center items-center bg-blue-500/10 border-4 border-blue-400 border-dashed pointer-events-none">
                     <span className="flex gap-2 items-center px-4 py-2 text-sm font-semibold text-blue-700 bg-white rounded-full shadow-lg"><FiImage /> Drop to send the photo</span>
                  </div>
               )}
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
                           <p className={clsx('text-xs truncate', typers.length ? 'text-blue-600' : 'text-gray-400')}>
                              {typers.length ? typingLabel(typers) : room.type === 'group' ? `${room.members.length} members` : partner?.email}
                           </p>
                        </div>
                        <span className="hidden gap-1 items-center px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 rounded-full sm:flex">
                           <FiLock size={11} /> Encrypted
                        </span>
                        {room.type === 'direct' && partner && (
                           <>
                              <Tooltip title="Voice call">
                                 <button type="button" onClick={() => call.startCall(partner, room._id, 'audio')} className={`${iconButton} w-9 h-9 text-blue-600 bg-blue-50 hover:bg-blue-100`} aria-label="Voice call"><FiPhone size={17} /></button>
                              </Tooltip>
                              <Tooltip title="Video call">
                                 <button type="button" onClick={() => call.startCall(partner, room._id, 'video')} className={`${iconButton} w-9 h-9 text-blue-600 bg-blue-50 hover:bg-blue-100`} aria-label="Video call"><FiVideo size={17} /></button>
                              </Tooltip>
                           </>
                        )}
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
                        {typers.length > 0 && (
                           <div className="flex gap-2 items-end mt-3">
                              <div className="flex flex-shrink-0 -space-x-2">
                                 {typers.slice(0, 3).map((t) => (
                                    <UserAvatar key={t.name} size={24} src={t.avatar} name={t.name} className="ring-2 ring-white" />
                                 ))}
                              </div>
                              <div className="flex flex-col gap-1">
                                 {room.type === 'group' && <span className="ml-1 text-[11px] font-medium text-gray-500">{typingLabel(typers)}</span>}
                                 <div className="flex gap-1 items-center px-4 py-3 w-fit bg-white rounded-2xl rounded-bl-md shadow-sm ring-1 ring-black/5">
                                    {[0, 1, 2].map((dot) => (
                                       <span key={dot} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${dot * 150}ms` }} />
                                    ))}
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>

                     {/* composer */}
                     <div className="px-2 py-2 bg-white/90 border-t border-gray-100 backdrop-blur sm:px-4 sm:py-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                        {uploads.length > 0 && (
                           <div className="flex gap-2 px-1 pb-2 mb-2 overflow-x-auto border-b border-gray-100">
                              {uploads.map((u) => (
                                 <div key={u.id} className="relative flex-shrink-0 w-[72px]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={u.preview} alt="" className={clsx('object-cover w-[72px] h-[72px] rounded-xl ring-2', u.status === 'error' ? 'ring-red-400' : u.status === 'done' ? 'ring-emerald-400' : 'ring-blue-500')} />
                                    {u.status === 'uploading' && (
                                       <div className="flex absolute inset-0 flex-col justify-end items-center p-1.5 bg-black/45 rounded-xl">
                                          <span className="mb-1 text-[13px] font-bold text-white drop-shadow">{u.progress}%</span>
                                          <div className="w-full h-2 bg-white/40 rounded-full overflow-hidden">
                                             <div className="h-full bg-blue-500 transition-[width] duration-200" style={{ width: `${u.progress}%` }} />
                                          </div>
                                       </div>
                                    )}
                                    {u.status === 'done' && <span className="flex absolute inset-0 justify-center items-center text-2xl font-bold text-white bg-emerald-500/50 rounded-xl">✓</span>}
                                    {u.status === 'error' && <span className="flex absolute inset-0 justify-center items-center text-lg font-bold text-white bg-red-500/60 rounded-xl">!</span>}
                                 </div>
                              ))}
                           </div>
                        )}
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
                           <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => handleImages(e.target.files)} />
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
                              placeholder={uploading ? 'Uploading photos…' : 'Type a message…'}
                              className="bg-transparent! border-none! shadow-none! py-2! px-2! text-[15px]! resize-none! focus:shadow-none!"
                              value={draft}
                              autoSize={{ minRows: 1, maxRows: 5 }}
                              maxLength={4000}
                              onChange={(e) => handleDraftChange(e.target.value)}
                              // Ctrl+V a screenshot / copied image -> sent as a photo
                              onPaste={(e) => {
                                 const files = Array.from(e.clipboardData?.items ?? [])
                                    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
                                    .map((item) => item.getAsFile())
                                    .filter((f): f is File => !!f)
                                    .map((f, i) => new File([f], f.name || `pasted-${Date.now()}-${i}.png`, { type: f.type }));
                                 if (files.length) {
                                    e.preventDefault();
                                    handleImages(files);
                                 }
                              }}
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

         <CallOverlay call={call} />
         <NewChatModal open={newOpen} onClose={() => setNewOpen(false)} onCreated={(id) => { queryClient.invalidateQueries({ queryKey: ROOMS_KEY }); open(id); }} />
         {room && room.type === 'group' && (
            <NewChatModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => {}} addToRoom={{ id: room._id, name: room.name || '', memberIds: room.members.map((m) => m._id) }} onAddMembers={addMembers} />
         )}
      </div>
   );
};

export default ChatApp;
