import axios from './axiosConfig';

export const apiGetConversations = (): Promise<Res> =>
   axios({
      url: '/message/conversations',
      method: 'get',
   });

export const apiStartConversation = (recipientId: string): Promise<Res> =>
   axios({
      url: '/message/conversations',
      method: 'post',
      data: { recipientId },
   });

export const apiGetMessages = (
   conversationId: string,
   before?: string,
): Promise<Res> =>
   axios({
      url: `/message/conversations/${conversationId}`,
      method: 'get',
      params: { limit: 30, ...(before ? { before } : {}) },
   });

export const apiSendMessage = (
   conversationId: string,
   content: string,
): Promise<Res> =>
   axios({
      url: `/message/conversations/${conversationId}`,
      method: 'post',
      data: { content },
   });

export const apiReactMessage = (
   messageId: string,
   emoji: string,
): Promise<Res> =>
   axios({
      url: `/message/messages/${messageId}/react`,
      method: 'post',
      data: { emoji },
   });
