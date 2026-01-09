'use client';

import { cn, formatRelativeTime, truncate } from '@/lib/utils';
import type { Conversation } from '@/lib/schemas';
import { PriorityBadge } from './PriorityBadge';
import { TagList } from './TagList';
import { User, Bot } from 'lucide-react';

interface ConversationListItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationListItem({
  conversation,
  isActive,
  onClick,
}: ConversationListItemProps) {
  const hasUnrepliedMessages =
    conversation.lastMessageSenderType === 'LEAD' &&
    (!conversation.lastAgentReplyAt ||
      new Date(conversation.lastMessageAt!) > new Date(conversation.lastAgentReplyAt));

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors',
        isActive && 'bg-blue-50 hover:bg-blue-50 border-l-4 border-l-blue-600'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{conversation.lead.name}</h3>
          {hasUnrepliedMessages && (
            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
          )}
        </div>
        {conversation.lastMessageAt && (
          <span className="text-xs text-gray-500">
            {formatRelativeTime(conversation.lastMessageAt)}
          </span>
        )}
      </div>

      {conversation.aiSummary && (
        <p className="text-sm text-gray-600 mb-2">
          {truncate(conversation.aiSummary, 80)}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <PriorityBadge priority={conversation.aiPriority} />
        {conversation.aiTags.length > 0 && <TagList tags={conversation.aiTags.slice(0, 2)} />}
        {conversation.assignedAgent && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <User className="w-3 h-3" />
            <span>{conversation.assignedAgent.email.split('@')[0]}</span>
          </div>
        )}
        {conversation._count.messages > 0 && (
          <span className="text-xs text-gray-500">{conversation._count.messages} msgs</span>
        )}
      </div>
    </div>
  );
}
