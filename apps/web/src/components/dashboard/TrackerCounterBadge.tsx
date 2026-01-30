import { Badge } from '@/components/ui/badge';

interface TrackerCounterBadgeProps {
  current: number;
  limit: number;
}

export function TrackerCounterBadge({
  current,
  limit,
}: TrackerCounterBadgeProps) {
  const percentage = (current / limit) * 100;

  // Określ wariant na podstawie procentowego wykorzystania
  const variant =
    percentage >= 90
      ? 'destructive'
      : percentage >= 70
        ? 'default'
        : 'secondary';

  return (
    <Badge variant={variant} className="text-sm">
      {current} / {limit} trackerów
    </Badge>
  );
}
