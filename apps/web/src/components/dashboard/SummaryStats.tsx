import { StatCard } from './StatCard';
import type { DashboardSummaryDto } from './types';
import { Activity, TrendingUp, Calendar, CheckCircle2 } from 'lucide-react';

interface SummaryStatsProps {
  summary: DashboardSummaryDto;
}

export function SummaryStats({ summary }: SummaryStatsProps) {
  return (
    <div className="summary-stats grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Wszystkie trackery"
        value={summary.total_trackers}
        icon={<Activity className="h-4 w-4" />}
      />
      <StatCard
        label="Aktywne trackery"
        value={summary.active_trackers}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <StatCard
        label="Wpisy dzisiaj"
        value={summary.entries_today}
        icon={<CheckCircle2 className="h-4 w-4" />}
      />
      <StatCard
        label="Wpisy w tym tygodniu"
        value={summary.entries_this_week}
        icon={<Calendar className="h-4 w-4" />}
      />
    </div>
  );
}
