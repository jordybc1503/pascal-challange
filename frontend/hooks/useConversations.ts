'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { conversationsApi } from '@/lib/api';
import type { Conversation } from '@/lib/schemas';

export const useConversations = (params?: {
  priority?: string;
  tag?: string;
  search?: string;
  unreplied?: boolean;
}) => {
  return useInfiniteQuery({
    queryKey: ['conversations', params],
    queryFn: ({ pageParam }) =>
      conversationsApi.list({
        ...params,
        cursor: pageParam,
        limit: 20,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.nextCursor : undefined,
  });
};

export const useConversation = (id: string | null) => {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => conversationsApi.getById(id!),
    enabled: !!id,
  });
};

export const useAssignConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, agentId }: { id: string; agentId: string | null }) =>
      conversationsApi.assign(id, agentId),
    onSuccess: (data) => {
      queryClient.setQueryData(['conversation', data.id], data);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};

export const useUpdateConversationCache = () => {
  const queryClient = useQueryClient();

  const updateConversation = (conversationId: string, updater: (old: Conversation) => Conversation) => {
    queryClient.setQueryData(['conversation', conversationId], updater);

    // Update in conversations list
    queryClient.setQueriesData<{
      pages: Array<{ items: Conversation[]; pagination: { nextCursor: string | null; hasNextPage: boolean } }>;
      pageParams: (string | undefined)[];
    }>({ queryKey: ['conversations'] }, (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((conv) =>
            conv.id === conversationId ? updater(conv) : conv
          ),
        })),
      };
    });
  };

  return { updateConversation };
};
