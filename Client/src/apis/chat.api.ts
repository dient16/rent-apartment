import axios from './axiosConfig';

/** Standalone chat (/chat) - separate from the listing messenger APIs. */

export interface ChatUser {
   _id: string;
   name: string;
   avatar: string | null;
   email?: string;
}
export type ChatRole = 'owner' | 'admin' | 'member';
export interface ChatMember extends ChatUser {
   role: ChatRole;
   /** everything created before this has been seen by the member ("seen by" ticks) */
   lastReadAt: string;
}
export type ChatMessageType = 'text' | 'image' | 'sticker' | 'system';
/** browser-side AES-GCM payload (base64) */
export interface CipherPayload {
   keyId: string;
   iv: string;
   data: string;
}

export interface ChatRoom {
   _id: string;
   type: 'direct' | 'group';
   name?: string;
   avatar: string | null;
   members: ChatMember[];
   myRole: ChatRole;
   /** this member turned notifications off for the room */
   muted: boolean;
   /** message kept at the top of the room */
   pinned: ChatMessage | null;
   lastMessage: {
      content: string;
      /** encrypted preview: decrypt in the browser */
      cipher: CipherPayload | null;
      type: ChatMessageType;
      recalled: boolean;
      senderName: string;
      isMine: boolean;
      createdAt: string;
   } | null;
   unreadCount: number;
   updatedAt: string;
}
export interface ChatMessage {
   _id: string;
   type: ChatMessageType;
   /** plaintext for system / older messages; empty when the body is in `cipher` */
   content: string;
   /** encrypted body (text or sticker id) - decrypt with the room key */
   cipher: CipherPayload | null;
   /** signed, short-lived URL - image messages only */
   imageUrl: string | null;
   /** photos: the bytes behind imageUrl are encrypted with this iv under keyId */
   image: { keyId: string; iv: string } | null;
   /** "<pack>/<name>" - sticker messages only */
   sticker: string | null;
   /** photos sent together share this id and render as one grid */
   album: string | null;
   recalled: boolean;
   /** set when the sender edited the body */
   editedAt: string | null;
   /** ids of the members named with @ (the body is encrypted, so they travel beside it) */
   mentions: string[];
   reactions: { emoji: string; count: number; mine: boolean; users: string[] }[];
   /** quoted message, when this is a reply */
   replyTo: { _id: string; type: ChatMessageType; preview: string; senderName: string; recalled: boolean; cipher?: CipherPayload | null } | null;
   sender: ChatUser | null;
   isMine: boolean;
   createdAt: string;
}

export const apiChatRooms = (): Promise<Res<{ rooms: ChatRoom[]; totalUnread: number }>> =>
   axios({ url: '/chat/rooms', method: 'get' });

export const apiChatDirect = (userId: string): Promise<Res<ChatRoom>> =>
   axios({ url: '/chat/rooms/direct', method: 'post', data: { userId } });

export const apiChatCreateGroup = (name: string, memberIds: string[]): Promise<Res<ChatRoom>> =>
   axios({ url: '/chat/rooms/group', method: 'post', data: { name, memberIds } });

export const apiChatRenameGroup = (roomId: string, name: string): Promise<Res<ChatRoom>> =>
   axios({ url: `/chat/rooms/${roomId}`, method: 'patch', data: { name } });

export const apiChatAddMembers = (roomId: string, memberIds: string[]): Promise<Res<ChatRoom>> =>
   axios({ url: `/chat/rooms/${roomId}/members`, method: 'post', data: { memberIds } });

export const apiChatPinMessage = (roomId: string, messageId: string | null): Promise<Res<ChatRoom>> =>
   axios({ url: `/chat/rooms/${roomId}/pin`, method: 'post', data: { messageId } });

export const apiChatMuteRoom = (roomId: string, muted: boolean): Promise<Res<ChatRoom>> =>
   axios({ url: `/chat/rooms/${roomId}/mute`, method: 'post', data: { muted } });

export const apiChatSetRole = (roomId: string, userId: string, role: 'owner' | 'admin' | 'member'): Promise<Res<ChatRoom>> =>
   axios({ url: `/chat/rooms/${roomId}/members/${userId}`, method: 'patch', data: { role } });

export const apiChatRemoveMember = (roomId: string, userId: string): Promise<Res> =>
   axios({ url: `/chat/rooms/${roomId}/members/${userId}`, method: 'delete' });

export const apiChatMessages = (
   roomId: string,
   before?: string,
): Promise<Res<{ messages: ChatMessage[]; hasMore: boolean }>> =>
   axios({
      url: `/chat/rooms/${roomId}/messages`,
      method: 'get',
      params: { limit: 40, ...(before ? { before } : {}) },
   });

export const apiChatSend = (roomId: string, content: string, replyTo?: string): Promise<Res<ChatMessage>> =>
   axios({ url: `/chat/rooms/${roomId}/messages`, method: 'post', data: { content, ...(replyTo ? { replyTo } : {}) } });

/** text / sticker body, already encrypted in the browser with the room key */
export const apiChatSendEncrypted = (
   roomId: string,
   type: 'text' | 'sticker',
   cipher: CipherPayload,
   replyTo?: string,
   mentions?: string[],
): Promise<Res<ChatMessage>> =>
   axios({
      url: `/chat/rooms/${roomId}/messages`,
      method: 'post',
      data: { type, cipher, ...(replyTo ? { replyTo } : {}), ...(mentions?.length ? { mentions } : {}) },
   });

/** Every photo shared in a room, newest first (group media tab) */
export const apiChatMedia = (roomId: string, before?: string): Promise<Res<{ media: ChatMessage[]; hasMore: boolean }>> =>
   axios({ url: `/chat/rooms/${roomId}/media`, method: 'get', params: { limit: 30, ...(before ? { before } : {}) } });

/** Group photo (owner / admin only) */
export const apiChatSetGroupAvatar = (roomId: string, file: File): Promise<Res<ChatRoom>> => {
   const data = new FormData();
   data.append('image', file, file.name);
   return axios({ url: `/chat/rooms/${roomId}/avatar`, method: 'post', data });
};

export const apiChatSendImage = (
   roomId: string,
   file: File | Blob,
   replyTo?: string,
   onProgress?: (percent: number) => void,
   album?: string,
   /** the blob is ciphertext; keyId + iv + the real content type travel alongside */
   e2e?: { keyId: string; iv: string; contentType: string },
): Promise<Res<ChatMessage>> => {
   const data = new FormData();
   data.append('image', file, e2e ? 'photo.bin' : (file as File).name);
   if (replyTo) data.append('replyTo', replyTo);
   if (album) data.append('album', album);
   if (e2e) {
      data.append('keyId', e2e.keyId);
      data.append('iv', e2e.iv);
      data.append('contentType', e2e.contentType);
   }
   return axios({
      url: `/chat/rooms/${roomId}/images`,
      method: 'post',
      data,
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
   });
};

/** Title / description / image of a URL pasted into the chat (null when it has no preview) */
export const apiChatLinkPreview = (
   url: string,
): Promise<Res<{ url: string; title: string; description: string; image: string | null; siteName: string } | null>> =>
   axios({ url: '/chat/link-preview', method: 'get', params: { url }, skipErrorToast: true } as never);

/* ---- room key ---- */
/** The room's AES key (base64). Every member gets the same one; it is what encrypts request bodies. */
export const apiChatRoomKey = (roomId: string): Promise<Res<{ keyId: string; key: string }>> =>
   axios({ url: `/chat/rooms/${roomId}/key`, method: 'get' });

/** Replace the body of a text message you sent (encrypted like a new one) */
export const apiChatEditMessage = (messageId: string, cipher: CipherPayload): Promise<Res<ChatMessage>> =>
   axios({ url: `/chat/messages/${messageId}`, method: 'patch', data: { cipher } });

/** Toggle an emoji on a message */
export const apiChatReact = (messageId: string, emoji: string): Promise<Res<ChatMessage>> =>
   axios({ url: `/chat/messages/${messageId}/react`, method: 'post', data: { emoji } });

export const apiChatRecall = (messageId: string): Promise<Res<ChatMessage>> =>
   axios({ url: `/chat/messages/${messageId}/recall`, method: 'post' });

export const apiChatMarkRead = (roomId: string): Promise<Res> =>
   axios({ url: `/chat/rooms/${roomId}/read`, method: 'post', skipErrorToast: true } as never);

export const apiChatSearchUsers = (q: string): Promise<Res<ChatUser[]>> =>
   axios({ url: '/chat/users', method: 'get', params: { q, limit: 10 } });
