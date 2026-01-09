'use client';

import type { Conversation } from '@/lib/schemas';
import { PriorityBadge } from './PriorityBadge';
import { TagList } from './TagList';
import { Mail, Phone, Briefcase, Calendar, Sparkles } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface LeadPanelProps {
  conversation: Conversation;
}

export function LeadPanel({ conversation }: LeadPanelProps) {
  const { lead } = conversation;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{lead.name}</h2>
        <p className="text-sm text-gray-500">Lead Information</p>
      </div>

      <div className="space-y-4">
        {lead.email && (
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-gray-400" />
            <a href={`mailto:${lead.email}`} className="text-sm text-blue-600 hover:underline">
              {lead.email}
            </a>
          </div>
        )}

        {lead.phone && (
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-gray-400" />
            <a href={`tel:${lead.phone}`} className="text-sm text-blue-600 hover:underline">
              {lead.phone}
            </a>
          </div>
        )}

        {lead.projectInterest && (
          <div className="flex items-start gap-3">
            <Briefcase className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Project Interest</p>
              <p className="text-sm text-gray-900">{lead.projectInterest}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 mb-1">Created</p>
            <p className="text-sm text-gray-900">{formatRelativeTime(lead.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-semibold text-gray-900">AI Analysis</h3>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-2">Priority</p>
            <PriorityBadge priority={conversation.aiPriority} />
          </div>

          {conversation.aiTags.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Tags</p>
              <TagList tags={conversation.aiTags} />
            </div>
          )}

          {conversation.aiSummary && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Summary</p>
              <p className="text-sm text-gray-700">{conversation.aiSummary}</p>
            </div>
          )}

          {conversation.aiUpdatedAt && (
            <p className="text-xs text-gray-500">
              Updated {formatRelativeTime(conversation.aiUpdatedAt)}
            </p>
          )}

          {!conversation.aiSummary && (
            <p className="text-sm text-gray-500 italic">
              AI analysis will appear here after the first message...
            </p>
          )}
        </div>
      </div>

      {conversation.assignedAgent && (
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Assigned Agent</h3>
          <p className="text-sm text-gray-700">{conversation.assignedAgent.email}</p>
        </div>
      )}
    </div>
  );
}
