import { useState, useEffect, useCallback } from 'react';
import type {
  TrackerDetailResponseDto,
  TrackerStatsResponseDto,
  EntryListResponseDto,
  StatsPeriod,
  SortOrder,
} from '@shared/types';
import { trackersApi } from '@/lib/api/trackers';

interface UseTrackerDetailState {
  tracker: TrackerDetailResponseDto | null;
  stats: TrackerStatsResponseDto | null;
  entries: EntryListResponseDto | null;
  selectedPeriod: StatsPeriod;
  sortOrder: SortOrder;
  currentPage: number;
  isLoadingTracker: boolean;
  isLoadingStats: boolean;
  isLoadingEntries: boolean;
  error: string | null;
}

interface UseTrackerDetailActions {
  setPeriod: (period: StatsPeriod) => void;
  setSortOrder: (order: SortOrder) => void;
  loadMoreEntries: () => Promise<void>;
  refreshData: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshEntries: () => Promise<void>;
}

export function useTrackerDetail(
  trackerId: string
): UseTrackerDetailState & UseTrackerDetailActions {
  const [state, setState] = useState<UseTrackerDetailState>({
    tracker: null,
    stats: null,
    entries: null,
    selectedPeriod: '30d',
    sortOrder: 'desc',
    currentPage: 1,
    isLoadingTracker: true,
    isLoadingStats: true,
    isLoadingEntries: true,
    error: null,
  });

  // Load tracker details
  const loadTracker = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoadingTracker: true, error: null }));
      const tracker = await trackersApi.getById(trackerId);
      setState((prev) => ({ ...prev, tracker, isLoadingTracker: false }));
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Nie udało się załadować trackera';
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoadingTracker: false,
      }));
    }
  }, [trackerId]);

  // Load tracker statistics
  const loadStats = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoadingStats: true }));
      const stats = await trackersApi.getStats(trackerId, {
        period: state.selectedPeriod,
      });
      setState((prev) => ({ ...prev, stats, isLoadingStats: false }));
    } catch {
      setState((prev) => ({ ...prev, isLoadingStats: false }));
    }
  }, [trackerId, state.selectedPeriod]);

  // Load entries
  const loadEntries = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setState((prev) => ({ ...prev, isLoadingEntries: true }));
        const entries = await trackersApi.getEntries(trackerId, {
          page,
          limit: 20,
          sort_order: state.sortOrder,
        });

        setState((prev) => ({
          ...prev,
          entries:
            append && prev.entries
              ? {
                  ...entries,
                  data: [...prev.entries.data, ...entries.data],
                }
              : entries,
          currentPage: page,
          isLoadingEntries: false,
        }));
      } catch {
        setState((prev) => ({ ...prev, isLoadingEntries: false }));
      }
    },
    [trackerId, state.sortOrder]
  );

  // Initial load
  useEffect(() => {
    loadTracker();
  }, [loadTracker]);

  // Load stats when period changes
  useEffect(() => {
    if (state.tracker) {
      loadStats();
    }
  }, [state.tracker, state.selectedPeriod, loadStats]);

  // Load entries when tracker or sort order changes
  useEffect(() => {
    if (state.tracker) {
      loadEntries(1, false);
    }
  }, [state.tracker, state.sortOrder, loadEntries]);

  // Actions
  const setPeriod = useCallback((period: StatsPeriod) => {
    setState((prev) => ({ ...prev, selectedPeriod: period }));
  }, []);

  const setSortOrder = useCallback((order: SortOrder) => {
    setState((prev) => ({ ...prev, sortOrder: order }));
  }, []);

  const loadMoreEntries = useCallback(async () => {
    if (
      state.entries &&
      state.entries.pagination.page < state.entries.pagination.total_pages
    ) {
      await loadEntries(state.currentPage + 1, true);
    }
  }, [state.entries, state.currentPage, loadEntries]);

  const refreshData = useCallback(async () => {
    await Promise.all([loadTracker(), loadStats(), loadEntries(1, false)]);
  }, [loadTracker, loadStats, loadEntries]);

  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  const refreshEntries = useCallback(async () => {
    await loadEntries(1, false);
  }, [loadEntries]);

  return {
    ...state,
    setPeriod,
    setSortOrder,
    loadMoreEntries,
    refreshData,
    refreshStats,
    refreshEntries,
  };
}
