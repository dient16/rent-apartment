import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Input, Popover, Skeleton } from 'antd';
import {
   ArrowLeftOutlined,
   SearchOutlined,
   SendOutlined,
   SmileOutlined,
} from '@ant-design/icons';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import moment from 'moment';
import clsx from 'clsx';
import {
   apiGetConversations,
   apiGetMessages,
   apiReactMessage,
   apiSendMessage,
} from '@/apis';
import { UserAvatar } from '@/components';

interface Partner {
   _id: string;
   firstname?: string;
   lastname?: string;
   avatar?: string;
}

interface ConversationItem {
   _id: string;
   partner: Partner;
   lastMessage: { content: string; isMine: boolean; createdAt: string } | null;
   unreadCount: number;
   updatedAt: string;
}

interface MessageReaction {
   emoji: string;
   count: number;
   mine: boolean;
}

interface ChatMessage {
   _id: string;
   content: string;
   isMine: boolean;
   reactions?: MessageReaction[];
   createdAt: string;
}

const QUICK_REACTIONS = ['❤️', '👍', '😆', '😮', '😢', '🙏'];

const partnerName = (partner?: Partner | null) =>
   [partner?.firstname, partner?.lastname].filter(Boolean).join(' ') || 'User';

/** Khung chat 2 cot dung chung cho user (/messages) va host (/host/messages) */
const Messenger: React.FC = () => {
   const queryClient = useQueryClient();
   const [searchParams, setSearchParams] = useSearchParams();
   const selectedId = searchParams.get('c');
   const [draft, setDraft] = useState('');
   const [search, setSearch] = useState('');
   const [emojiOpen, setEmojiOpen] = useState(false);
   const listRef = useRef<HTMLDivElement>(null);

   const { data: conversationsData, isLoading: isLoadingConversations } =
      useQuery({
         queryKey: ['conversations'],
         queryFn: apiGetConversations,
         refetchInterval: 15_000,
         staleTime: 0, // mo trang la refetch ngay, khong hien cache cu
      });

   const conversations: ConversationItem[] = useMemo(
      () => conversationsData?.data?.conversations || [],
      [conversationsData],
   );

   const visibleConversations = useMemo(() => {
      if (!search.trim()) return conversations;
      const keyword = search.trim().toLowerCase();
      return conversations.filter((conversation) =>
         partnerName(conversation.partner).toLowerCase().includes(keyword),
      );
   }, [conversations, search]);

   const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
      queryKey: ['messages', selectedId],
      queryFn: () => apiGetMessages(selectedId as string),
      enabled: !!selectedId,
      refetchInterval: 3_000,
      staleTime: 0, // mo hoi thoai la refetch ngay, khong hien cache cu
   });

   const messages: ChatMessage[] = useMemo(
      () => messagesData?.data?.messages || [],
      [messagesData],
   );
   const activePartner: Partner | undefined =
      messagesData?.data?.partner ||
      conversations.find((conversation) => conversation._id === selectedId)
         ?.partner;

   const reactMutation = useMutation({
      mutationFn: ({
         messageId,
         emoji,
      }: {
         messageId: string;
         emoji: string;
      }) => apiReactMessage(messageId, emoji),
      onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      },
   });

   const sendMutation = useMutation({
      mutationFn: (content: string) =>
         apiSendMessage(selectedId as string, content),
      onSuccess: (response) => {
         if (response.success) {
            setDraft('');
            queryClient.invalidateQueries({
               queryKey: ['messages', selectedId],
            });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
         }
      },
   });

   // Cuon xuong cuoi KHUNG CHAT khi co tin moi (khong dung scrollIntoView
   // vi no keo ca trang xuong theo)
   useEffect(() => {
      const list = listRef.current;
      if (list) list.scrollTop = list.scrollHeight;
   }, [messages.length, selectedId]);

   // Doc hoi thoai xong thi lam moi badge chua doc o danh sach
   useEffect(() => {
      if (selectedId && messagesData) {
         queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [selectedId, messagesData?.data?.messages?.length]);

   const handleSend = () => {
      const content = draft.trim();
      if (!content || !selectedId || sendMutation.isPending) return;
      sendMutation.mutate(content);
   };

   const totalUnread: number = conversationsData?.data?.totalUnread || 0;

   return (
      <div className="bg-gray-50 font-main">
         <div className="mx-auto w-full max-w-main">
            <div className="flex overflow-hidden flex-col bg-white border-x border-b border-gray-100 shadow-card-sm h-[calc(100vh-60px)] lg:h-[calc(100vh-80px)]">
               {/* ===== Thanh tren chia doi 2 ben ===== */}
               <div className="flex flex-shrink-0 items-stretch border-b border-gray-100 h-[72px]">
                  <div
                     className={clsx(
                        'items-center px-4 w-full border-r border-gray-100 md:flex md:w-[340px] flex-shrink-0',
                        selectedId ? 'hidden' : 'flex',
                     )}
                  >
                     <Input
                        allowClear
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="Search conversations"
                        className="h-11 bg-gray-100 rounded-full border border-gray-200"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                     />
                  </div>
                  <div
                     className={clsx(
                        'flex-1 items-center px-5 min-w-0 md:flex',
                        selectedId ? 'flex' : 'hidden',
                     )}
                  >
                     {selectedId ? (
                        <div className="flex gap-3 items-center w-full min-w-0">
                           <button
                              type="button"
                              className="flex justify-center items-center w-8 h-8 bg-transparent rounded-full border-none cursor-pointer md:hidden hover:bg-gray-100"
                              onClick={() => setSearchParams({})}
                           >
                              <ArrowLeftOutlined />
                           </button>
                           <UserAvatar
                              size={40}
                              src={activePartner?.avatar}
                              name={activePartner?.firstname}
                           />
                           <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">
                                 {partnerName(activePartner)}
                              </p>
                              <p className="flex gap-1.5 items-center text-xs text-gray-400">
                                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                 Usually replies within a day
                              </p>
                           </div>
                        </div>
                     ) : (
                        <div className="flex gap-2 items-center">
                           <h1 className="text-lg font-bold text-gray-900">
                              Messages
                           </h1>
                           {totalUnread > 0 && (
                              <span className="flex justify-center items-center px-2 h-5 min-w-[20px] text-xs font-bold text-white bg-blue-500 rounded-full">
                                 {totalUnread}
                              </span>
                           )}
                        </div>
                     )}
                  </div>
               </div>

               <div className="flex flex-1 min-h-0">
                  {/* ===== Cot trai: danh sach hoi thoai ===== */}
                  <aside
                     className={clsx(
                        'flex-col flex-shrink-0 w-full border-r border-gray-100 md:flex md:w-[340px]',
                        selectedId ? 'hidden' : 'flex',
                     )}
                  >
                     <div className="overflow-y-auto flex-1 px-2 py-2">
                        {isLoadingConversations ? (
                           <div className="p-4 space-y-4">
                              <Skeleton active avatar paragraph={{ rows: 1 }} />
                              <Skeleton active avatar paragraph={{ rows: 1 }} />
                           </div>
                        ) : visibleConversations.length === 0 ? (
                           <Empty
                              className="py-16"
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description={
                                 <span className="text-gray-400">
                                    {conversations.length === 0 ? (
                                       <>
                                          No conversations yet.
                                          <br />
                                          Message a host from any listing.
                                       </>
                                    ) : (
                                       'No conversations match your search.'
                                    )}
                                 </span>
                              }
                           />
                        ) : (
                           visibleConversations.map((conversation) => {
                              const isActive = selectedId === conversation._id;
                              return (
                                 <button
                                    key={conversation._id}
                                    type="button"
                                    onClick={() =>
                                       setSearchParams({ c: conversation._id })
                                    }
                                    className={clsx(
                                       'flex relative gap-3 items-center px-3 py-3 mb-0.5 w-full text-left bg-transparent rounded-xl border-none transition-colors cursor-pointer',
                                       isActive
                                          ? 'bg-blue-50'
                                          : 'hover:bg-gray-100',
                                    )}
                                 >
                                    {isActive && (
                                       <span className="absolute left-0 top-1/2 w-1 h-8 bg-blue-500 rounded-full -translate-y-1/2" />
                                    )}
                                    <UserAvatar
                                       size={46}
                                       src={conversation.partner.avatar}
                                       name={conversation.partner.firstname}
                                       className="flex-shrink-0"
                                    />
                                    <span className="flex-1 min-w-0">
                                       <span className="flex justify-between items-center">
                                          <span
                                             className={clsx(
                                                'text-sm truncate',
                                                conversation.unreadCount > 0
                                                   ? 'font-bold text-gray-900'
                                                   : 'font-semibold text-gray-800',
                                             )}
                                          >
                                             {partnerName(
                                                conversation.partner,
                                             )}
                                          </span>
                                          <span className="flex-shrink-0 ml-2 text-[11px] text-gray-400">
                                             {conversation.lastMessage
                                                ? moment(
                                                     conversation.lastMessage
                                                        .createdAt,
                                                  ).fromNow(true)
                                                : ''}
                                          </span>
                                       </span>
                                       <span className="flex gap-2 justify-between items-center mt-0.5">
                                          <span
                                             className={clsx(
                                                'text-xs truncate',
                                                conversation.unreadCount > 0
                                                   ? 'font-semibold text-gray-800'
                                                   : 'text-gray-500',
                                             )}
                                          >
                                             {conversation.lastMessage
                                                ? `${conversation.lastMessage.isMine ? 'You: ' : ''}${conversation.lastMessage.content}`
                                                : 'Say hello 👋'}
                                          </span>
                                          {conversation.unreadCount > 0 && (
                                             <span className="flex flex-shrink-0 justify-center items-center px-1.5 h-5 min-w-[20px] text-[11px] font-bold text-white bg-blue-500 rounded-full">
                                                {conversation.unreadCount}
                                             </span>
                                          )}
                                       </span>
                                    </span>
                                 </button>
                              );
                           })
                        )}
                     </div>
                  </aside>

                  {/* ===== Cot phai: khung chat ===== */}
                  <section
                     className={clsx(
                        'flex-col flex-1 min-w-0 md:flex',
                        selectedId ? 'flex' : 'hidden',
                     )}
                  >
                     {!selectedId ? (
                        <div className="flex flex-col flex-1 justify-center items-center">
                           <span className="flex justify-center items-center mb-4 w-16 h-16 text-2xl text-blue-400 bg-blue-50 rounded-full">
                              <SendOutlined />
                           </span>
                           <p className="text-sm font-medium text-gray-500">
                              Pick a conversation to start chatting
                           </p>
                           <p className="mt-1 text-xs text-gray-400">
                              Your messages with hosts and guests live here
                           </p>
                        </div>
                     ) : (
                        <>
                           {/* Tin nhan */}
                           <div
                              ref={listRef}
                              className="overflow-y-auto flex-1 px-5 py-4 bg-white"
                           >
                              {isLoadingMessages ? (
                                 <Skeleton active paragraph={{ rows: 5 }} />
                              ) : messages.length === 0 ? (
                                 <div className="flex flex-col justify-center items-center h-full text-center">
                                    <UserAvatar
                                       size={64}
                                       src={activePartner?.avatar}
                                       name={activePartner?.firstname}
                                    />
                                    <p className="mt-3 text-sm font-semibold text-gray-700">
                                       {partnerName(activePartner)}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                       Send the first message to start the
                                       conversation
                                    </p>
                                 </div>
                              ) : (
                                 messages.map((message, index) => {
                                    const prev = messages[index - 1];
                                    const next = messages[index + 1];
                                    const showTime =
                                       !prev ||
                                       moment(message.createdAt).diff(
                                          moment(prev.createdAt),
                                          'minutes',
                                       ) > 15;
                                    // avatar chi hien o tin CUOI cua moi cum tin doi phuong
                                    const isLastOfGroup =
                                       !next ||
                                       next.isMine !== message.isMine ||
                                       moment(next.createdAt).diff(
                                          moment(message.createdAt),
                                          'minutes',
                                       ) > 15;
                                    return (
                                       <React.Fragment key={message._id}>
                                          {showTime && (
                                             <div className="flex justify-center my-4">
                                                <span className="px-3 py-1 text-[11px] text-gray-500 bg-gray-100 rounded-full">
                                                   {moment(
                                                      message.createdAt,
                                                   ).calendar()}
                                                </span>
                                             </div>
                                          )}
                                          <div
                                             className={clsx(
                                                'flex items-end gap-2',
                                                message.reactions?.length
                                                   ? 'mb-4'
                                                   : 'mb-1',
                                                message.isMine
                                                   ? 'justify-end'
                                                   : 'justify-start',
                                             )}
                                          >
                                             {!message.isMine &&
                                                (isLastOfGroup ? (
                                                   <UserAvatar
                                                      size={28}
                                                      src={
                                                         activePartner?.avatar
                                                      }
                                                      name={
                                                         activePartner?.firstname
                                                      }
                                                      className="flex-shrink-0"
                                                   />
                                                ) : (
                                                   <span className="flex-shrink-0 w-7" />
                                                ))}
                                             <div
                                                className={clsx(
                                                   'group/msg relative flex items-center gap-1.5 max-w-[72%]',
                                                   message.isMine &&
                                                      'flex-row-reverse',
                                                )}
                                             >
                                                <div
                                                   className={clsx(
                                                      'relative px-4 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap rounded-2xl',
                                                      message.isMine
                                                         ? 'text-white bg-gradient-to-br from-blue-500 to-blue-600'
                                                         : 'text-gray-800 bg-gray-100',
                                                      message.isMine
                                                         ? isLastOfGroup
                                                            ? 'rounded-br-md'
                                                            : ''
                                                         : isLastOfGroup
                                                           ? 'rounded-bl-md'
                                                           : '',
                                                   )}
                                                >
                                                   {message.content}
                                                   {/* Chip reactions duoi goc bubble */}
                                                   {!!message.reactions
                                                      ?.length && (
                                                      <span
                                                         className={clsx(
                                                            'flex absolute -bottom-3.5 gap-1',
                                                            message.isMine
                                                               ? 'right-2'
                                                               : 'left-2',
                                                         )}
                                                      >
                                                         {message.reactions.map(
                                                            (reaction) => (
                                                               <button
                                                                  key={
                                                                     reaction.emoji
                                                                  }
                                                                  type="button"
                                                                  onClick={() =>
                                                                     reactMutation.mutate(
                                                                        {
                                                                           messageId:
                                                                              message._id,
                                                                           emoji: reaction.emoji,
                                                                        },
                                                                     )
                                                                  }
                                                                  className={clsx(
                                                                     'flex gap-0.5 items-center px-1.5 h-[22px] text-[11px] bg-white rounded-full border shadow-sm transition-transform cursor-pointer hover:scale-110',
                                                                     reaction.mine
                                                                        ? 'border-blue-300'
                                                                        : 'border-gray-200',
                                                                  )}
                                                               >
                                                                  <span className="text-[13px] leading-none">
                                                                     {
                                                                        reaction.emoji
                                                                     }
                                                                  </span>
                                                                  {reaction.count >
                                                                     1 && (
                                                                     <span className="font-semibold text-gray-600">
                                                                        {
                                                                           reaction.count
                                                                        }
                                                                     </span>
                                                                  )}
                                                               </button>
                                                            ),
                                                         )}
                                                      </span>
                                                   )}
                                                </div>
                                                {/* Nut react hien khi hover */}
                                                <Popover
                                                   trigger="click"
                                                   placement="top"
                                                   content={
                                                      <div className="flex gap-1">
                                                         {QUICK_REACTIONS.map(
                                                            (emoji) => (
                                                               <button
                                                                  key={emoji}
                                                                  type="button"
                                                                  onClick={() =>
                                                                     reactMutation.mutate(
                                                                        {
                                                                           messageId:
                                                                              message._id,
                                                                           emoji,
                                                                        },
                                                                     )
                                                                  }
                                                                  className="flex justify-center items-center w-8 h-8 text-lg bg-transparent rounded-full border-none transition-transform cursor-pointer hover:scale-125 hover:bg-gray-100"
                                                               >
                                                                  {emoji}
                                                               </button>
                                                            ),
                                                         )}
                                                      </div>
                                                   }
                                                >
                                                   <button
                                                      type="button"
                                                      aria-label="React"
                                                      className="flex flex-shrink-0 justify-center items-center w-7 h-7 text-sm text-gray-400 bg-transparent rounded-full border-none opacity-0 transition-opacity cursor-pointer group-hover/msg:opacity-100 hover:bg-gray-100 hover:text-amber-500"
                                                   >
                                                      <SmileOutlined />
                                                   </button>
                                                </Popover>
                                             </div>
                                          </div>
                                       </React.Fragment>
                                    );
                                 })
                              )}
                           </div>

                           {/* O nhap */}
                           <div className="flex gap-2 items-end px-4 py-3 bg-white border-t border-gray-100">
                              <Popover
                                 open={emojiOpen}
                                 onOpenChange={setEmojiOpen}
                                 trigger="click"
                                 placement="topLeft"
                                 content={
                                    <EmojiPicker
                                       height={360}
                                       width={310}
                                       searchDisabled
                                       skinTonesDisabled
                                       previewConfig={{ showPreview: false }}
                                       onEmojiClick={(
                                          emoji: EmojiClickData,
                                       ) =>
                                          setDraft(
                                             (prev) => prev + emoji.emoji,
                                          )
                                       }
                                    />
                                 }
                              >
                                 <button
                                    type="button"
                                    aria-label="Emoji"
                                    className="flex flex-shrink-0 justify-center items-center mb-1 w-9 h-9 text-xl text-gray-400 bg-transparent rounded-full border-none transition-colors cursor-pointer hover:text-amber-500 hover:bg-gray-100"
                                 >
                                    <SmileOutlined />
                                 </button>
                              </Popover>
                              <Input.TextArea
                                 placeholder="Type a message..."
                                 className="!bg-gray-100 !rounded-2xl !border !border-gray-200 !py-2.5 !px-4 !text-sm !resize-none"
                                 value={draft}
                                 autoSize={{ minRows: 1, maxRows: 5 }}
                                 onChange={(event) =>
                                    setDraft(event.target.value)
                                 }
                                 onPressEnter={(event) => {
                                    // Enter = gui, Shift+Enter = xuong hang
                                    if (!event.shiftKey) {
                                       event.preventDefault();
                                       handleSend();
                                    }
                                 }}
                                 maxLength={2000}
                              />
                              <Button
                                 type="primary"
                                 shape="circle"
                                 size="large"
                                 icon={<SendOutlined />}
                                 className={clsx(
                                    'flex-shrink-0 border-none mb-0.5',
                                    draft.trim()
                                       ? 'bg-blue-500 hover:bg-blue-600'
                                       : 'bg-gray-200',
                                 )}
                                 loading={sendMutation.isPending}
                                 disabled={!draft.trim()}
                                 onClick={handleSend}
                              />
                           </div>
                        </>
                     )}
                  </section>
               </div>
            </div>
         </div>
      </div>
   );
};

export default Messenger;
