import type {
  DashboardResponseDto,
  DashboardTrackerDto,
  DashboardSummaryDto,
  DashboardTrendDto,
  TrackerOrderItemDto,
  SparklineDataPoint,
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
  DashboardTrendDto,
  TrackerOrderItemDto,
  SparklineDataPoint,
};

// Typy dla propsów komponentów
export interface DashboardHeaderProps {
  userName: string;
  summary: DashboardSummaryDto;
  filter: 'all' | 'own' | 'shared';
  isEditMode: boolean;
  onFilterChange: (filter: 'all' | 'own' | 'shared') => void;
  onEditModeToggle: () => void;
  onRefresh: () => void;
  onCreateTracker?: () => void;
}

export interface TrackerGridProps {
  trackers: DashboardTrackerDto[];
  isEditMode: boolean;
  onReorder: (items: TrackerOrderItemDto[]) => void;
  onAddEntry?: (trackerId: string) => void;
  onViewDetails?: (trackerId: string) => void;
}

export interface TrackerCardProps {
  tracker: DashboardTrackerDto;
  isDraggable?: boolean;
  onAddEntry?: (trackerId: string) => void;
  onViewDetails?: (trackerId: string) => void;
}

export interface SparklineChartProps {
  data: SparklineDataPoint[];
  color?: string;
  showTooltip?: boolean;
}
