'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button, Drawer, Empty, Image, Input, Popconfirm, Popover, Skeleton, Tooltip, message as toast } from 'antd';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import moment from 'moment';
import {
   FiArrowLeft,
   FiAward,
   FiBell,
   FiCamera,
   FiCheck,
   FiChevronDown,
   FiChevronUp,
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
   FiBellOff,
   FiUserPlus,
   FiUsers,
   FiVideo,
   FiX,
} from 'react-icons/fi';
import { PiPushPinFill, PiPushPinSlashBold, PiStickerBold } from 'react-icons/pi';
import {
   apiChatAddMembers,
   apiChatEditMessage,
   apiChatMarkRead,
   apiChatMedia,
   apiChatMuteRoom,
   apiChatMessages,
   apiChatReact,
   apiChatRecall,
   apiChatPinMessage,
   apiChatRemoveMember,
   apiChatRenameGroup,
   apiChatRooms,
   apiChatSendEncrypted,
   apiChatSendImage,
   apiChatSetGroupAvatar,
   apiChatSetRole,
   type ChatMessage,
   type ChatRoom,
} from '@/apis/chat.api';
import { UserAvatar } from '@/components';
import { useAuth, useLockBodyScroll } from '@/hooks';
import { connectSocket, getSocket } from '@/lib/socket';
import { useSearchParams } from '@/lib/router-compat';
import NewChatModal from './NewChatModal';
import StickerPicker, { loadPacks, Sticker } from './StickerPicker';
import CallOverlay from './CallOverlay';
import EncryptedImage from './EncryptedImage';
import LinkPreview, { firstUrl, Linkified } from './LinkPreview';
import { useRoomKeys } from './useRoomKeys';
import { useCall } from './useCall';
import { showChatNotification } from './useChatNotifications';

const ROOMS_KEY = ['chat-rooms'];
const messagesKey = (roomId: string) => ['chat-messages', roomId];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];
const MAX_IMAGES_PER_SEND = 10;
/** client-side id shared by the photos of one Send (module scope: not "impure during render") */
const newAlbumId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
/** id for the bubble shown while a message is in flight (module scope: not "impure during render") */
const newTempId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
/** cache slot for a decrypted body - changes when the message is edited, so it is decrypted again */
const bodySlot = (m: ChatMessage) => `${m._id}@${m.editedAt ?? ''}`;

/**
 * "Pinned" = the reader is at the newest message, so anything that grows the list later
 * (photos, stickers, decrypted text) should keep the view at the bottom. The flag lives on
 * the scroller element so every handler and observer reads the same value.
 */
const isPinned = (el: HTMLElement | null) => !!el && el.dataset.chatPinned !== '0';
const setPinned = (el: HTMLElement | null, pinned: boolean) => {
   if (el) el.dataset.chatPinned = pinned ? '1' : '0';
};
/** 1-6 emoji and nothing else -> shown big without a bubble (Messenger style) */
const EMOJI_ONLY = /^(?:\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*\s?){1,6}$/u;

interface UploadItem {
   id: string;
   name: string;
   preview: string;
   progress: number;
   status: 'uploading' | 'done' | 'error';
}

/** escape a name / search term before it goes into a RegExp */
const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** "@everyone": one token that resolves to every other member */
const MENTION_ALL = 'All';

const iconButton =
   'flex flex-shrink-0 justify-center items-center rounded-full border-none bg-transparent transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

const RoomAvatar: React.FC<{ room: ChatRoom; size?: number }> = ({ room, size = 44 }) =>
   room.type === 'direct' ? (
      <UserAvatar size={size} src={room.avatar} name={room.name} />
   ) : room.avatar ? (
      // group photo: served decrypted behind a signed URL, so a plain <img> is enough
      // eslint-disable-next-line @next/next/no-img-element
      <img
         src={room.avatar}
         alt=""
         width={size}
         height={size}
         className="object-cover flex-shrink-0 rounded-full shadow-sm ring-2 ring-white"
         style={{ width: size, height: size }}
      />
   ) : (
      <span
         className="flex flex-shrink-0 justify-center items-center text-white bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 rounded-full shadow-sm ring-2 ring-white"
         style={{ width: size, height: size }}
      >
         <FiUsers size={Math.round(size * 0.42)} />
      </span>
   );

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
   /** photos picked / pasted / dropped, waiting for Send */
   const [staged, setStaged] = useState<{ id: string; file: File; preview: string }[]>([]);
   const call = useCall(user);
   const roomKeys = useRoomKeys();
   /** decrypted bodies by message id ("q:<id>" for quotes, "lm:<roomId>:<at>" for room previews) */
   const [plain, setPlain] = useState<Record<string, string>>({});
   const learn = useCallback((id: string, text: string) => setPlain((cur) => (cur[id] === text ? cur : { ...cur, [id]: text })), []);
   const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
   /** message being edited (own text messages only) */
   const [editing, setEditing] = useState<ChatMessage | null>(null);
   /** the list is scrolled to the newest message (drives the "jump to latest" button) */
   const [atBottom, setAtBottom] = useState(true);
   /** how many messages arrived while the user was reading further up */
   const [unseenBelow, setUnseenBelow] = useState(0);
   const [reactOpenFor, setReactOpenFor] = useState<string | null>(null);
   /** roomId -> userId -> who is typing (expires after 5s without a signal) */
   const [typing, setTyping] = useState<Record<string, Record<string, { name: string; avatar: string | null; until: number }>>>({});
   const [dragging, setDragging] = useState(false);
   /** in-room search: the bar under the header, its term and which hit is active */
   const [searchOpen, setSearchOpen] = useState(false);
   const [search, setSearch] = useState('');
   const [hitIndex, setHitIndex] = useState(0);
   /** group drawer: members or the shared photos */
   const [drawerTab, setDrawerTab] = useState<'members' | 'media'>('members');
   const [avatarBusy, setAvatarBusy] = useState(false);
   /** text typed after "@" (null = the mention list is closed) and the highlighted row */
   const [mentionQuery, setMentionQuery] = useState<string | null>(null);
   const [mentionIndex, setMentionIndex] = useState(0);
   const caretRef = useRef(0);
   const listRef = useRef<HTMLDivElement>(null);
   const fileRef = useRef<HTMLInputElement>(null);
   const avatarRef = useRef<HTMLInputElement>(null);
   const prevBottomOffsetRef = useRef<number | null>(null);
   /** everything inside the scroller - one ResizeObserver instead of one per message */
   const contentRef = useRef<HTMLDivElement>(null);
   /** we moved the scroller ourselves: the scroll event it fires must not unpin the view */
   const selfScrollRef = useRef(false);
   /** while a room settles (decrypting, photos loading) the view stays glued to the bottom */
   const settleUntilRef = useRef(0);
   const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const typingActiveRef = useRef(false);
   const stopTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   useLockBodyScroll(true);

   // sticker manifest first, so stickers in the history resolve to the right files immediately
   const [packsReady, setPacksReady] = useState(false);
   useEffect(() => {
      loadPacks().then(() => setPacksReady(true)).catch(() => setPacksReady(true));
   }, []);

   /* ---------------- data ---------------- */

   const { data: roomsData, isLoading: roomsLoading } = useQuery({ queryKey: ROOMS_KEY, queryFn: apiChatRooms, refetchInterval: 60_000 });
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

   // photos of the room, loaded only when the Media tab is open
   const { data: mediaData, isLoading: mediaLoading } = useQuery({
      queryKey: ['chat-media', selectedId],
      queryFn: () => apiChatMedia(selectedId as string),
      enabled: !!selectedId && membersOpen && drawerTab === 'media',
      staleTime: 30_000,
   });
   const media: ChatMessage[] = useMemo(() => mediaData?.data?.media ?? [], [mediaData]);

   /* ---------------- encryption: room key + decryption of what is on screen ---------------- */

   // fetch the room key as soon as a room is open, so sending never waits for a round trip
   useEffect(() => {
      if (selectedId) void roomKeys.getKey(selectedId);
   }, [selectedId, roomKeys]);

   useEffect(() => {
      if (!selectedId) return;
      const jobs: Promise<void>[] = [];
      for (const m of messages) {
         // the key carries editedAt so an edited body is decrypted again
         const slot = bodySlot(m);
         if (m.cipher && plain[slot] === undefined) {
            jobs.push(roomKeys.decryptWith(selectedId, m.cipher).then((t) => learn(slot, t ?? '\u0000')));
         }
         const q = m.replyTo;
         if (q?.cipher && plain[`q:${q._id}`] === undefined) {
            jobs.push(roomKeys.decryptWith(selectedId, q.cipher).then((t) => learn(`q:${q._id}`, t ?? '\u0000')));
         }
      }
      void Promise.all(jobs);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [messages, selectedId]);

   useEffect(() => {
      const jobs: Promise<void>[] = [];
      for (const r of rooms) {
         const p = r.pinned;
         if (p?.cipher && plain[bodySlot(p)] === undefined) {
            jobs.push(roomKeys.decryptWith(r._id, p.cipher).then((t) => learn(bodySlot(p), t ?? '\u0000')));
         }
         const c = r.lastMessage?.cipher;
         const id = `lm:${r._id}:${r.lastMessage?.createdAt ?? ''}`;
         if (c && plain[id] === undefined) jobs.push(roomKeys.decryptWith(r._id, c).then((t) => learn(id, t ?? '\u0000')));
      }
      void Promise.all(jobs);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [rooms]);

   /** plaintext body (text / sticker id) however the message was stored; null while undecrypted */
   const bodyOf = (m: ChatMessage): string | null => {
      if (!m.cipher) return m.type === 'sticker' ? m.sticker : m.content;
      const t = plain[bodySlot(m)];
      return t === undefined || t === '\u0000' ? null : t;
   };
   const quoteOf = (m: ChatMessage): string => {
      if (!m.replyTo) return '';
      if (!m.replyTo.cipher) return m.replyTo.preview;
      const t = plain[`q:${m.replyTo._id}`];
      return t === undefined ? '…' : t === '\u0000' ? 'Message unavailable' : t;
   };
   const roomPreview = (r: ChatRoom): string => {
      const last = r.lastMessage;
      if (!last) return 'Say hello 👋';
      if (last.type === 'system' || last.recalled) return last.content;
      let body = last.content;
      if (last.cipher) {
         const t = plain[`lm:${r._id}:${last.createdAt}`];
         body = last.type === 'sticker' ? '🙂 Sticker' : t === undefined ? '…' : t === '\u0000' ? 'Message unavailable' : t;
      }
      const who = last.isMine ? 'You' : last.senderName.split(' ')[0];
      return `${who}: ${body}`;
   };

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
               // never let a payload without sender info wipe what we already know
               next[index] = { ...next[index], ...message, sender: message.sender ?? next[index].sender, isMine: message.sender ? message.isMine : next[index].isMine };
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
      _id: newTempId(),
      type: 'text',
      content: '',
      imageUrl: null,
      sticker: null,
      cipher: null,
      image: null,
      album: null,
      recalled: false,
      editedAt: null,
      mentions: [],
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

   /**
    * Which members a body names with "@". The body itself is ciphertext, so these ids ride
    * next to it - that is what lets the server notify a mentioned member of a muted room.
    */
   const mentionIdsIn = (text: string): string[] | undefined => {
      if (!room || room.type !== 'group') return undefined;
      const others = room.members.filter((m) => m._id !== user?._id);
      const all = new RegExp(`@${MENTION_ALL}\\b`, 'i').test(text);
      const ids = all ? others.map((m) => m._id) : others.filter((m) => new RegExp(`@${escapeRe(m.name)}`, 'i').test(text)).map((m) => m._id);
      return ids.length ? ids : undefined;
   };

   /** encrypt + send one body; the temp bubble shows the plaintext meanwhile */
   const sendBody = async (type: 'text' | 'sticker', body: string, quoted?: string, tempFields: Partial<ChatMessage> = {}) => {
      if (!room) return;
      const roomId = room._id;
      const cipher = await roomKeys.encryptFor(roomId, body);
      if (!cipher) {
         toast.error('Could not encrypt the message - please reload the chat');
         return;
      }
      const mentions = type === 'text' ? mentionIdsIn(body) : undefined;
      const temp = tempMessage({ type, mentions: mentions ?? [], ...tempFields });
      upsertMessage(roomId, temp);
      const res = await apiChatSendEncrypted(roomId, type, cipher, quoted, mentions);
      if (res.success && res.data) learn(bodySlot(res.data), body);
      settle(roomId, temp._id, res);
   };
   const sendText = useMutation({
      mutationFn: ({ content, replyTo: quoted }: { content: string; replyTo?: string }) => sendBody('text', content, quoted, { content }),
   });
   const sendSticker = useMutation({
      mutationFn: ({ id, replyTo: quoted }: { id: string; replyTo?: string }) => sendBody('sticker', id, quoted, { sticker: id }),
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
   const editMessage = useMutation({
      mutationFn: async ({ message, content }: { message: ChatMessage; content: string }) => {
         const roomId = selectedId as string;
         const cipher = await roomKeys.encryptFor(roomId, content);
         if (!cipher) {
            toast.error('Could not encrypt the message - please reload the chat');
            return;
         }
         // show the new text right away, confirm with the server's copy
         const optimistic = { ...message, content, cipher, editedAt: new Date().toISOString() };
         learn(bodySlot(optimistic), content);
         upsertMessage(roomId, optimistic);
         const res = await apiChatEditMessage(message._id, cipher);
         if (!res.success || !res.data) {
            toast.error(res.message || 'Could not edit the message');
            queryClient.invalidateQueries({ queryKey: messagesKey(roomId) });
            return;
         }
         learn(bodySlot(res.data), content);
         upsertMessage(roomId, { ...res.data, isMine: true });
         queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
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
         setEditing(null);
         setUnseenBelow(0);
         setAtBottom(true);
         setPinned(listRef.current, true);
         setStaged((cur) => {
            cur.forEach((f) => URL.revokeObjectURL(f.preview));
            return [];
         });
         setMembersOpen(false);
         setDrawerTab('members');
         setSearchOpen(false);
         setSearch('');
         setHitIndex(0);
         setMentionQuery(null);
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
      const onMessage = (payload: { roomId: string; message: ChatMessage; recalled?: boolean; reaction?: boolean; edited?: boolean }) => {
         const from = payload.message.sender?._id;
         if (from) {
            setTyping((t) => {
               if (!t[payload.roomId]?.[from]) return t;
               const room = { ...t[payload.roomId] };
               delete room[from];
               return { ...t, [payload.roomId]: room };
            });
         }
         if (selectedIdRef.current === payload.roomId && !isPinned(listRef.current) && !payload.edited && !payload.reaction) {
            setUnseenBelow((n) => n + 1);
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
         if (payload.recalled || payload.reaction || payload.edited || message.type === 'system' || !message.sender) return;
         if (!document.hidden && selectedIdRef.current === payload.roomId) return;
         const cached = queryClient.getQueryData<Res<{ rooms: ChatRoom[] }>>(ROOMS_KEY);
         const target = cached?.data?.rooms.find((r) => r._id === payload.roomId);
        // a mention still rings in a muted room - that is the point of @
         const mentionsMe = !!user?._id && (message.mentions ?? []).includes(user._id);
         const title = target?.type === 'group' ? `${message.sender.name}${mentionsMe ? ' mentioned you' : ''} · ${target.name}` : message.sender.name;
         if (target?.muted && !mentionsMe) return;
         const show = (body: string) => showChatNotification({ title, body, icon: message.sender!.avatar, roomId: payload.roomId, onOpen: open });
         if (message.cipher && message.type === 'text') {
            roomKeys.decryptWith(payload.roomId, message.cipher).then((t) => show(t ?? 'New message'));
         } else {
            show(notificationBody(message));
         }
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
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

   // One call per burst of messages instead of one per message, and only when something is unread.
   useEffect(() => {
      if (!selectedId) return;
      const unread = rooms.find((r) => r._id === selectedId)?.unreadCount ?? 0;
      if (!unread && messages.length) return;
      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
      markReadTimerRef.current = setTimeout(() => {
         apiChatMarkRead(selectedId).then(() => queryClient.invalidateQueries({ queryKey: ROOMS_KEY }));
      }, 400);
      return () => {
         if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [selectedId, messages.length, queryClient]);

   const newestId = messages[messages.length - 1]?._id;

   /** jump to the newest message; `selfScroll` keeps the resulting scroll event from unpinning */
   const glueToBottom = useCallback((smooth = false) => {
      const el = listRef.current;
      if (!el) return;
      setPinned(el, true);
      if (smooth) {
         selfScrollRef.current = true;
         el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
         return;
      }
      // already there: writing scrollTop would fire no event, and the flag would swallow a real one
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 1) return;
      selfScrollRef.current = true;
      el.scrollTop = el.scrollHeight;
   }, []);

   const scrollToBottom = useCallback(
      (smooth = false) => {
         setAtBottom(true);
         setUnseenBelow(0);
         glueToBottom(smooth);
      },
      [glueToBottom],
   );

   // Before the browser paints: a new message, or a room that just opened, lands at the bottom.
   useLayoutEffect(() => {
      const el = listRef.current;
      if (!el) return;
      if (prevBottomOffsetRef.current !== null) {
         // an older page was prepended: keep the reading position
         selfScrollRef.current = true;
         el.scrollTop = el.scrollHeight - prevBottomOffsetRef.current;
         prevBottomOffsetRef.current = null;
         return;
      }
      if (isPinned(el)) glueToBottom();
   }, [newestId, selectedId, typing, glueToBottom]);

   // A room opens with placeholder bubbles ("Decrypting…", photo spinners) that grow once the
   // bodies are decrypted and the photos arrive. One observer over the whole list follows every
   // one of those height changes, and for the first moments of a room it wins over everything.
   useEffect(() => {
      const el = listRef.current;
      const content = contentRef.current;
      if (!el || !content || typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => {
         if (Date.now() < settleUntilRef.current) setPinned(el, true);
         if (isPinned(el)) glueToBottom();
      });
      observer.observe(content);
      return () => observer.disconnect();
   }, [selectedId, messagesLoading, glueToBottom]);

   // opening a room (and its first page) starts a window where the view stays at the bottom
   useEffect(() => {
      if (!selectedId || messagesLoading) return;
      settleUntilRef.current = Date.now() + 2000;
      glueToBottom();
   }, [selectedId, messagesLoading, glueToBottom]);

   /* ---------------- in-room search ---------------- */

   const term = search.trim();
   /** ids of the loaded messages whose text contains the term, newest first */
   const hits = useMemo(() => {
      if (!term) return [];
      const needle = term.toLowerCase();
      return messages
         .filter((m) => !m.recalled && m.type !== 'image' && m.type !== 'sticker' && (bodyOf(m) ?? m.content).toLowerCase().includes(needle))
         .map((m) => m._id)
         .reverse();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [messages, term, plain]);

   // move the view onto the active hit (DOM only - no state is set here)
   useEffect(() => {
      if (!searchOpen || !hits.length) return;
      const id = hits[Math.min(hitIndex, hits.length - 1)];
      const el = listRef.current?.querySelector<HTMLElement>(`[data-message-id="${id}"]`);
      if (!el) return;
      // reading a hit further up must not be undone by the "stick to the bottom" logic
      setPinned(listRef.current, false);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('chat-highlight');
      const timer = setTimeout(() => el.classList.remove('chat-highlight'), 1600);
      return () => clearTimeout(timer);
   }, [hits, hitIndex, searchOpen]);

   const stepHit = (delta: number) => {
      if (!hits.length) return;
      setHitIndex((i) => (i + delta + hits.length) % hits.length);
   };

   const closeSearch = () => {
      setSearchOpen(false);
      setSearch('');
      setHitIndex(0);
   };

   /** a real scroll gesture ends the settle window - the reader is in charge from then on */
   const handleUserScroll = () => {
      settleUntilRef.current = 0;
   };

   const handleListScroll = () => {
      const el = listRef.current;
      if (!el) return;
      // our own scrollTop writes (and the settle window) must never unpin the view
      if (selfScrollRef.current) {
         selfScrollRef.current = false;
      } else if (Date.now() >= settleUntilRef.current) {
         const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
         setPinned(el, bottom);
         setAtBottom(bottom);
         if (bottom && unseenBelow) setUnseenBelow(0);
      }
      if (el.scrollTop > 80 || !hasNextPage || isFetchingNextPage) return;
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
      setMentionQuery(null);
      if (editing) {
         const target = editing;
         setEditing(null);
         setDraft('');
         stopTyping();
         if (content && content !== bodyOf(target)) editMessage.mutate({ message: target, content });
         return;
      }
      if ((!content && !staged.length) || !selectedId || sendText.isPending) return;
      const roomId = selectedId;
      const quoted = replyTo?._id;
      setDraft('');
      setReplyTo(null);
      stopTyping();
      if (staged.length) {
         const files = staged;
         setStaged([]);
         uploadStaged(roomId, files, quoted);
      }
      if (content) sendText.mutate({ content, replyTo: staged.length ? undefined : quoted });
   };

   /** members that match what has been typed after "@" */
   const mentionOptions: { _id: string; name: string; avatar: string | null }[] = (() => {
      if (mentionQuery === null || room?.type !== 'group') return [];
      const q = mentionQuery.toLowerCase();
      const people = room.members.filter((m) => m._id !== user?._id && m.name.toLowerCase().includes(q));
      const everyone = MENTION_ALL.toLowerCase().startsWith(q) ? [{ _id: MENTION_ALL, name: MENTION_ALL, avatar: null }] : [];
      return [...everyone, ...people].slice(0, 6);
   })();

   /** replace the "@…" token before the caret with the picked name */
   const insertMention = (name: string) => {
      const caret = caretRef.current;
      const at = draft.slice(0, caret).lastIndexOf('@');
      if (at < 0) return setMentionQuery(null);
      const next = `${draft.slice(0, at)}@${name} ${draft.slice(caret)}`;
      const position = at + name.length + 2;
      setDraft(next);
      setMentionQuery(null);
      caretRef.current = position;
      requestAnimationFrame(() => {
         const el = document.getElementById('chat-composer') as HTMLTextAreaElement | null;
         el?.focus();
         el?.setSelectionRange(position, position);
      });
   };

   const handleDraftChange = (value: string, caret: number) => {
      setDraft(value);
      caretRef.current = caret;
      // "@" at the start of a word, then anything but a space -> the member list
      const token = /(?:^|\s)@([^\s@]{0,24})$/.exec(value.slice(0, caret));
      if (room?.type === 'group' && token) {
         setMentionQuery(token[1]);
         setMentionIndex(0);
      } else if (mentionQuery !== null) {
         setMentionQuery(null);
      }
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

   /** Pick / paste / drop photos -> they wait in the composer until Send. */
   const handleImages = (list?: FileList | File[] | null) => {
      const files = Array.from(list ?? []).filter(Boolean);
      if (!files.length || !selectedId) return;
      if (fileRef.current) fileRef.current.value = '';
      const room = staged.length;
      const next: { id: string; file: File; preview: string }[] = [];
      for (const file of files) {
         if (room + next.length >= MAX_IMAGES_PER_SEND) {
            toast.info(`Up to ${MAX_IMAGES_PER_SEND} photos per message`);
            break;
         }
         if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) {
            toast.warning(`${file.name}: JPG, PNG, GIF or WebP only`);
            continue;
         }
         if (file.size > MAX_IMAGE_BYTES) {
            toast.warning(`${file.name}: must be under 5 MB`);
            continue;
         }
         next.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, file, preview: URL.createObjectURL(file) });
      }
      if (next.length) setStaged((cur) => [...cur, ...next]);
   };

   const unstage = (id: string) =>
      setStaged((cur) => {
         const item = cur.find((x) => x.id === id);
         if (item) URL.revokeObjectURL(item.preview);
         return cur.filter((x) => x.id !== id);
      });

   /** Upload the staged photos in order (first one carries the reply), with a progress row each. */
   const uploadStaged = async (roomId: string, files: { id: string; file: File; preview: string }[], quoted?: string) => {
      // photos of one Send share an album id -> rendered as a single grid bubble
      const album = files.length > 1 ? newAlbumId() : undefined;
      const items: UploadItem[] = files.map((f) => ({ id: f.id, name: f.file.name, preview: f.preview, progress: 0, status: 'uploading' }));
      setUploads((u) => [...u, ...items]);
      const update = (id: string, patch: Partial<UploadItem>) => setUploads((u) => u.map((it) => (it.id === id ? { ...it, ...patch } : it)));
      for (const [i, f] of files.entries()) {
         try {
            const enc = await roomKeys.encryptFile(roomId, f.file);
            if (!enc) throw new Error('could not encrypt the photo');
            const res = await apiChatSendImage(roomId, enc.blob, i === 0 ? quoted : undefined, (p) => update(f.id, { progress: p }), album, {
               keyId: enc.keyId,
               iv: enc.iv,
               contentType: enc.contentType,
            });
            if (!res.success || !res.data) throw new Error(res.message);
            update(f.id, { progress: 100, status: 'done' });
            upsertMessage(roomId, { ...res.data, isMine: true });
            queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
         } catch (error) {
            update(f.id, { status: 'error' });
            toast.error(`${f.file.name}: ${(error as Error).message || 'upload failed'}`);
         }
      }
      setTimeout(() => {
         files.forEach((f) => URL.revokeObjectURL(f.preview));
         setUploads((u) => u.filter((it) => !files.some((f) => f.id === it.id)));
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

   const pinMessage = async (messageId: string | null) => {
      if (!room) return;
      const res = await apiChatPinMessage(room._id, messageId);
      if (!res.success) return toast.error(res.message || 'Could not pin the message');
      toast.success(messageId ? 'Message pinned' : 'Message unpinned');
      invalidateRoom(room._id);
   };

   const toggleMute = async () => {
      if (!room) return;
      const res = await apiChatMuteRoom(room._id, !room.muted);
      if (!res.success) return toast.error(res.message || 'Could not update notifications');
      toast.success(room.muted ? 'Notifications on' : 'Notifications off for this chat');
      queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
   };

   const setRole = async (userId: string, role: 'owner' | 'admin' | 'member') => {
      const res = await apiChatSetRole(room!._id, userId, role);
      if (!res.success) return toast.error(res.message || 'Could not change role');
      invalidateRoom(room!._id);
   };

   /** Group photo (owner / admin). Stored like any chat image and shown from a signed URL. */
   const uploadGroupAvatar = async (file?: File | null) => {
      if (!file || !room) return;
      if (avatarRef.current) avatarRef.current.value = '';
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast.warning('JPG, PNG or WebP only');
      if (file.size > MAX_IMAGE_BYTES) return toast.warning('The photo must be under 5 MB');
      setAvatarBusy(true);
      const res = await apiChatSetGroupAvatar(room._id, file);
      setAvatarBusy(false);
      if (!res.success) return toast.error(res.message || 'Could not update the group photo');
      toast.success('Group photo updated');
      invalidateRoom(room._id);
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

   /** every name that renders as a mention chip inside a bubble */
   const mentionNames = room ? [MENTION_ALL, ...room.members.map((m) => m.name)] : [];

   /** members (other than me) whose lastReadAt is at or after the newest message I sent */
   const lastMine = [...messages].reverse().find((m) => m.isMine && m.type !== 'system');
   const seenBy =
      room && lastMine
         ? room.members.filter((m) => m._id !== user?._id && new Date(m.lastReadAt).getTime() >= new Date(lastMine.createdAt).getTime())
         : [];

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
            <span className={clsx('text-xs truncate', m.replyTo.recalled && 'italic')}>{quoteOf(m)}</span>
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
      const body = bodyOf(m);
      if (body === null && m.cipher && m.type !== 'image') {
         return (
            <div className="flex gap-1.5 items-center px-3.5 py-2 text-[13px] text-gray-400 bg-white rounded-2xl ring-1 ring-black/5">
               {plain[bodySlot(m)] === '\u0000' ? 'Message unavailable' : 'Decrypting…'}
            </div>
         );
      }
      if (m.type === 'sticker' && body) {
         return (
            <div className="flex flex-col gap-1">
               {renderQuote(m)}
               <Sticker key={packsReady ? 'p' : 'np'} id={body} size={160} />
            </div>
         );
      }
      const link = body ? firstUrl(body) : null;
      if (m.type === 'text' && EMOJI_ONLY.test((body ?? '').trim())) {
         // emoji-only messages: big, no bubble (like Messenger)
         return (
            <div className="flex flex-col gap-1">
               {renderQuote(m)}
               <span className="text-5xl leading-tight drop-shadow-sm" style={{ letterSpacing: '0.1em' }}>{(body ?? '').trim()}</span>
            </div>
         );
      }
      if (m.type === 'image' && m.imageUrl) {
         // shown whole (no crop, no rounding); click opens the full-size preview
         return (
            <div className="flex flex-col gap-1">
               {renderQuote(m)}
               {m.image ? (
                  <EncryptedImage keys={roomKeys} roomId={selectedId as string} url={m.imageUrl} keyId={m.image.keyId} iv={m.image.iv} className="block h-auto max-w-full" style={{ maxWidth: 440 }} rootClassName="block max-w-full shadow-sm" />
               ) : (
                  <Image src={m.imageUrl} alt="photo" className="block h-auto max-w-full" style={{ maxWidth: 440 }} rootClassName="block max-w-full shadow-sm" />
               )}
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
            <Linkified text={body ?? ''} mine={m.isMine} mentions={mentionNames} highlight={searchOpen ? term : ''} />
            {m.editedAt && (
               <span className={clsx('ml-1.5 text-[11px] align-baseline', m.isMine ? 'text-blue-100/80' : 'text-gray-400')} title={`Edited ${moment(m.editedAt).calendar()}`}>
                  (edited)
               </span>
            )}
            {link && <LinkPreview url={link} mine={m.isMine} />}
         </div>
      );
   };

   /** Several photos sent together: one bubble, 2- or 3-column grid, each opens the preview. */
   const renderAlbum = (items: ChatMessage[]) => {
      const live = items.filter((x) => !x.recalled && x.imageUrl);
      const cols = live.length <= 2 ? 2 : 3;
      return (
         <div className="flex flex-col gap-1">
            {renderQuote(items[0])}
            <Image.PreviewGroup>
               <div className={clsx('grid gap-1 overflow-hidden rounded-2xl', cols === 2 ? 'grid-cols-2' : 'grid-cols-3')} style={{ width: cols === 2 ? 300 : 360, maxWidth: '100%' }}>
                  {live.map((x) =>
                     x.image ? (
                        <EncryptedImage key={x._id} keys={roomKeys} roomId={selectedId as string} url={x.imageUrl as string} keyId={x.image.keyId} iv={x.image.iv} className="block object-cover w-full aspect-square" rootClassName="block" />
                     ) : (
                        <Image key={x._id} src={x.imageUrl as string} alt="photo" className="block object-cover w-full aspect-square" rootClassName="block" />
                     ),
                  )}
               </div>
            </Image.PreviewGroup>
            {items.length !== live.length && <span className="text-[11px] italic text-gray-400">{items.length - live.length} photo(s) recalled</span>}
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
            {(room?.type === 'direct' || canManage) && !m.recalled && (
               <button
                  type="button"
                  onClick={() => pinMessage(room?.pinned?._id === m._id ? null : m._id)}
                  className={`${iconButton} w-7 h-7 text-gray-400 hover:bg-white hover:text-amber-600`}
                  aria-label={room?.pinned?._id === m._id ? 'Unpin' : 'Pin'}
               >
                  {room?.pinned?._id === m._id ? <PiPushPinSlashBold size={14} /> : <PiPushPinFill size={13} />}
               </button>
            )}
            {m.isMine && m.type === 'text' && (
               <button
                  type="button"
                  onClick={() => {
                     setReplyTo(null);
                     setEditing(m);
                     setDraft(bodyOf(m) ?? '');
                  }}
                  className={`${iconButton} w-7 h-7 text-gray-400 hover:bg-white hover:text-emerald-600`}
                  aria-label="Edit"
               >
                  <FiEdit2 size={13} />
               </button>
            )}
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
                                    <span className="flex flex-shrink-0 gap-1 items-center text-[11px] text-gray-400">
                                       {r.muted && <FiBellOff size={11} />}
                                       {r.lastMessage ? moment(r.lastMessage.createdAt).fromNow(true) : ''}
                                    </span>
                                 </span>
                                 <span className="flex gap-2 justify-between items-center mt-0.5">
                                    <span className={clsx('text-[13px] truncate', isTyping ? 'text-blue-600 italic' : r.unreadCount ? 'font-medium text-gray-800' : 'text-gray-500')}>
                                       {isTyping ? typingLabel(roomTypers) : roomPreview(r)}
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
                        <FiLock size={12} /> Messages and photos are encrypted in your browser before they are sent, and stored encrypted.
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
                        <span
                           className="hidden gap-1 items-center px-2.5 py-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 rounded-full sm:flex"
                           title="Message bodies are encrypted in your browser before they are sent"
                        >
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
                        <Tooltip title="Search in this conversation">
                           <button
                              type="button"
                              onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
                              className={`${iconButton} w-9 h-9 ${searchOpen ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}`}
                              aria-label="Search messages"
                           >
                              <FiSearch size={16} />
                           </button>
                        </Tooltip>
                        <Tooltip title={room.muted ? 'Notifications are off for this chat' : 'Turn notifications off for this chat'}>
                           <button
                              type="button"
                              onClick={toggleMute}
                              className={`${iconButton} w-9 h-9 ${room.muted ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'}`}
                              aria-label="Toggle notifications"
                           >
                              {room.muted ? <FiBellOff size={16} /> : <FiBell size={16} />}
                           </button>
                        </Tooltip>
                        {room.type === 'group' && (
                           <button type="button" onClick={() => setMembersOpen(true)} className="flex gap-1.5 items-center px-3 h-9 text-sm font-medium text-gray-700 bg-gray-100 rounded-full border-none cursor-pointer hover:bg-gray-200">
                              <FiUsers size={15} /> <span className="hidden sm:inline">{room.members.length}</span>
                           </button>
                        )}
                     </div>

                     {/* search inside the conversation */}
                     {searchOpen && (
                        <div className="flex gap-2 items-center px-3 py-2 bg-white border-b border-gray-100 sm:px-5">
                           <Input
                              autoFocus
                              allowClear
                              prefix={<FiSearch className="text-gray-400" />}
                              placeholder="Search in this conversation"
                              value={search}
                              onChange={(e) => {
                                 setSearch(e.target.value);
                                 setHitIndex(0);
                              }}
                              className="h-9 bg-gray-100 rounded-full border-none"
                           />
                           <span className="flex-shrink-0 text-xs tabular-nums text-gray-400 min-w-[52px] text-center">
                              {term ? (hits.length ? `${Math.min(hitIndex, hits.length - 1) + 1} / ${hits.length}` : 'No hits') : ''}
                           </span>
                           <button type="button" onClick={() => stepHit(1)} disabled={hits.length < 2} className={`${iconButton} w-8 h-8 text-gray-500 hover:bg-gray-100`} aria-label="Older hit">
                              <FiChevronUp size={16} />
                           </button>
                           <button type="button" onClick={() => stepHit(-1)} disabled={hits.length < 2} className={`${iconButton} w-8 h-8 text-gray-500 hover:bg-gray-100`} aria-label="Newer hit">
                              <FiChevronDown size={16} />
                           </button>
                           <button type="button" onClick={closeSearch} className={`${iconButton} w-8 h-8 text-gray-500 hover:bg-gray-100`} aria-label="Close search">
                              <FiX size={16} />
                           </button>
                        </div>
                     )}
                     {searchOpen && term && hasNextPage && (
                        <button
                           type="button"
                           onClick={() => fetchNextPage()}
                           disabled={isFetchingNextPage}
                           className="px-3 py-1.5 w-full text-[11px] text-blue-700 bg-blue-50 border-none border-b border-blue-100 cursor-pointer hover:bg-blue-100 sm:px-5"
                        >
                           {isFetchingNextPage ? 'Loading older messages…' : 'Searching the loaded messages — click to load older ones'}
                        </button>
                     )}

                     {/* pinned message */}
                     {room.pinned && (
                        <div className="flex gap-2 items-center px-3 py-2 bg-amber-50 border-b border-amber-100 sm:px-5">
                           <PiPushPinFill className="flex-shrink-0 text-amber-600" size={14} />
                           <button
                              type="button"
                              onClick={() => jumpTo(room.pinned!._id)}
                              className="flex-1 min-w-0 text-left bg-transparent border-none cursor-pointer"
                           >
                              <p className="text-[11px] font-semibold text-amber-700">Pinned · {room.pinned.sender?.name ?? 'System'}</p>
                              <p className="text-xs text-gray-700 truncate">
                                 {room.pinned.type === 'image'
                                    ? '📷 Photo'
                                    : room.pinned.type === 'sticker'
                                      ? '🙂 Sticker'
                                      : (bodyOf(room.pinned) ?? '…')}
                              </p>
                           </button>
                           {(room.type === 'direct' || canManage) && (
                              <button type="button" onClick={() => pinMessage(null)} className={`${iconButton} w-7 h-7 text-amber-700 hover:bg-white`} aria-label="Unpin">
                                 <FiX size={14} />
                              </button>
                           )}
                        </div>
                     )}

                     {/* messages */}
                     <div
                        ref={listRef}
                        onScroll={handleListScroll}
                        onWheel={handleUserScroll}
                        onTouchMove={handleUserScroll}
                        onMouseDown={handleUserScroll}
                        onKeyDown={handleUserScroll}
                        className="flex overflow-y-auto flex-col flex-1 px-3 py-4 nice-scrollbar sm:px-6"
                        // overflow-anchor: the browser must not "helpfully" hold the view still
                        // while decrypted bodies and photos grow the list
                        style={{ backgroundImage: 'radial-gradient(rgba(59,130,246,0.08) 1px, transparent 1px)', backgroundSize: '22px 22px', overflowAnchor: 'none' }}
                     >
                        <div ref={contentRef} className="mt-auto">
                        {isFetchingNextPage && (
                           <div className="flex justify-center py-2">
                              <span className="flex gap-2 items-center px-3 h-7 text-[11px] font-medium text-gray-500 bg-white rounded-full shadow-sm ring-1 ring-black/5">
                                 <span className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                                 Loading older messages
                              </span>
                           </div>
                        )}
                        {messagesLoading ? (
                           // ghost conversation: alternating bubbles, so the shape matches what arrives
                           <div className="flex flex-col gap-2 justify-end animate-pulse">
                              {[
                                 { mine: false, width: 'w-52' },
                                 { mine: false, width: 'w-36' },
                                 { mine: true, width: 'w-44' },
                                 { mine: true, width: 'w-64' },
                                 { mine: false, width: 'w-56' },
                                 { mine: true, width: 'w-40' },
                                 { mine: false, width: 'w-48' },
                              ].map((bubble, index) => (
                                 <div key={index} className={clsx('flex gap-2 items-end', bubble.mine ? 'justify-end' : 'justify-start')}>
                                    {!bubble.mine && <span className="flex-shrink-0 w-7 h-7 bg-gray-200 rounded-full" />}
                                    <span className={clsx('h-9 max-w-[72%] rounded-2xl', bubble.width, bubble.mine ? 'bg-blue-100' : 'bg-white ring-1 ring-black/5')} />
                                 </div>
                              ))}
                           </div>
                        ) : (
                           messages.map((m, i) => {
                              const prev = messages[i - 1];
                              // photos of one Send: the first one draws the whole album, the rest are skipped
                              if (m.type === 'image' && m.album && prev?.type === 'image' && prev.album === m.album && prev.sender?._id === m.sender?._id) return null;
                              const albumItems =
                                 m.type === 'image' && m.album
                                    ? (() => {
                                         const items: ChatMessage[] = [];
                                         for (let j = i; j < messages.length; j++) {
                                            const x = messages[j];
                                            if (x.type !== 'image' || x.album !== m.album || x.sender?._id !== m.sender?._id) break;
                                            items.push(x);
                                         }
                                         return items;
                                      })()
                                    : null;
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
                                          {albumItems && albumItems.length > 1 ? renderAlbum(albumItems) : renderBubble(m)}
                                          {renderReactions(m)}
                                       </div>
                                       {!m.isMine && renderActions(m)}
                                    </div>
                                 </React.Fragment>
                              );
                           })
                        )}
                        {seenBy.length > 0 && (
                           <div className="flex justify-end mt-1 pr-1">
                              <Popover
                                 trigger="click"
                                 placement="topRight"
                                 content={
                                    <div className="max-h-64 overflow-y-auto w-[200px]">
                                       <p className="mb-1 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">Seen by · {seenBy.length}</p>
                                       {seenBy.map((m) => (
                                          <div key={m._id} className="flex gap-2 items-center py-1">
                                             <UserAvatar size={24} src={m.avatar} name={m.name} />
                                             <span className="text-sm text-gray-800 truncate">{m.name}</span>
                                          </div>
                                       ))}
                                    </div>
                                 }
                              >
                                 <Tooltip title={seenBy.map((m) => m.name).join(', ')} placement="top">
                                    {/* avatars only, like Zalo / Telegram: hover for names, click for the list */}
                                    <button type="button" className="flex -space-x-1.5 p-0 bg-transparent border-none cursor-pointer" aria-label="Who has seen this">
                                       {seenBy.slice(0, 5).map((m) => (
                                          <UserAvatar key={m._id} size={16} src={m.avatar} name={m.name} className="ring-2 ring-[#f4f6fb]" />
                                       ))}
                                       {seenBy.length > 5 && (
                                          <span className="flex justify-center items-center w-4 h-4 text-[9px] font-bold text-gray-600 bg-gray-200 rounded-full ring-2 ring-[#f4f6fb]">
                                             +{seenBy.length - 5}
                                          </span>
                                       )}
                                    </button>
                                 </Tooltip>
                              </Popover>
                           </div>
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
                     </div>

                     {/* jump back to the newest message */}
                     {(!atBottom || unseenBelow > 0) && (
                        <button
                           type="button"
                           onClick={() => scrollToBottom(true)}
                           className="flex absolute right-5 bottom-24 z-10 gap-1.5 items-center px-3 h-9 text-sm font-semibold text-white bg-blue-600 rounded-full border-none shadow-lg cursor-pointer hover:bg-blue-700"
                           aria-label="Jump to the newest message"
                        >
                           <FiChevronDown size={16} />
                           {unseenBelow > 0 && <span>{unseenBelow} new</span>}
                        </button>
                     )}

                     {/* composer */}
                     <div className="relative px-2 py-2 bg-white/90 border-t border-gray-100 backdrop-blur sm:px-4 sm:py-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                        {mentionQuery !== null && mentionOptions.length > 0 && (
                           <div className="overflow-hidden absolute right-2 bottom-full left-2 z-20 mb-2 bg-white rounded-2xl shadow-xl ring-1 ring-black/5">
                              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">Mention a member</p>
                              {mentionOptions.map((m, i) => (
                                 <button
                                    key={m._id}
                                    type="button"
                                    // keep the caret in the textarea while picking with the mouse
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => insertMention(m.name)}
                                    className={clsx(
                                       'flex gap-2 items-center px-3 py-2 w-full text-left border-none cursor-pointer',
                                       i === Math.min(mentionIndex, mentionOptions.length - 1) ? 'bg-blue-50' : 'bg-transparent hover:bg-gray-50',
                                    )}
                                 >
                                    {m._id === MENTION_ALL ? (
                                       <span className="flex flex-shrink-0 justify-center items-center w-7 h-7 text-sm font-bold text-white bg-blue-500 rounded-full">@</span>
                                    ) : (
                                       <UserAvatar size={28} src={m.avatar} name={m.name} />
                                    )}
                                    <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">{m.name}</span>
                                    {m._id === MENTION_ALL && <span className="text-[11px] text-gray-400">Everyone</span>}
                                 </button>
                              ))}
                           </div>
                        )}
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
                        {staged.length > 0 && (
                           <div className="flex gap-2 items-center px-1 pb-2 mb-2 overflow-x-auto border-b border-gray-100">
                              {staged.map((f) => (
                                 <div key={f.id} className="relative flex-shrink-0 w-[72px] h-[72px]">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={f.preview} alt="" className="object-cover w-full h-full rounded-xl ring-1 ring-black/10" />
                                    <button type="button" onClick={() => unstage(f.id)} className="flex absolute -top-1.5 -right-1.5 justify-center items-center w-5 h-5 text-white bg-gray-800 rounded-full border-2 border-white cursor-pointer hover:bg-red-500" aria-label="Remove photo">
                                       <FiX size={11} />
                                    </button>
                                 </div>
                              ))}
                              <button type="button" onClick={() => fileRef.current?.click()} className="flex flex-shrink-0 justify-center items-center w-[72px] h-[72px] text-gray-400 bg-gray-50 rounded-xl border-2 border-gray-200 border-dashed cursor-pointer hover:text-blue-600 hover:border-blue-300" aria-label="Add more photos">
                                 <FiPlus size={20} />
                              </button>
                              <span className="flex-shrink-0 ml-1 text-xs text-gray-400">{staged.length}/{MAX_IMAGES_PER_SEND}</span>
                           </div>
                        )}
                        {editing && (
                           <div className="flex gap-2 items-center px-3 py-2 mb-2 bg-emerald-50 rounded-2xl border-l-4 border-emerald-500">
                              <FiEdit2 className="flex-shrink-0 text-emerald-600" size={14} />
                              <div className="flex-1 min-w-0">
                                 <p className="text-[11px] font-semibold text-emerald-700">Editing message</p>
                                 <p className="text-xs text-gray-600 truncate">{bodyOf(editing) ?? ''}</p>
                              </div>
                              <button
                                 type="button"
                                 onClick={() => {
                                    setEditing(null);
                                    setDraft('');
                                 }}
                                 className={`${iconButton} w-7 h-7 text-gray-500 hover:bg-white`}
                                 aria-label="Cancel editing"
                              >
                                 <FiX size={14} />
                              </button>
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
                              id="chat-composer"
                              placeholder={
                                 editing
                                    ? 'Edit your message, Enter to save, Esc to cancel'
                                    : uploading
                                      ? 'Uploading photos…'
                                      : staged.length
                                        ? 'Add a caption (optional) and press Send'
                                        : room.type === 'group'
                                          ? 'Type a message, @ to mention…'
                                          : 'Type a message…'
                              }
                              className="bg-transparent! border-none! shadow-none! py-2! px-2! text-[15px]! resize-none! focus:shadow-none!"
                              value={draft}
                              autoSize={{ minRows: 1, maxRows: 5 }}
                              maxLength={4000}
                              onChange={(e) => handleDraftChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                              onSelect={(e) => {
                                 caretRef.current = (e.target as HTMLTextAreaElement).selectionStart ?? 0;
                              }}
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
                              // Enter is handled here (not onPressEnter) so the mention list can claim it first
                              onKeyDown={(e) => {
                                 const picking = mentionQuery !== null && mentionOptions.length > 0;
                                 const active = Math.min(mentionIndex, mentionOptions.length - 1);
                                 if (picking && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                                    e.preventDefault();
                                    setMentionIndex((i) => (Math.min(i, mentionOptions.length - 1) + (e.key === 'ArrowDown' ? 1 : mentionOptions.length - 1)) % mentionOptions.length);
                                    return;
                                 }
                                 if (picking && (e.key === 'Enter' || e.key === 'Tab')) {
                                    e.preventDefault();
                                    insertMention(mentionOptions[active].name);
                                    return;
                                 }
                                 if (e.key === 'Escape') {
                                    if (mentionQuery !== null) return setMentionQuery(null);
                                    if (editing) {
                                       setEditing(null);
                                       setDraft('');
                                    }
                                    return;
                                 }
                                 if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                 }
                              }}
                           />
                           <Button
                              type="primary"
                              shape="circle"
                              size="large"
                              icon={editing ? <FiCheck /> : <FiSend />}
                              className={clsx('flex-shrink-0 border-none', draft.trim() || staged.length ? 'bg-gradient-to-br from-blue-600 to-indigo-500 shadow-md shadow-blue-200' : 'bg-gray-200!')}
                              loading={sendText.isPending || editMessage.isPending}
                              disabled={!draft.trim() && !staged.length}
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
                     <div className="relative">
                        <RoomAvatar room={room} size={72} />
                        {canManage && (
                           <>
                              <input
                                 ref={avatarRef}
                                 type="file"
                                 accept="image/jpeg,image/png,image/webp"
                                 className="hidden"
                                 onChange={(e) => uploadGroupAvatar(e.target.files?.[0])}
                              />
                              <Tooltip title={room.avatar ? 'Change the group photo' : 'Add a group photo'}>
                                 <button
                                    type="button"
                                    onClick={() => avatarRef.current?.click()}
                                    disabled={avatarBusy}
                                    className="flex absolute -right-1 -bottom-1 justify-center items-center w-8 h-8 text-white bg-blue-600 rounded-full border-2 border-white shadow-md cursor-pointer hover:bg-blue-700 disabled:opacity-60"
                                    aria-label="Change the group photo"
                                 >
                                    {avatarBusy ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <FiCamera size={14} />}
                                 </button>
                              </Tooltip>
                           </>
                        )}
                     </div>
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

                  <div className="flex gap-1 px-4 pt-3">
                     {(['members', 'media'] as const).map((tab) => (
                        <button
                           key={tab}
                           type="button"
                           onClick={() => setDrawerTab(tab)}
                           className={clsx(
                              'flex-1 px-3 h-9 text-sm font-semibold rounded-xl border-none cursor-pointer capitalize',
                              drawerTab === tab ? 'text-white bg-blue-600' : 'text-gray-600 bg-gray-100 hover:bg-gray-200',
                           )}
                        >
                           {tab === 'members' ? `Members · ${room.members.length}` : 'Media'}
                        </button>
                     ))}
                  </div>

                  {drawerTab === 'media' ? (
                     <div className="overflow-y-auto flex-1 p-4 nice-scrollbar">
                        {mediaLoading ? (
                           <div className="grid grid-cols-3 gap-1.5">
                              {Array.from({ length: 9 }).map((_, i) => (
                                 <span key={i} className="bg-gray-200 rounded-lg animate-pulse aspect-square" />
                              ))}
                           </div>
                        ) : media.length === 0 ? (
                           <Empty className="py-16" image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-gray-400">No photos shared yet</span>} />
                        ) : (
                           <Image.PreviewGroup>
                              <div className="grid grid-cols-3 gap-1.5">
                                 {media.map((m) =>
                                    m.image && m.imageUrl ? (
                                       <EncryptedImage
                                          key={m._id}
                                          keys={roomKeys}
                                          roomId={room._id}
                                          url={m.imageUrl}
                                          keyId={m.image.keyId}
                                          iv={m.image.iv}
                                          className="object-cover w-full rounded-lg aspect-square"
                                          rootClassName="block"
                                       />
                                    ) : m.imageUrl ? (
                                       <Image key={m._id} src={m.imageUrl} alt="photo" className="object-cover w-full rounded-lg aspect-square" rootClassName="block" />
                                    ) : null,
                                 )}
                              </div>
                           </Image.PreviewGroup>
                        )}
                     </div>
                  ) : (
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
                              <Popconfirm
                                 title={`Make ${m.name} the group owner? You stay as an admin.`}
                                 okText="Hand over"
                                 onConfirm={() => setRole(m._id, 'owner')}
                              >
                                 <button type="button" className={`${iconButton} w-8 h-8 text-gray-400 hover:text-amber-600 hover:bg-amber-50`} aria-label={`Make ${m.name} owner`}>
                                    <FiAward size={15} />
                                 </button>
                              </Popconfirm>
                           )}
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
                  )}

                  <div className="flex flex-col gap-2 p-4 border-t border-gray-100">
                     {canManage && drawerTab === 'members' && <Button icon={<FiUserPlus />} onClick={() => setAddOpen(true)} className="h-10 rounded-xl">Add members</Button>}
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
