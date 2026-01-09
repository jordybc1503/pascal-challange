'use client';

import { cn, formatTime } from '@/lib/utils';
import type { Message } from '@/lib/schemas';
import { User, Bot, Info } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  currentUserId?: string;
}

export function MessageBubble({ message, currentUserId }: MessageBubbleProps) {
  const isAgent = message.senderType === 'AGENT';
  const isLead = message.senderType === 'LEAD';
  const isSystem = message.senderType === 'SYSTEM';
  const isOwnMessage = message.senderUserId === currentUserId;

  if (isSystem) {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
          <Info className="w-3 h-3" />
          <span>{message.contentText}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-2 px-4',
        isOwnMessage && 'bg-blue-50'
      )}
    >
      <div className="flex-shrink-0">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            isLead ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
          )}
        >
          {isLead ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            {isLead ? 'Lead' : message.senderUser?.email.split('@')[0] || 'Agent'}
          </span>
          <span className="text-xs text-gray-500">{formatTime(message.createdAt)}</span>
        </div>
        <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
          {message.contentText}
        </div>
        {message.mediaUrl && (
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline mt-1 inline-block"
          >
            View attachment
          </a>
        )}
      </div>
    </div>
  );
}
