import { FilterBar } from './FilterBar';
import { TrackerCounterBadge } from './TrackerCounterBadge';
import { EditLayoutToggle } from './EditLayoutToggle';
import { RefreshButton } from './RefreshButton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { DashboardHeaderProps } from './types';

export function DashboardHeader({
  summary,
  filter,
  isEditMode,
  onFilterChange,
  onEditModeToggle,
  onRefresh,
  onCreateTracker,
}: DashboardHeaderProps) {
  return (
    <div className="space-y-6 mb-8">
      {/* Nagłówek z licznikiem trackerów */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <TrackerCounterBadge
            current={summary.total_trackers}
            limit={summary.tracker_limit}
          />
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onRefresh={onRefresh} />
          {onCreateTracker && (
            <Button onClick={onCreateTracker} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nowy tracker
            </Button>
          )}
        </div>
      </div>

      {/* Kontrolki filtrowania i edycji */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-border">
        <FilterBar activeFilter={filter} onFilterChange={onFilterChange} />
        <EditLayoutToggle isEditMode={isEditMode} onToggle={onEditModeToggle} />
      </div>
    </div>
  );
}
