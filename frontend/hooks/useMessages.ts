'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '@/lib/api';
import type { Message, SendMessageData } from '@/lib/schemas';

export const useMessages = (conversationId: string | null) => {
  return useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam }) =>
      messagesApi.list(conversationId!, {
        cursor: pageParam,
        limit: 50,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.nextCursor : undefined,
    enabled: !!conversationId,
    refetchOnMount: true,
  });
};

export const useSendMessage = (conversationId: string | null) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendMessageData) => messagesApi.send(conversationId!, data),
    onSuccess: (newMessage) => {
      queryClient.setQueryData<{
        pages: Array<{ items: Message[]; pagination: { nextCursor: string | null; hasNextPage: boolean } }>;
        pageParams: (string | undefined)[];
      }>(['messages', conversationId], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, index) =>
            index === 0
              ? { ...page, items: [newMessage, ...page.items] }
              : page
          ),
        };
      });
    },
  });
};

export const useAddMessageToCache = () => {
  const queryClient = useQueryClient();

  const addMessage = (conversationId: string, message: Message) => {
    queryClient.setQueryData<{
      pages: Array<{ items: Message[]; pagination: { nextCursor: string | null; hasNextPage: boolean } }>;
      pageParams: (string | undefined)[];
    }>(['messages', conversationId], (old) => {
      if (!old) return old;

      // Check if message already exists
      const exists = old.pages.some(page =>
        page.items.some(m => m.id === message.id)
      );

      if (exists) return old;

      return {
        ...old,
        pages: old.pages.map((page, index) =>
          index === 0
            ? { ...page, items: [message, ...page.items] }
            : page
        ),
      };
    });
  };

  return { addMessage };
};
