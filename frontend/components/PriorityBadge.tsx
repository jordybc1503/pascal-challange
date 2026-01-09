import { cn } from '@/lib/utils';
import type { Priority } from '@/lib/schemas';

interface PriorityBadgeProps {
  priority: Priority | null | undefined;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  if (!priority) {
    return (
      <span className={cn('px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600', className)}>
        Not analyzed
      </span>
    );
  }

  const styles = {
    HIGH: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    LOW: 'bg-green-100 text-green-700',
  };

  return (
    <span className={cn('px-2 py-1 text-xs font-medium rounded-full', styles[priority], className)}>
      {priority}
    </span>
  );
}
