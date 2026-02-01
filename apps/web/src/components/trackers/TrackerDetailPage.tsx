import { useState, useCallback } from 'react';
import { useTrackerDetail } from '@/components/hooks/useTrackerDetail';
import { TrackerDetailHeader } from './TrackerDetailHeader';
import { TimeRangeSelector } from './TimeRangeSelector';
import { TrackerVisualizationSection } from './TrackerVisualizationSection';
import { EntriesSection } from './EntriesSection';
import { AddEntryFAB } from './AddEntryFAB';
import { AddEntryBottomSheet } from './AddEntryBottomSheet';
import type { StatsPeriod } from '@shared/types';

interface TrackerDetailPageProps {
  trackerId: string;
}

export function TrackerDetailPage({ trackerId }: TrackerDetailPageProps) {
  const {
    tracker,
    stats,
    entries,
    selectedPeriod,
    sortOrder,
    isLoadingTracker,
    isLoadingStats,
    isLoadingEntries,
    error,
    setPeriod,
    setSortOrder,
    loadMoreEntries,
    refreshStats,
    refreshEntries,
  } = useTrackerDetail(trackerId);

  const [isAddEntrySheetOpen, setIsAddEntrySheetOpen] = useState(false);

  const handleBack = useCallback(() => {
    window.location.href = '/app/dashboard';
  }, []);

  const handlePeriodChange = useCallback(
    (period: StatsPeriod) => {
      setPeriod(period);
    },
    [setPeriod]
  );

  const handleEntryAdded = useCallback(async () => {
    setIsAddEntrySheetOpen(false);
    await Promise.all([refreshStats(), refreshEntries()]);
  }, [refreshStats, refreshEntries]);

  const handleEntryUpdated = useCallback(async () => {
    await Promise.all([refreshStats(), refreshEntries()]);
  }, [refreshStats, refreshEntries]);

  const handleEntryDeleted = useCallback(async () => {
    await Promise.all([refreshStats(), refreshEntries()]);
  }, [refreshStats, refreshEntries]);

  const handleOpenAddEntry = useCallback(() => {
    setIsAddEntrySheetOpen(true);
  }, []);

  // Error state
  if (error && !tracker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold text-destructive">
            Wystąpił błąd
          </h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Powrót do dashboardu
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingTracker) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // No tracker found
  if (!tracker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">Tracker nie znaleziony</h2>
          <p className="text-muted-foreground">
            Nie znaleziono trackera o podanym ID lub nie masz do niego dostępu.
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Powrót do dashboardu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header */}
        <TrackerDetailHeader tracker={tracker} onBack={handleBack} />

        {/* Time Range Selector */}
        <TimeRangeSelector
          value={selectedPeriod}
          onChange={handlePeriodChange}
        />

        {/* Visualization Section */}
        <TrackerVisualizationSection
          tracker={tracker}
          stats={stats}
          isLoading={isLoadingStats}
        />

        {/* Entries Section */}
        <EntriesSection
          tracker={tracker}
          entries={entries}
          sortOrder={sortOrder}
          isLoading={isLoadingEntries}
          onSortOrderChange={setSortOrder}
          onLoadMore={loadMoreEntries}
          onEntryUpdated={handleEntryUpdated}
          onEntryDeleted={handleEntryDeleted}
        />

        {/* FAB for adding entries */}
        <AddEntryFAB onClick={handleOpenAddEntry} />

        {/* Bottom Sheet for adding entries */}
        <AddEntryBottomSheet
          tracker={tracker}
          isOpen={isAddEntrySheetOpen}
          onClose={() => setIsAddEntrySheetOpen(false)}
          onEntryAdded={handleEntryAdded}
        />
      </div>
    </div>
  );
}
