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
}
export type ChatMessageType = 'text' | 'image' | 'sticker' | 'system';
export interface ChatRoom {
   _id: string;
   type: 'direct' | 'group';
   name?: string;
   avatar: string | null;
   members: ChatMember[];
   myRole: ChatRole;
   lastMessage: {
      content: string;
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
   /** text / system only */
   content: string;
   /** signed, short-lived URL - image messages only */
   imageUrl: string | null;
   /** "<pack>/<name>" - sticker messages only */
   sticker: string | null;
   recalled: boolean;
   reactions: { emoji: string; count: number; mine: boolean; users: string[] }[];
   /** quoted message, when this is a reply */
   replyTo: { _id: string; type: ChatMessageType; preview: string; senderName: string; recalled: boolean } | null;
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

export const apiChatSetRole = (roomId: string, userId: string, role: 'admin' | 'member'): Promise<Res<ChatRoom>> =>
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

export const apiChatSendSticker = (roomId: string, sticker: string, replyTo?: string): Promise<Res<ChatMessage>> =>
   axios({ url: `/chat/rooms/${roomId}/stickers`, method: 'post', data: { sticker, ...(replyTo ? { replyTo } : {}) } });

export const apiChatSendImage = (roomId: string, file: File, replyTo?: string): Promise<Res<ChatMessage>> => {
   const data = new FormData();
   data.append('image', file);
   if (replyTo) data.append('replyTo', replyTo);
   return axios({ url: `/chat/rooms/${roomId}/images`, method: 'post', data });
};

/** Toggle an emoji on a message */
export const apiChatReact = (messageId: string, emoji: string): Promise<Res<ChatMessage>> =>
   axios({ url: `/chat/messages/${messageId}/react`, method: 'post', data: { emoji } });

export const apiChatRecall = (messageId: string): Promise<Res<ChatMessage>> =>
   axios({ url: `/chat/messages/${messageId}/recall`, method: 'post' });

export const apiChatMarkRead = (roomId: string): Promise<Res> =>
   axios({ url: `/chat/rooms/${roomId}/read`, method: 'post', skipErrorToast: true } as never);

export interface TenorSticker {
   id: string;
   url: string;
   preview: string;
   width: number;
   height: number;
}
export const apiChatSearchStickers = (q: string): Promise<Res<{ enabled: boolean; stickers: TenorSticker[] }>> =>
   axios({ url: '/chat/stickers/search', method: 'get', params: { q, limit: 24 }, skipErrorToast: true } as never);

export const apiChatSearchUsers = (q: string): Promise<Res<ChatUser[]>> =>
   axios({ url: '/chat/users', method: 'get', params: { q, limit: 10 } });
