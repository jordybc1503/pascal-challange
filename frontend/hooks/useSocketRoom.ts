'use client';

import { useEffect, useRef } from 'react';
import { socketClient } from '@/lib/socket';
import type { SocketMessageNew, SocketAIUpdate, SocketTyping } from '@/lib/schemas';

interface UseSocketRoomOptions {
  conversationId: string | null;
  onMessageNew?: (data: SocketMessageNew) => void;
  onAIUpdate?: (data: SocketAIUpdate) => void;
  onTypingStart?: (data: SocketTyping) => void;
  onTypingStop?: (data: SocketTyping) => void;
}

export const useSocketRoom = ({
  conversationId,
  onMessageNew,
  onAIUpdate,
  onTypingStart,
  onTypingStop,
}: UseSocketRoomOptions) => {
  const currentConversationId = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    // Join conversation
    socketClient.joinConversation(conversationId);
    currentConversationId.current = conversationId;

    // Set up event listeners
    if (onMessageNew) {
      socketClient.onMessageNew(onMessageNew);
    }
    if (onAIUpdate) {
      socketClient.onAIUpdate(onAIUpdate);
    }
    if (onTypingStart) {
      socketClient.onTypingStart(onTypingStart);
    }
    if (onTypingStop) {
      socketClient.onTypingStop(onTypingStop);
    }

    // Cleanup
    return () => {
      if (currentConversationId.current) {
        socketClient.leaveConversation(currentConversationId.current);
      }
      socketClient.offMessageNew();
      socketClient.offAIUpdate();
      socketClient.offTypingStart();
      socketClient.offTypingStop();
    };
  }, [conversationId, onMessageNew, onAIUpdate, onTypingStart, onTypingStop]);

  const startTyping = () => {
    if (conversationId) {
      socketClient.startTyping(conversationId);
    }
  };

  const stopTyping = () => {
    if (conversationId) {
      socketClient.stopTyping(conversationId);
    }
  };

  return { startTyping, stopTyping };
};
