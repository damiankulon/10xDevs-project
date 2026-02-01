import { useState, useEffect, useCallback } from 'react';
import type { DashboardState, TrackerOrderItemDto } from '../dashboard/types';
import type { DashboardResponseDto } from '@kipio/shared';

interface UseDashboardReturn {
  state: DashboardState;
  actions: {
    refetch: () => Promise<void>;
    setFilter: (filter: 'all' | 'own' | 'shared') => void;
    toggleEditMode: () => void;
    handleReorder: (items: TrackerOrderItemDto[]) => Promise<void>;
  };
}

export function useDashboard(): UseDashboardReturn {
  const [state, setState] = useState<DashboardState>({
    isLoading: true,
    error: null,
    data: null,
    isEditMode: false,
    filter: 'all',
  });

  // Funkcja do pobierania danych z API
  const fetchDashboardData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`${apiUrl}/api/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Nie udało się załadować danych');
      }

      const data: DashboardResponseDto = await response.json();

      setState((prev) => ({
        ...prev,
        isLoading: false,
        data,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Nieznany błąd'),
      }));
    }
  }, []);

  // Pobierz dane przy montowaniu komponentu
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Akcja: odświeżenie danych
  const refetch = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  // Akcja: zmiana filtra
  const setFilter = useCallback((filter: 'all' | 'own' | 'shared') => {
    setState((prev) => ({ ...prev, filter }));
  }, []);

  // Akcja: przełączenie trybu edycji
  const toggleEditMode = useCallback(() => {
    setState((prev) => ({ ...prev, isEditMode: !prev.isEditMode }));
  }, []);

  // Akcja: zmiana kolejności trackerów
  const handleReorder = useCallback(
    async (items: TrackerOrderItemDto[]) => {
      if (!state.data) return;

      // Aktualizacja optymistyczna - zaktualizuj UI natychmiast
      const optimisticData = { ...state.data };
      const trackersMap = new Map(
        optimisticData.trackers.map((t) => [t.tracker_id, t])
      );

      const reorderedTrackers = items.map((item) => {
        const tracker = trackersMap.get(item.tracker_id);
        if (!tracker) throw new Error('Tracker nie znaleziony');
        return { ...tracker, display_order: item.display_order };
      });

      setState((prev) => ({
        ...prev,
        data: prev.data ? { ...prev.data, trackers: reorderedTrackers } : null,
      }));

      try {
        const response = await fetch('/api/trackers/reorder', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ trackers: items }),
        });

        if (!response.ok) {
          throw new Error('Nie udało się zapisać kolejności');
        }

        // Po zapisie, odśwież dane
        await fetchDashboardData();
      } catch (error) {
        // W przypadku błędu, cofnij optymistyczną aktualizację
        await fetchDashboardData();
        throw error;
      }
    },
    [state.data, fetchDashboardData]
  );

  return {
    state,
    actions: {
      refetch,
      setFilter,
      toggleEditMode,
      handleReorder,
    },
  };
}
