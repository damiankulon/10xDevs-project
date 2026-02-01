import type {
  TrackerDetailResponseDto,
  TrackerStatsResponseDto,
} from '@shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';

interface TrackerVisualizationSectionProps {
  tracker: TrackerDetailResponseDto;
  stats: TrackerStatsResponseDto | null;
  isLoading: boolean;
}

export function TrackerVisualizationSection({
  tracker,
  stats,
  isLoading,
}: TrackerVisualizationSectionProps) {
  if (isLoading) {
    return <VisualizationSkeleton />;
  }

  if (!stats) {
    return <EmptyChartState />;
  }

  const showNumericStats =
    tracker.data_type === 'number' || tracker.data_type === 'scale';

  return (
    <div className="space-y-4">
      {/* Stats Cards - only for numeric types */}
      {showNumericStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard
            title="Średnia"
            value={stats.stats.average}
            unit={tracker.unit}
          />
          <StatCard
            title="Minimum"
            value={stats.stats.min}
            unit={tracker.unit}
          />
          <StatCard
            title="Maksimum"
            value={stats.stats.max}
            unit={tracker.unit}
          />
          <StatCard
            title="Odch. std."
            value={stats.stats.std_dev}
            unit={tracker.unit}
          />
          <StatCard title="Liczba wpisów" value={stats.stats.count} isCount />
        </div>
      )}

      {/* Chart placeholder - will be implemented in next iteration */}
      <Card>
        <CardHeader>
          <CardTitle>Wizualizacja</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <BarChart3 className="h-12 w-12 mx-auto opacity-50" />
              <p>Wykres będzie dostępny wkrótce</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  unit?: string | null;
  isCount?: boolean;
}

function StatCard({ title, value, unit, isCount = false }: StatCardProps) {
  const formattedValue = isCount ? value.toString() : value.toFixed(2);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formattedValue}
          {unit && <span className="text-lg font-normal ml-1">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChartState() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center space-y-2">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold">Brak danych</h3>
          <p className="text-sm text-muted-foreground">
            Nie ma jeszcze żadnych wpisów dla wybranego okresu.
            <br />
            Dodaj pierwszy wpis, aby zobaczyć statystyki i wykresy.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function VisualizationSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
