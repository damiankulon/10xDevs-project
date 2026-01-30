# Plan implementacji widoku pulpitu nawigacyjnego

## 1. Przegląd

Pulpit nawigacyjny jest głównym widokiem aplikacji po zalogowaniu użytkownika. Jego celem jest zapewnienie szybkiego przeglądu wszystkich zdefiniowanych przez użytkownika trackerów, wyświetlanie najnowszych danych i trendów oraz umożliwienie łatwego dostępu do dodawania nowych wpisów i zarządzania układem. Widok jest w pełni responsywny, zoptymalizowany pod kątem urządzeń mobilnych i zaprojektowany jako interaktywna wyspa React w architekturze Astro.

## 2. Routing widoku

Widok pulpitu nawigacyjnego będzie dostępny pod następującą ścieżką:

- `/app/dashboard`

Strona Astro `src/pages/app/dashboard.astro` będzie odpowiedzialna za renderowanie tego widoku.

## 3. Struktura komponentów

Hierarchia komponentów dla widoku pulpitu nawigacyjnego przedstawia się następująco:

```
src/pages/app/dashboard.astro
└── src/layouts/AppLayout.astro
    └── src/components/dashboard/DashboardView.tsx (React Island)
        ├── src/components/dashboard/DashboardHeader.tsx
        │   ├── src/components/dashboard/FilterBar.tsx
        │   ├── src/components/dashboard/TrackerCounterBadge.tsx
        │   ├── src/components/dashboard/EditLayoutToggle.tsx
        │   └── src/components/dashboard/RefreshButton.tsx
        ├── (jeśli są dane) src/components/dashboard/TrackerGrid.tsx
        │   └── src/components/dashboard/TrackerCard.tsx[]
        │       ├── src/components/dashboard/SparklineChart.tsx
        │       └── src/components/ui/Badge.tsx (Shadcn)
        ├── (jeśli brak danych) src/components/dashboard/EmptyState.tsx
        └── src/components/dashboard/AddEntryFAB.tsx
```

## 4. Szczegóły komponentów

### `DashboardView.tsx`

- **Opis komponentu:** Główny komponent React, który zarządza stanem całego widoku, pobiera dane i koordynuje interakcje między komponentami podrzędnymi.
- **Główne elementy:** `DashboardHeader`, `TrackerGrid` (lub `EmptyState`), `AddEntryFAB`. Wykorzystuje hook `useDashboard` do zarządzania logiką.
- **Obsługiwane interakcje:** Pobieranie danych przy montowaniu, obsługa odświeżania, filtrowania i trybu edycji.
- **Typy:** `DashboardResponseDto`, `DashboardState` (stan wewnętrzny).
- **Propsy:** Brak (jest to komponent najwyższego poziomu na stronie).

### `DashboardHeader.tsx`

- **Opis komponentu:** Pasek nagłówka zawierający wszystkie kontrolki do zarządzania widokiem pulpitu.
- **Główne elementy:** `FilterBar`, `TrackerCounterBadge`, `EditLayoutToggle`, `RefreshButton`.
- **Obsługiwane interakcje:** Przekazuje zdarzenia od komponentów podrzędnych do `DashboardView`.
- **Typy:** `DashboardSummaryDto`.
- **Propsy:**
  ```typescript
  interface DashboardHeaderProps {
    summary: DashboardSummaryDto | null;
    isEditMode: boolean;
    filter: 'all' | 'own' | 'shared';
    onFilterChange: (filter: 'all' | 'own' | 'shared') => void;
    onEditModeToggle: () => void;
    onRefresh: () => void;
  }
  ```

### `TrackerGrid.tsx`

- **Opis komponentu:** Siatka wyświetlająca karty trackerów. Odpowiada za responsywny układ (siatka na desktopie, lista na mobile) oraz implementację logiki przeciągnij i upuść (drag-and-drop) do zmiany kolejności.
- **Główne elementy:** Kontener (np. `div`) z mapowaniem po `TrackerCard`. Wykorzystuje bibliotekę `dnd-kit` do obsługi DnD.
- **Obsługiwane interakcje:** Zmiana kolejności trackerów w trybie edycji.
- **Warunki walidacji:** Logika DnD jest aktywna tylko wtedy, gdy `isEditMode` jest `true`.
- **Typy:** `DashboardTrackerDto[]`, `TrackerOrderItemDto`.
- **Propsy:**
  ```typescript
  interface TrackerGridProps {
    trackers: DashboardTrackerDto[];
    isEditMode: boolean;
    onReorder: (reorderedItems: TrackerOrderItemDto[]) => void;
  }
  ```

### `TrackerCard.tsx`

- **Opis komponentu:** Pojedyncza karta reprezentująca tracker. Wyświetla kluczowe informacje i działa jako link do widoku szczegółowego.
- **Główne elementy:** Komponent `Card` z Shadcn, `SparklineChart`, `Badge` (dla udostępnionych). Całość opakowana w tag `<a>` dla nawigacji.
- **Obsługiwane interakcje:** Kliknięcie nawiguje do strony szczegółów trackera.
- **Typy:** `DashboardTrackerDto`.
- **Propsy:**
  ```typescript
  interface TrackerCardProps {
    tracker: DashboardTrackerDto;
  }
  ```

### `SparklineChart.tsx`

- **Opis komponentu:** Komponent-wrapper dla biblioteki `Recharts`, dedykowany do renderowania mini-wykresu sparkline.
- **Główne elementy:** Komponenty z biblioteki `Recharts` (`LineChart`, `Line`, `Tooltip`).
- **Obsługiwane interakcje:** Wyświetlanie `Tooltip` na desktopie przy najechaniu.
- **Typy:** `DashboardTrackerDto['sparkline']`.
- **Propsy:**
  ```typescript
  interface SparklineChartProps {
    sparkline: DashboardTrackerDto['sparkline'];
    color: string; // Kolor linii wykresu
  }
  ```

## 5. Typy

Oprócz typów DTO importowanych z pakietu `@kipio/shared`, widok będzie korzystał z wewnętrznego typu do zarządzania stanem.

```typescript
import { DashboardResponseDto } from '@kipio/shared';

// Typ stanu zarządzanego przez hook useDashboard
export interface DashboardState {
  isLoading: boolean;
  error: Error | null;
  data: DashboardResponseDto | null;
  isEditMode: boolean;
  filter: 'all' | 'own' | 'shared';
}

// Typy DTO używane w komponentach (z @kipio/shared):
// - DashboardResponseDto
// - DashboardTrackerDto
// - DashboardSummaryDto
// - LastEntryDto
// - DashboardTrendDto
// - ReorderTrackersCommand
// - TrackerOrderItemDto
```

## 6. Zarządzanie stanem

Logika i stan widoku zostaną scentralizowane w niestandardowym hooku `useDashboard`. Takie podejście zapewnia separację logiki od prezentacji i ułatwia testowanie.

**Hook `useDashboard.ts`:**

- **Cel:** Zarządzanie cyklem życia danych (pobieranie, ładowanie, błędy), stanem UI (tryb edycji, filtry) oraz akcjami (odświeżanie, zmiana kolejności).
- **Zarządzany stan:** Obiekt `DashboardState`.
- **Udostępniane wartości i funkcje:**
  - `state: DashboardState`: Aktualny stan widoku.
  - `filteredTrackers: DashboardTrackerDto[]`: Memoizowana, przefiltrowana lista trackerów.
  - `actions.refetch()`: Funkcja do manualnego ponownego pobrania danych.
  - `actions.setFilter()`: Funkcja do zmiany aktywnego filtra.
  - `actions.toggleEditMode()`: Funkcja do przełączania trybu edycji.
  - `actions.handleReorder()`: Funkcja do wysyłania żądania zmiany kolejności.

## 7. Integracja API

Integracja z API będzie realizowana wewnątrz hooka `useDashboard`.

- **Pobieranie danych pulpitu:**
  - **Endpoint:** `GET /api/dashboard`
  - **Żądanie:** Wywołanie bez parametrów (domyślnie `sparkline_days=7`).
  - **Typ odpowiedzi:** `DashboardResponseDto`.
  - **Obsługa:** Wywoływane przy pierwszym renderowaniu oraz przez akcję `refetch`. Stan `isLoading` jest zarządzany w trakcie żądania.

- **Zmiana kolejności trackerów:**
  - **Endpoint:** `PATCH /api/trackers/reorder`
  - **Żądanie:** Wywoływane z ładunkiem `ReorderTrackersCommand`.
    ```typescript
    // Payload dla PATCH /api/trackers/reorder
    interface ReorderTrackersCommand {
      trackers: {
        tracker_id: string;
        display_order: number;
      }[];
    }
    ```
  - **Typ odpowiedzi:** `ReorderTrackersResponseDto`.
  - **Obsługa:** Wykonywana przez akcję `handleReorder`. Zalecana jest aktualizacja optymistyczna UI w celu zapewnienia płynności interakcji.

## 8. Interakcje użytkownika

- **Wyświetlenie widoku:** Użytkownik widzi szkielety ładowania (`Skeleton` z Shadcn), a następnie siatkę z trackerami.
- **Kliknięcie na kartę trackera:** Użytkownik jest przenoszony na stronę szczegółów danego trackera (`/app/trackers/[trackerId]`).
- **Kliknięcie przycisku "Odśwież":** Wywołuje akcję `refetch`, co prowadzi do ponownego pobrania danych z API.
- **Zmiana filtra:** Powoduje przefiltrowanie listy trackerów po stronie klienta i ponowne renderowanie `TrackerGrid`.
- **Włączenie "Trybu edycji":** Aktywuje możliwość przeciągania kart w `TrackerGrid`.
- **Przeciągnięcie i upuszczenie karty:** UI jest natychmiast aktualizowane (aktualizacja optymistyczna). Po zakończeniu edycji (np. kliknięcie "Zapisz") wysyłane jest żądanie do API.

## 9. Warunki i walidacja

- **Dostęp do widoku:** Widok chroniony, wymaga zalogowanego użytkownika. Globalny system routingu powinien obsłużyć przekierowanie niezalogowanych użytkowników.
- **Limit trackerów:** Komponent `TrackerCounterBadge` wizualnie informuje o zbliżaniu się do limitu (np. zmieniając kolor na żółty/czerwony), bazując na danych z `summary.total_trackers`.
- **Tryb edycji:** Funkcjonalność drag-and-drop jest dostępna wyłącznie, gdy `isEditMode` ma wartość `true`.

## 10. Obsługa błędów

- **Błąd pobierania danych:** Jeśli `GET /api/dashboard` zwróci błąd, `DashboardView` wyświetli komunikat o błędzie (np. "Nie udało się załadować danych") z przyciskiem "Spróbuj ponownie", który wywoła akcję `refetch`.
- **Błąd zapisu kolejności:** Jeśli `PATCH /api/trackers/reorder` zwróci błąd, optymistyczna aktualizacja UI zostanie cofnięta, a użytkownik zobaczy powiadomienie typu "toast" (np. z biblioteki `sonner`) z informacją o niepowodzeniu zapisu.
- **Brak trackerów:** Jeśli API zwróci pustą listę trackerów, `DashboardView` zamiast `TrackerGrid` wyświetli komponent `EmptyState` z zachętą do utworzenia pierwszego trackera.

## 11. Kroki implementacji

1.  **Struktura plików:** Utworzenie katalogów i pustych plików dla wszystkich zdefiniowanych komponentów w `src/components/dashboard/` oraz strony `src/pages/app/dashboard.astro`.
2.  **Hook `useDashboard`:** Implementacja hooka z logiką pobierania danych (`GET /api/dashboard`), zarządzaniem stanem `isLoading`, `error` i `data`. Na początek bez obsługi edycji i filtrowania.
3.  **Komponent `DashboardView`:** Stworzenie głównego komponentu, który używa hooka `useDashboard` i warunkowo renderuje stan ładowania, błędu lub dane.
4.  **Komponenty `TrackerGrid` i `TrackerCard`:** Implementacja komponentów do wyświetlania danych. `TrackerCard` powinien być linkiem do strony szczegółów.
5.  **Komponent `SparklineChart`:** Integracja `Recharts` w dedykowanym komponencie do wyświetlania sparkline.
6.  **Strona Astro:** Stworzenie strony `dashboard.astro`, która importuje i renderuje `DashboardView.tsx` jako wyspę React (`client:visible`).
7.  **Komponenty nagłówka:** Implementacja `DashboardHeader` i jego komponentów podrzędnych (`FilterBar`, `TrackerCounterBadge`, `RefreshButton`, `EditLayoutToggle`).
8.  **Integracja akcji:** Podłączenie akcji z nagłówka (filtrowanie, odświeżanie, tryb edycji) do funkcji udostępnianych przez hook `useDashboard`.
9.  **Implementacja Drag-and-Drop:** Integracja biblioteki `dnd-kit` w `TrackerGrid` w celu umożliwienia zmiany kolejności. Implementacja logiki `handleReorder` w hooku, włączając w to aktualizację optymistyczną i wywołanie `PATCH /api/trackers/reorder`.
10. **Obsługa przypadków brzegowych:** Implementacja komponentu `EmptyState` oraz finalizacja obsługi błędów (komunikaty dla użytkownika, toasty).
11. **Stylowanie i responsywność:** Dopracowanie wyglądu za pomocą Tailwind CSS, zapewnienie poprawnego działania na różnych szerokościach ekranu (układ listy na mobile, siatki na desktopie).
12. **Testowanie i poprawki:** Ręczne testy wszystkich interakcji, weryfikacja responsywności i obsługi błędów.
