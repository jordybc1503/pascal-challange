interface TagListProps {
  tags: string[];
  className?: string;
}

export function TagList({ tags, className }: TagListProps) {
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
