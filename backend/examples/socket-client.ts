/**
 * Socket.IO Client Example
 *
 * Install in your frontend:
 * npm install socket.io-client
 */

import { io, Socket } from 'socket.io-client';

interface SocketMessage {
  conversationId: string;
  message: {
    id: string;
    contentText: string;
    senderType: string;
    senderUserId?: string;
    createdAt: string;
  };
}

interface SocketAIUpdate {
  conversationId: string;
  aiData: {
    summary: string | null;
    priority: string | null;
    tags: string[] | null;
    updatedAt: Date | null;
  };
}

interface SocketTyping {
  userId: string;
  email: string;
  conversationId: string;
}

class MessagingSocket {
  private socket: Socket | null = null;
  private token: string;
  private currentConversationId: string | null = null;

  constructor(token: string) {
    this.token = token;
  }

  connect() {
    this.socket = io('http://localhost:3000', {
      auth: {
        token: this.token,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 Connection error:', error.message);
    });

    // Event listeners
    this.socket.on('message:new', this.handleNewMessage.bind(this));
    this.socket.on('conversation:ai:update', this.handleAIUpdate.bind(this));
    this.socket.on('typing:start', this.handleTypingStart.bind(this));
    this.socket.on('typing:stop', this.handleTypingStop.bind(this));
  }

  disconnect() {
    if (this.currentConversationId) {
      this.leaveConversation(this.currentConversationId);
    }
    this.socket?.disconnect();
  }

  joinConversation(conversationId: string) {
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

  // Event handlers
  private handleNewMessage(data: SocketMessage) {
    console.log('📨 New message received:', data);
    // Update your UI here
    // e.g., add message to conversation view
  }

  private handleAIUpdate(data: SocketAIUpdate) {
    console.log('🤖 AI analysis updated:', data);
    // Update conversation metadata in your UI
    // e.g., update priority badge, tags, summary
  }

  private handleTypingStart(data: SocketTyping) {
    console.log(`✏️ ${data.email} is typing...`);
    // Show typing indicator in UI
  }

  private handleTypingStop(data: SocketTyping) {
    console.log(`⏹️ ${data.email} stopped typing`);
    // Hide typing indicator in UI
  }

  // Custom event handlers (override these in your implementation)
  onNewMessage(callback: (data: SocketMessage) => void) {
    this.socket?.on('message:new', callback);
  }

  onAIUpdate(callback: (data: SocketAIUpdate) => void) {
    this.socket?.on('conversation:ai:update', callback);
  }

  onTypingStart(callback: (data: SocketTyping) => void) {
    this.socket?.on('typing:start', callback);
  }

  onTypingStop(callback: (data: SocketTyping) => void) {
    this.socket?.on('typing:stop', callback);
  }
}

// Usage example:

/*
// 1. Get token from login
const response = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'agent1@test.com',
    password: 'password123'
  })
});
const { data } = await response.json();
const token = data.token;

// 2. Create socket instance
const messaging = new MessagingSocket(token);

// 3. Set up custom handlers
messaging.onNewMessage((data) => {
  console.log('Got message:', data.message.contentText);
  // Update your React/Vue state here
});

messaging.onAIUpdate((data) => {
  console.log('AI updated priority:', data.aiData.priority);
  // Update conversation card
});

// 4. Connect
messaging.connect();

// 5. Join a conversation
messaging.joinConversation('conversation-uuid-here');

// 6. Simulate typing
const inputElement = document.getElementById('message-input');
let typingTimeout: NodeJS.Timeout;

inputElement.addEventListener('input', () => {
  messaging.startTyping('conversation-uuid');

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    messaging.stopTyping('conversation-uuid');
  }, 1000);
});

// 7. When leaving page
window.addEventListener('beforeunload', () => {
  messaging.disconnect();
});
*/

export default MessagingSocket;
