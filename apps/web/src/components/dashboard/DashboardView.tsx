import { useMemo } from 'react';
import { useDashboard } from '@/components/hooks/useDashboard';
import { DashboardHeader } from './DashboardHeader';
import { TrackerGrid } from './TrackerGrid';
import { EmptyState } from './EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function DashboardView() {
  const { state, actions } = useDashboard();

  // Filtrowanie trackerów na podstawie wybranego filtra
  const filteredTrackers = useMemo(() => {
    if (!state.data?.trackers) return [];

    switch (state.filter) {
      case 'own':
        return state.data.trackers.filter((t) => !t.is_shared);
      case 'shared':
        return state.data.trackers.filter((t) => t.is_shared);
      case 'all':
      default:
        return state.data.trackers;
    }
  }, [state.data?.trackers, state.filter]);

  // Obsługa stanu ładowania
  if (state.isLoading && !state.data) {
    return (
      <div className="space-y-6">
        {/* Skeleton dla nagłówka */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Skeleton dla siatki trackerów */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Obsługa błędów
  if (state.error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Błąd</AlertTitle>
          <AlertDescription>
            <div className="space-y-3">
              <p>{state.error.message}</p>
              <Button variant="outline" size="sm" onClick={actions.refetch}>
                Spróbuj ponownie
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Brak danych
  if (!state.data) {
    return (
      <EmptyState
        onCreateTracker={() => (window.location.href = '/app/trackers/new')}
      />
    );
  }

  // Brak trackerów
  if (filteredTrackers.length === 0) {
    // Jeśli zastosowano filtr i nie ma wyników
    if (state.filter !== 'all' && state.data.trackers.length > 0) {
      return (
        <div>
          <DashboardHeader
            summary={state.data.summary}
            filter={state.filter}
            isEditMode={state.isEditMode}
            onFilterChange={actions.setFilter}
            onEditModeToggle={actions.toggleEditMode}
            onRefresh={actions.refetch}
          />
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center text-muted-foreground">
              <p className="text-lg">Brak trackerów w tej kategorii</p>
              <p className="text-sm mt-2">Spróbuj zmienić filtr</p>
            </div>
          </div>
        </div>
      );
    }

    // Jeśli w ogóle nie ma trackerów
    return (
      <EmptyState
        onCreateTracker={() => (window.location.href = '/app/trackers/new')}
      />
    );
  }

  // Normalny widok z danymi
  return (
    <div>
      <DashboardHeader
        summary={state.data.summary}
        filter={state.filter}
        isEditMode={state.isEditMode}
        onFilterChange={actions.setFilter}
        onEditModeToggle={actions.toggleEditMode}
        onRefresh={actions.refetch}
      />

      <TrackerGrid
        trackers={filteredTrackers}
        isEditMode={state.isEditMode}
        onReorder={actions.handleReorder}
      />
    </div>
  );
}
