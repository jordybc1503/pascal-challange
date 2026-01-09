import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './api';
import {
  SocketMessageNewSchema,
  SocketAIUpdateSchema,
  SocketTypingSchema,
  type SocketMessageNew,
  type SocketAIUpdate,
  type SocketTyping,
} from './schemas';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

class SocketClient {
  private socket: Socket | null = null;
  private currentConversationId: string | null = null;

  connect() {
    if (this.socket?.connected) return;

    const token = getAuthToken();
    if (!token) {
      console.warn('No auth token available for socket connection');
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error.message);
    });
  }

  disconnect() {
    if (this.currentConversationId) {
      this.leaveConversation(this.currentConversationId);
    }
    this.socket?.disconnect();
    this.socket = null;
  }

  joinConversation(conversationId: string) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, attempting to connect...');
      this.connect();
    }

    if (this.currentConversationId && this.currentConversationId !== conversationId) {
      this.leaveConversation(this.currentConversationId);
    }

    this.socket?.emit('conversation:join', conversationId);
    this.currentConversationId = conversationId;
    console.log(`📝 Joined conversation: ${conversationId}`);
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit('conversation:leave', conversationId);
    console.log(`👋 Left conversation: ${conversationId}`);

    if (this.currentConversationId === conversationId) {
      this.currentConversationId = null;
    }
  }

  startTyping(conversationId: string) {
    this.socket?.emit('typing:start', conversationId);
  }

  stopTyping(conversationId: string) {
    this.socket?.emit('typing:stop', conversationId);
  }

  // Event listeners
  onMessageNew(callback: (data: SocketMessageNew) => void) {
    this.socket?.on('message:new', (rawData) => {
      const parsed = SocketMessageNewSchema.safeParse(rawData);
      if (parsed.success) {
        callback(parsed.data);
      } else {
        console.error('Invalid message:new data:', parsed.error);
      }
    });
  }

  onAIUpdate(callback: (data: SocketAIUpdate) => void) {
    this.socket?.on('conversation:ai:update', (rawData) => {
      const parsed = SocketAIUpdateSchema.safeParse(rawData);
      if (parsed.success) {
        callback(parsed.data);
      } else {
        console.error('Invalid conversation:ai:update data:', parsed.error);
      }
    });
  }

  onTypingStart(callback: (data: SocketTyping) => void) {
    this.socket?.on('typing:start', (rawData) => {
      const parsed = SocketTypingSchema.safeParse(rawData);
      if (parsed.success) {
        callback(parsed.data);
      } else {
        console.error('Invalid typing:start data:', parsed.error);
      }
    });
  }

  onTypingStop(callback: (data: SocketTyping) => void) {
    this.socket?.on('typing:stop', (rawData) => {
      const parsed = SocketTypingSchema.safeParse(rawData);
      if (parsed.success) {
        callback(parsed.data);
      } else {
        console.error('Invalid typing:stop data:', parsed.error);
      }
    });
  }

  // Remove listeners
  offMessageNew() {
    this.socket?.off('message:new');
  }

  offAIUpdate() {
    this.socket?.off('conversation:ai:update');
  }

  offTypingStart() {
    this.socket?.off('typing:start');
  }

  offTypingStop() {
    this.socket?.off('typing:stop');
  }
}

// Singleton instance
export const socketClient = new SocketClient();
