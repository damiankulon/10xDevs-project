import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SparklineChart } from './SparklineChart';
import { TrackerIcon } from './TrackerIcon';
import { TrendIndicator } from './TrendIndicator';
import { QuickActionButtons } from './QuickActionButtons';
import type { TrackerCardProps } from './types';

export function TrackerCard({
  tracker,
  isDraggable = false,
  onAddEntry,
  onViewDetails,
}: TrackerCardProps) {
  const handleAddEntry = () => {
    if (onAddEntry && !isDraggable) {
      onAddEntry(tracker.tracker_id);
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails && !isDraggable) {
      onViewDetails(tracker.tracker_id);
    } else {
      // Fallback do nawigacji przez href
      window.location.href = `/app/trackers/${tracker.tracker_id}`;
    }
  };

  // Format wartości z jednostką
  const formatValue = () => {
    if (!tracker.last_entry) return null;
    const value = tracker.last_entry.value;
    const unit = tracker.unit ? ` ${tracker.unit}` : '';
    return `${value}${unit}`;
  };

  return (
    <Card
      className={`hover:shadow-lg transition-shadow ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: tracker.color || 'hsl(var(--primary))',
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <TrackerIcon
              icon={tracker.icon}
              name={tracker.name}
              color={tracker.color}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{tracker.name}</h3>
              {tracker.last_entry && (
                <div className="text-sm text-muted-foreground">
                  {new Date(tracker.last_entry.recorded_at).toLocaleDateString(
                    'pl-PL',
                    { day: 'numeric', month: 'short' }
                  )}
                </div>
              )}
            </div>
          </div>
          {tracker.is_shared && (
            <Badge variant="secondary" className="text-xs shrink-0">
              Udostępniony
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Wartość ostatniego wpisu */}
        {tracker.last_entry && (
          <div className="mb-4">
            <div className="text-3xl font-bold">{formatValue()}</div>
            {tracker.trend && (
              <div className="mt-2">
                <TrendIndicator trend={tracker.trend} />
              </div>
            )}
          </div>
        )}

        {/* Sparkline chart */}
        {tracker.sparkline && tracker.sparkline.length > 0 && (
          <div className="mb-4">
            <SparklineChart
              data={tracker.sparkline}
              color={tracker.color || 'hsl(var(--primary))'}
              showTooltip={!isDraggable}
            />
          </div>
        )}

        {/* Statystyki */}
        {tracker.stats && (
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
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

        {/* Quick action buttons - nie pokazuj w trybie drag & drop */}
        {!isDraggable && (onAddEntry || onViewDetails) && (
          <QuickActionButtons
            trackerId={tracker.tracker_id}
            onAddEntry={handleAddEntry}
            onViewDetails={handleViewDetails}
          />
        )}
      </CardContent>
    </Card>
  );
}
