import type {
  DashboardResponseDto,
  DashboardTrackerDto,
  DashboardSummaryDto,
  TrackerOrderItemDto,
} from '@kipio/shared';

// Typ stanu zarządzanego przez hook useDashboard
export interface DashboardState {
  isLoading: boolean;
  error: Error | null;
  data: DashboardResponseDto | null;
  isEditMode: boolean;
  filter: 'all' | 'own' | 'shared';
}

// Eksportowane typy z shared dla łatwiejszego importu
export type {
  DashboardResponseDto,
  DashboardTrackerDto,
  DashboardSummaryDto,
  TrackerOrderItemDto,
};

// Typy dla propsów komponentów
export interface DashboardHeaderProps {
  summary: DashboardSummaryDto;
  filter: 'all' | 'own' | 'shared';
  isEditMode: boolean;
  onFilterChange: (filter: 'all' | 'own' | 'shared') => void;
  onEditModeToggle: () => void;
  onRefresh: () => void;
}

export interface TrackerGridProps {
  trackers: DashboardTrackerDto[];
  isEditMode: boolean;
  onReorder: (items: TrackerOrderItemDto[]) => void;
}

export interface TrackerCardProps {
  tracker: DashboardTrackerDto;
  isDraggable?: boolean;
}

export interface SparklineChartProps {
  data: DashboardTrackerDto['sparkline'];
  color?: string;
  showTooltip?: boolean;
}
