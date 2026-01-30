import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SparklineChart } from './SparklineChart';
import type { TrackerCardProps } from './types';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export function TrackerCard({
  tracker,
  isDraggable = false,
}: TrackerCardProps) {
  const getTrendIcon = () => {
    if (!tracker.trend) return null;

    if (tracker.trend.direction === 'up') {
      return <ArrowUp className="h-4 w-4 text-green-500" />;
    } else if (tracker.trend.direction === 'down') {
      return <ArrowDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendText = () => {
    if (!tracker.trend) return null;

    const sign = tracker.trend.change >= 0 ? '+' : '';
    return `${sign}${tracker.trend.change}%`;
  };

  return (
    <a
      href={`/app/trackers/${tracker.tracker_id}`}
      className={`block ${isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg">{tracker.name}</CardTitle>
            {tracker.is_shared && (
              <Badge variant="secondary" className="text-xs">
                Udostępniony
              </Badge>
            )}
          </div>
          {tracker.last_entry && (
            <div className="text-sm text-muted-foreground mt-1">
              Ostatni wpis:{' '}
              {new Date(tracker.last_entry.timestamp).toLocaleDateString(
                'pl-PL'
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Wartość ostatniego wpisu */}
          {tracker.last_entry && (
            <div className="mb-4">
              <div className="text-3xl font-bold">
                {tracker.last_entry.value}
              </div>
              {tracker.trend && (
                <div className="flex items-center gap-1 mt-1 text-sm">
                  {getTrendIcon()}
                  <span
                    className={
                      tracker.trend.direction === 'up'
                        ? 'text-green-500'
                        : tracker.trend.direction === 'down'
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                    }
                  >
                    {getTrendText()}
                  </span>
                  <span className="text-muted-foreground ml-1">
                    vs poprzedni okres
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Sparkline chart */}
          {tracker.sparkline && tracker.sparkline.length > 0 && (
            <SparklineChart
              data={tracker.sparkline}
              color="hsl(var(--primary))"
              showTooltip={!isDraggable}
            />
          )}

          {/* Statystyki */}
          {tracker.stats && (
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div>
                <div className="text-muted-foreground">Łącznie wpisów</div>
                <div className="font-medium">{tracker.stats.total_entries}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Streak</div>
                <div className="font-medium">{tracker.stats.streak} dni</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </a>
  );
}
