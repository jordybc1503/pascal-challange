'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import type { Priority } from '@/lib/schemas';

interface FilterBarProps {
  onSearchChange: (search: string) => void;
  onPriorityChange: (priority: Priority | undefined) => void;
  onUnrepliedChange: (unreplied: boolean) => void;
  search: string;
  priority: Priority | undefined;
  unreplied: boolean;
}

export function FilterBar({
  onSearchChange,
  onPriorityChange,
  onUnrepliedChange,
  search,
  priority,
  unreplied,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = priority || unreplied;

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded ${
              hasActiveFilters ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Priority</label>
            <div className="flex gap-2">
              <button
                onClick={() => onPriorityChange(undefined)}
                className={`px-3 py-1 text-sm rounded ${
                  !priority
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => onPriorityChange('HIGH')}
                className={`px-3 py-1 text-sm rounded ${
                  priority === 'HIGH'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                High
              </button>
              <button
                onClick={() => onPriorityChange('MEDIUM')}
                className={`px-3 py-1 text-sm rounded ${
                  priority === 'MEDIUM'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Medium
              </button>
              <button
                onClick={() => onPriorityChange('LOW')}
                className={`px-3 py-1 text-sm rounded ${
                  priority === 'LOW'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Low
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="unreplied"
              checked={unreplied}
              onChange={(e) => onUnrepliedChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="unreplied" className="text-sm text-gray-700">
              Show only unreplied
            </label>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => {
                onPriorityChange(undefined);
                onUnrepliedChange(false);
              }}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
