import { UserGreeting } from './UserGreeting';
import { SummaryStats } from './SummaryStats';
import { FilterBar } from './FilterBar';
import { TrackerCounterBadge } from './TrackerCounterBadge';
import { EditLayoutToggle } from './EditLayoutToggle';
import { RefreshButton } from './RefreshButton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { DashboardHeaderProps } from './types';

export function DashboardHeader({
  userName,
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
      {/* Powitanie użytkownika */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <UserGreeting userName={userName} />
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

      {/* Statystyki */}
      <SummaryStats summary={summary} />

      {/* Kontrolki filtrowania i edycji */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-4">
          <FilterBar activeFilter={filter} onFilterChange={onFilterChange} />
          <TrackerCounterBadge
            current={summary.total_trackers}
            limit={summary.tracker_limit}
          />
        </div>
        <EditLayoutToggle isEditMode={isEditMode} onToggle={onEditModeToggle} />
      </div>
    </div>
  );
}
