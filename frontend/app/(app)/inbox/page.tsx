'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useConversations, useUpdateConversationCache } from '@/hooks/useConversations';
import { useMessages, useSendMessage, useAddMessageToCache } from '@/hooks/useMessages';
import { useSocketRoom } from '@/hooks/useSocketRoom';
import { useAuth } from '@/hooks/useAuth';
import { ConversationListItem } from '@/components/ConversationListItem';
import { FilterBar } from '@/components/FilterBar';
import { MessageBubble } from '@/components/MessageBubble';
import { MessageComposer } from '@/components/MessageComposer';
import { LeadPanel } from '@/components/LeadPanel';
import { ConversationSkeleton, MessageSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';
import { Inbox as InboxIcon, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Priority } from '@/lib/schemas';

export default function InboxPage() {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<Priority | undefined>();
  const [unreplied, setUnreplied] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const {
    data: conversationsData,
    isLoading: conversationsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversations({ search, priority, unreplied });

  const conversations = conversationsData?.pages.flatMap((page) => page.items) ?? [];
  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage: fetchNextMessages,
    hasNextPage: hasNextMessages,
    isFetchingNextPage: isFetchingNextMessages,
  } = useMessages(selectedConversationId);

  const messages = messagesData?.pages.flatMap((page) => page.items).reverse() ?? [];

  const sendMessageMutation = useSendMessage(selectedConversationId);
  const { updateConversation } = useUpdateConversationCache();
  const { addMessage } = useAddMessageToCache();

  // Socket.IO integration
  useSocketRoom({
    conversationId: selectedConversationId,
    onMessageNew: useCallback(
      (data) => {
        if (data.conversationId === selectedConversationId) {
          addMessage(data.conversationId, data.message);
        }
        // Update conversation last message time
        updateConversation(data.conversationId, (old) => ({
          ...old,
          lastMessageAt: data.message.createdAt,
          lastMessageSenderType: data.message.senderType,
        }));
        toast.success('New message received');
      },
      [selectedConversationId, addMessage, updateConversation]
    ),
    onAIUpdate: useCallback(
      (data) => {
        updateConversation(data.conversationId, (old) => ({
          ...old,
          aiSummary: data.aiData.summary ?? old.aiSummary,
          aiPriority: data.aiData.priority ?? old.aiPriority,
          aiTags: data.aiData.tags ?? old.aiTags,
          aiUpdatedAt: data.aiData.updatedAt ?? old.aiUpdatedAt,
        }));
        toast.success('AI analysis updated', { icon: '✨' });
      },
      [updateConversation]
    ),
    onTypingStart: useCallback(
      (data) => {
        if (data.conversationId === selectedConversationId && data.userId !== user?.id) {
          setTypingUsers((prev) => new Set(prev).add(data.email));
        }
      },
      [selectedConversationId, user?.id]
    ),
    onTypingStop: useCallback(
      (data) => {
        if (data.conversationId === selectedConversationId) {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(data.email);
            return next;
          });
        }
      },
      [selectedConversationId]
    ),
  });

  const { startTyping, stopTyping } = useSocketRoom({
    conversationId: selectedConversationId,
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const handleSendMessage = async (text: string) => {
    try {
      await sendMessageMutation.mutateAsync({
        contentText: text,
        contentType: 'TEXT',
      });
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0 && hasNextMessages && !isFetchingNextMessages) {
      fetchNextMessages();
    }
  };

  const handleConversationsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (
      target.scrollHeight - target.scrollTop === target.clientHeight &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  };

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className="w-96 border-r border-gray-200 flex flex-col bg-white">
        <FilterBar
          search={search}
          priority={priority}
          unreplied={unreplied}
          onSearchChange={setSearch}
          onPriorityChange={setPriority}
          onUnrepliedChange={setUnreplied}
        />

        <div
          className="flex-1 overflow-y-auto hide-scrollbar"
          onScroll={handleConversationsScroll}
        >
          {conversationsLoading ? (
            <>
              <ConversationSkeleton />
              <ConversationSkeleton />
              <ConversationSkeleton />
            </>
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={<InboxIcon className="w-12 h-12" />}
              title="No conversations"
              description="No conversations match your filters"
            />
          ) : (
            <>
              {conversations.map((conv) => (
                <ConversationListItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === selectedConversationId}
                  onClick={() => setSelectedConversationId(conv.id)}
                />
              ))}
              {isFetchingNextPage && <ConversationSkeleton />}
            </>
          )}
        </div>
      </div>

      {/* Messages Thread */}
      {selectedConversationId ? (
        <>
          <div className="flex-1 flex flex-col bg-gray-50">
            <div className="bg-white border-b border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedConversation?.lead.name}
              </h2>
              {typingUsers.size > 0 && (
                <p className="text-sm text-gray-500 italic mt-1">
                  {Array.from(typingUsers).join(', ')} typing...
                </p>
              )}
            </div>

            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto hide-scrollbar"
              onScroll={handleScroll}
            >
              {isFetchingNextMessages && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              )}

              {messagesLoading ? (
                <>
                  <MessageSkeleton />
                  <MessageSkeleton />
                  <MessageSkeleton />
                </>
              ) : messages.length === 0 ? (
                <EmptyState
                  icon={<MessageSquare className="w-12 h-12" />}
                  title="No messages yet"
                  description="Start the conversation"
                />
              ) : (
                <>
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} currentUserId={user?.id} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <MessageComposer
              onSend={handleSendMessage}
              onTypingStart={startTyping}
              onTypingStop={stopTyping}
              disabled={sendMessageMutation.isPending}
            />
          </div>

          {/* Lead Panel */}
          {selectedConversation && (
            <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto hide-scrollbar">
              <LeadPanel conversation={selectedConversation} />
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <EmptyState
            icon={<MessageSquare className="w-16 h-16" />}
            title="Select a conversation"
            description="Choose a conversation from the list to view messages"
          />
        </div>
      )}
    </div>
  );
}
