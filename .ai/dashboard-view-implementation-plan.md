# Plan implementacji widoku Dashboard

## 1. Przegląd

Dashboard to główny widok aplikacji Kipio, który wyświetla się bezpośrednio po zalogowaniu użytkownika (lub po zakończeniu onboardingu). Jego głównym celem jest prezentacja wszystkich aktywnych trackerów użytkownika w formie kafelków z możliwością szybkiego dodawania nowych wpisów (w czasie < 5 sekund). Dashboard dostarcza przeglądu danych z mini-wykresami trendów (sparklines) oraz statystykami podsumowującymi aktywność użytkownika.

## 2. Routing widoku

- **Główna ścieżka**: `/app/dashboard` lub `/app` (redirect z `/app` do `/app/dashboard`)
- **Dostęp**: Chroniony - wymaga uwierzytelnienia (JWT token)
- **Layout**: Wykorzystuje główny layout aplikacji React SPA z App Header i Bottom Navigation (mobile)

## 3. Struktura komponentów

```
DashboardView (strona główna)
├── DashboardHeader
│   ├── UserGreeting
│   └── SummaryStats
│       ├── StatCard (total_trackers)
│       ├── StatCard (active_trackers)
│       ├── StatCard (entries_today)
│       └── StatCard (entries_this_week)
├── TrackerGrid (desktop/tablet) / TrackerList (mobile)
│   └── TrackerCard (dla każdego trackera)
│       ├── TrackerIcon
│       ├── TrackerHeader (nazwa, wartość ostatniego wpisu)
│       ├── SparklineChart (mini wykres trendu)
│       ├── TrendIndicator (kierunek i procent)
│       └── QuickActionButtons
│           ├── AddEntryButton (otwiera BottomSheet)
│           └── ViewDetailsButton (nawigacja do /app/trackers/:id)
├── AddTrackerButton (FAB lub przycisk na liście)
├── EmptyState (gdy brak trackerów)
└── LoadingState / ErrorState

Komponenty globalne używane:
└── BottomSheet (otwarty po kliknięciu AddEntryButton)
    ├── TrackerSelector
    ├── EntryForm (dynamiczny zależnie od data_type)
    └── SubmitButton
```

## 4. Szczegóły komponentów

### 4.1. DashboardView (główny komponent strony)

**Opis**: Główny kontener widoku dashboardu odpowiedzialny za pobieranie danych, zarządzanie stanem i orchestrację sub-komponentów.

**Główne elementy**:

- `<div className="dashboard-container">` - główny wrapper
- `<DashboardHeader>` - nagłówek z powitaniem i statystykami
- `<TrackerGrid>` lub `<TrackerList>` - responsywna lista kafelków trackerów
- `<AddTrackerButton>` - FAB (mobile) lub button (desktop)
- `<EmptyState>` - gdy brak trackerów
- `<LoadingState>` - podczas ładowania danych
- `<ErrorState>` - w przypadku błędu

**Obsługiwane zdarzenia**:

- Montowanie komponentu → fetch danych dashboardu
- Pull-to-refresh → odświeżenie danych
- Kliknięcie AddTrackerButton → nawigacja do `/app/trackers/new`
- Automatyczne odświeżanie (opcjonalnie co 30s dla aktywnego widoku)

**Warunki walidacji**:

- Brak walidacji formularza (widok tylko do odczytu)
- Weryfikacja czy użytkownik jest zalogowany (guard na poziomie routingu)

**Typy**:

- `DashboardResponseDto` - dane z API
- `DashboardViewState` - lokalny stan komponentu

**Propsy**:
Brak - komponent główny widoku, nie przyjmuje propsów z rodzica.

---

### 4.2. DashboardHeader

**Opis**: Nagłówek dashboardu wyświetlający powitanie użytkownika oraz główne statystyki.

**Główne elementy**:

- `<header className="dashboard-header">`
- `<UserGreeting>` - powitanie z nazwą użytkownika i czasem dnia
- `<SummaryStats>` - kontener dla kart statystyk

**Obsługiwane zdarzenia**:
Brak interakcji użytkownika - komponent prezentacyjny.

**Warunki walidacji**:
Brak walidacji.

**Typy**:

- `DashboardSummaryDto` - statystyki

**Propsy**:

```typescript
interface DashboardHeaderProps {
  userName: string;
  summary: DashboardSummaryDto;
}
```

---

### 4.3. UserGreeting

**Opis**: Komponent wyświetlający spersonalizowane powitanie użytkownika (np. "Dzień dobry, Jan!").

**Główne elementy**:

- `<div className="user-greeting">`
- `<h1>` - powitanie z imieniem
- `<p>` - opcjonalny podtytuł z datą

**Obsługiwane zdarzenia**:
Brak.

**Warunki walidacji**:
Brak.

**Typy**:
Brak specyficznych typów.

**Propsy**:

```typescript
interface UserGreetingProps {
  userName: string;
}
```

---

### 4.4. SummaryStats

**Opis**: Kontener dla kart ze statystykami (liczba trackerów, wpisy dzisiaj/w tym tygodniu).

**Główne elementy**:

- `<div className="summary-stats grid">`
- 4x `<StatCard>` dla każdej metryki

**Obsługiwane zdarzenia**:
Brak.

**Warunki walidacji**:
Brak.

**Typy**:

- `DashboardSummaryDto`

**Propsy**:

```typescript
interface SummaryStatsProps {
  summary: DashboardSummaryDto;
}
```

---

### 4.5. StatCard

**Opis**: Pojedyncza karta statystyki (liczba + etykieta).

**Główne elementy**:

- `<div className="stat-card">`
- `<span className="stat-value">` - wartość liczbowa
- `<span className="stat-label">` - etykieta

**Obsługiwane zdarzenia**:
Brak (lub opcjonalnie onClick dla drilldown w przyszłości).

**Warunki walidacji**:
Brak.

**Typy**:
Brak specyficznych typów.

**Propsy**:

```typescript
interface StatCardProps {
  label: string;
  value: number;
  icon?: React.ReactNode;
}
```

---

### 4.6. TrackerGrid / TrackerList

**Opis**: Responsywny kontener dla kafelków trackerów. Na mobile wyświetla się jako lista wertykalna, na tablet/desktop jako grid 2-4 kolumny.

**Główne elementy**:

- `<div className="tracker-grid">` (desktop) lub `<ul className="tracker-list">` (mobile)
- `<TrackerCard>` dla każdego trackera

**Obsługiwane zdarzenia**:

- Drag-and-drop (w trybie edycji) → zmiana kolejności trackerów → wywołanie `PATCH /api/trackers/reorder`
- Tryb edycji może być włączony przyciskiem w header

**Warunki walidacji**:

- Przy zmianie kolejności: walidacja czy użytkownik jest właścicielem wszystkich trackerów (API zwróci 403 w przeciwnym wypadku)

**Typy**:

- `DashboardTrackerDto[]`

**Propsy**:

```typescript
interface TrackerGridProps {
  trackers: DashboardTrackerDto[];
  onReorder?: (
    newOrder: { id: string; display_order: number }[]
  ) => Promise<void>;
  isEditMode?: boolean;
}
```

---

### 4.7. TrackerCard

**Opis**: Kafelek pojedynczego trackera wyświetlający nazwę, ostatnią wartość, sparkline i trend.

**Główne elementy**:

- `<div className="tracker-card">` z obramowaniem w kolorze trackera (`color`)
- `<TrackerIcon>` - ikona lub fallback
- `<div className="tracker-header">`
  - `<h3>` - nazwa trackera
  - `<span className="last-value">` - ostatnia wartość z jednostką
- `<SparklineChart data={sparkline_data}>` - mini wykres
- `<TrendIndicator trend={trend}>` - kierunek i procent zmiany
- `<QuickActionButtons>` - przyciski akcji

**Obsługiwane zdarzenia**:

- Kliknięcie na kafelek (poza przyciskami) → nawigacja do `/app/trackers/:id`
- Kliknięcie AddEntryButton → otwarcie BottomSheet z pre-selected trackerId
- Kliknięcie ViewDetailsButton → nawigacja do `/app/trackers/:id`

**Warunki walidacji**:
Brak - komponent prezentacyjny.

**Typy**:

- `DashboardTrackerDto`

**Propsy**:

```typescript
interface TrackerCardProps {
  tracker: DashboardTrackerDto;
  onAddEntry: (trackerId: string) => void;
  onViewDetails: (trackerId: string) => void;
}
```

---

### 4.8. TrackerIcon

**Opis**: Wyświetla ikonę trackera lub fallback (pierwsza litera nazwy).

**Główne elementy**:

- `<div className="tracker-icon">` z background w kolorze `tracker.color`
- Renderowanie ikony (jeśli `icon` jest podany) lub pierwszej litery nazwy

**Obsługiwane zdarzenia**:
Brak.

**Warunki walidacji**:
Brak.

**Typy**:
Brak specyficznych typów.

**Propsy**:

```typescript
interface TrackerIconProps {
  icon?: string | null;
  name: string;
  color?: string | null;
}
```

---

### 4.9. SparklineChart

**Opis**: Mini wykres liniowy pokazujący trend z ostatnich N dni (domyślnie 7).

**Główne elementy**:

- `<ResponsiveContainer>` z Recharts
- `<LineChart data={chartData}>`
- `<Line>` - pojedyncza linia wykresu

**Obsługiwane zdarzenia**:
Brak (wykres read-only, bez tooltipów dla prostoty).

**Warunki walidacji**:
Brak.

**Typy**:

- `number[]` - tablica wartości do wykresu

**Propsy**:

```typescript
interface SparklineChartProps {
  data: number[];
  color?: string;
}
```

---

### 4.10. TrendIndicator

**Opis**: Wskaźnik trendu (strzałka w górę/dół/poziomo + procent zmiany).

**Główne elementy**:

- `<div className="trend-indicator">`
- Ikona strzałki (Arrow Up/Down/Right) zależnie od `trend.direction`
- `<span>` z wartością procentową

**Obsługiwane zdarzenia**:
Brak.

**Warunki walidacji**:
Brak.

**Typy**:

- `DashboardTrendDto`

**Propsy**:

```typescript
interface TrendIndicatorProps {
  trend: DashboardTrendDto;
}
```

---

### 4.11. QuickActionButtons

**Opis**: Przyciski akcji na kafelku trackera (dodaj wpis, zobacz szczegóły).

**Główne elementy**:

- `<div className="quick-actions">`
- `<button>` - "Dodaj wpis" (ikona Plus)
- `<button>` - "Zobacz" (ikona ChevronRight)

**Obsługiwane zdarzenia**:

- onClick dla każdego przycisku → callback przekazany przez props

**Warunki walidacji**:
Brak.

**Typy**:
Brak specyficznych typów.

**Propsy**:

```typescript
interface QuickActionButtonsProps {
  onAddEntry: () => void;
  onViewDetails: () => void;
}
```

---

### 4.12. AddTrackerButton

**Opis**: FAB (Floating Action Button) na mobile lub standardowy przycisk na desktop, służący do dodania nowego trackera.

**Główne elementy**:

- `<button className="add-tracker-fab">` (mobile)
- `<button className="add-tracker-button">` (desktop)
- Ikona Plus

**Obsługiwane zdarzenia**:

- onClick → nawigacja do `/app/trackers/new` (lub otwarcie modala)

**Warunki walidacji**:

- Sprawdzenie limitu trackerów (jeśli użytkownik ma 50/50, wyświetl komunikat)

**Typy**:
Brak specyficznych typów.

**Propsy**:

```typescript
interface AddTrackerButtonProps {
  currentTrackerCount: number;
  trackerLimit: number;
  onClick: () => void;
}
```

---

### 4.13. EmptyState

**Opis**: Widok wyświetlany gdy użytkownik nie ma żadnych trackerów.

**Główne elementy**:

- `<div className="empty-state">`
- Ilustracja lub ikona
- `<h2>` - nagłówek "Brak trackerów"
- `<p>` - tekst zachęcający do utworzenia pierwszego trackera
- `<button>` - "Utwórz pierwszy tracker"

**Obsługiwane zdarzenia**:

- onClick przycisku → nawigacja do `/app/trackers/new`

**Warunki walidacji**:
Brak.

**Typy**:
Brak.

**Propsy**:

```typescript
interface EmptyStateProps {
  onCreateTracker: () => void;
}
```

---

### 4.14. LoadingState

**Opis**: Skeleton loading state podczas ładowania danych dashboardu.

**Główne elementy**:

- Skeleton dla DashboardHeader
- Grid/Lista skeleton cards dla trackerów

**Obsługiwane zdarzenia**:
Brak.

**Warunki walidacji**:
Brak.

**Typy**:
Brak.

**Propsy**:
Brak.

---

### 4.15. ErrorState

**Opis**: Komunikat błędu gdy nie udało się załadować danych.

**Główne elementy**:

- `<div className="error-state">`
- Ikona błędu
- `<h2>` - nagłówek błędu
- `<p>` - komunikat błędu
- `<button>` - "Spróbuj ponownie"

**Obsługiwane zdarzenia**:

- onClick "Spróbuj ponownie" → refetch danych

**Warunki walidacji**:
Brak.

**Typy**:

- `Error` - obiekt błędu

**Propsy**:

```typescript
interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}
```

---

## 5. Typy

### 5.1. Typy DTO z API (importowane z `@kipio/shared`)

```typescript
// Główna odpowiedź z dashboardu
interface DashboardResponseDto {
  trackers: DashboardTrackerDto[];
  summary: DashboardSummaryDto;
}

// Pojedynczy tracker na dashboardzie
interface DashboardTrackerDto {
  id: string;
  name: string;
  data_type: DataType;
  unit: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  last_entry: LastEntryDto | null;
  sparkline_data: number[];
  trend: DashboardTrendDto;
}

// Ostatni wpis trackera
interface LastEntryDto {
  value: number | boolean | string;
  recorded_at: string;
}

// Trend trackera
interface DashboardTrendDto {
  direction: TrendDirection;
  percentage: number;
}

type TrendDirection = 'up' | 'down' | 'stable';

// Statystyki dashboardu
interface DashboardSummaryDto {
  total_trackers: number;
  active_trackers: number;
  entries_today: number;
  entries_this_week: number;
}

// Parametry zapytania do API
interface DashboardQueryDto {
  sparkline_days?: number;
}

// Typy dla reorderowania trackerów
interface TrackerOrderItemDto {
  id: string;
  display_order: number;
}

interface ReorderTrackersCommand {
  order: TrackerOrderItemDto[];
}

interface ReorderTrackersResponseDto {
  message: string;
  updated_count: number;
}
```

### 5.2. Typy ViewModel (lokalne dla widoku)

```typescript
// Stan widoku dashboardu
interface DashboardViewState {
  isLoading: boolean;
  error: Error | null;
  data: DashboardResponseDto | null;
  isEditMode: boolean; // dla drag-and-drop reordering
}

// Dane do sparkline chart (przekształcone)
interface SparklineChartData {
  values: number[];
}

// Formatowana ostatnia wartość dla wyświetlenia
interface FormattedLastEntry {
  displayValue: string; // np. "75 kg", "Tak", "8/10"
  timestamp: string;
}
```

### 5.3. Typy dla komponentów

```typescript
// Props dla głównego widoku
interface DashboardViewProps {
  // Brak - główny komponent
}

// Props dla TrackerGrid
interface TrackerGridProps {
  trackers: DashboardTrackerDto[];
  onReorder?: (newOrder: TrackerOrderItemDto[]) => Promise<void>;
  isEditMode?: boolean;
}

// Props dla TrackerCard
interface TrackerCardProps {
  tracker: DashboardTrackerDto;
  onAddEntry: (trackerId: string) => void;
  onViewDetails: (trackerId: string) => void;
}

// Props dla SparklineChart
interface SparklineChartProps {
  data: number[];
  color?: string;
}

// Props dla TrendIndicator
interface TrendIndicatorProps {
  trend: DashboardTrendDto;
}
```

---

## 6. Zarządzanie stanem

### 6.1. Stan serwerowy (TanStack Query)

```typescript
// Hook do pobierania danych dashboardu
function useDashboard(sparklineDays: number = 7) {
  return useQuery({
    queryKey: ['dashboard', { sparklineDays }],
    queryFn: () => getDashboard(sparklineDays),
    staleTime: 30_000, // 30 sekund
    refetchOnWindowFocus: true,
  });
}

// Hook do reorderowania trackerów
function useReorderTrackers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (order: TrackerOrderItemDto[]) => reorderTrackers(order),
    onSuccess: () => {
      // Invalidate dashboard query aby odświeżyć dane
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
```

### 6.2. Stan lokalny UI (React useState/useReducer)

```typescript
// W komponencie DashboardView
const [isEditMode, setIsEditMode] = useState(false);
const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(null);
```

### 6.3. Stan globalny (Context/Zustand - dla BottomSheet)

BottomSheet jest komponentem globalnym, więc jego stan (otwarty/zamknięty, wybrany tracker) powinien być zarządzany globalnie:

```typescript
// useBottomSheet hook (z Context lub Zustand)
interface BottomSheetState {
  isOpen: boolean;
  selectedTrackerId: string | null;
  open: (trackerId?: string) => void;
  close: () => void;
}

const useBottomSheet = () => {
  // Implementacja z Context lub Zustand
};
```

---

## 7. Integracja API

### 7.1. Endpoint: GET /api/dashboard

**URL**: `GET /api/dashboard?sparkline_days=7`

**Headers**:

```
Authorization: Bearer <jwt_token>
```

**Query Parameters**:

- `sparkline_days` (opcjonalny, domyślnie 7, zakres 1-30)

**Request Type**: `DashboardQueryDto` (query params)

**Response Type**: `DashboardResponseDto`

**Response (200 OK)**:

```json
{
  "trackers": [
    {
      "id": "uuid",
      "name": "Waga",
      "data_type": "number",
      "unit": "kg",
      "color": "#3B82F6",
      "icon": "scale",
      "is_active": true,
      "last_entry": {
        "value": 75.5,
        "recorded_at": "2026-02-01T08:30:00Z"
      },
      "sparkline_data": [74.8, 75.0, 75.2, 75.1, 75.3, 75.5, 75.5],
      "trend": {
        "direction": "up",
        "percentage": 0.93
      }
    }
  ],
  "summary": {
    "total_trackers": 12,
    "active_trackers": 8,
    "entries_today": 5,
    "entries_this_week": 23
  }
}
```

**Obsługa błędów**:

- `401 Unauthorized` - przekierowanie do `/login`
- `500 Internal Server Error` - wyświetlenie ErrorState z możliwością retry

### 7.2. Endpoint: PATCH /api/trackers/reorder

**URL**: `PATCH /api/trackers/reorder`

**Headers**:

```
Authorization: Bearer <jwt_token>
```

**Request Type**: `ReorderTrackersCommand`

**Request Body**:

```json
{
  "order": [
    { "id": "uuid1", "display_order": 0 },
    { "id": "uuid2", "display_order": 1 },
    { "id": "uuid3", "display_order": 2 }
  ]
}
```

**Response Type**: `ReorderTrackersResponseDto`

**Response (200 OK)**:

```json
{
  "message": "Tracker order updated successfully",
  "updated_count": 3
}
```

**Obsługa błędów**:

- `403 Forbidden` - użytkownik nie jest właścicielem któregoś z trackerów (toast z komunikatem)
- `400 Bad Request` - błąd walidacji (toast z komunikatem)

### 7.3. Service Layer (API Client)

```typescript
// src/lib/api/dashboard.ts
import type { DashboardResponseDto, DashboardQueryDto } from '@kipio/shared';

export async function getDashboard(
  sparklineDays: number = 7
): Promise<DashboardResponseDto> {
  const response = await fetch(
    `/api/dashboard?sparkline_days=${sparklineDays}`,
    {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }

  return response.json();
}

export async function reorderTrackers(
  order: TrackerOrderItemDto[]
): Promise<ReorderTrackersResponseDto> {
  const response = await fetch('/api/trackers/reorder', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ order }),
  });

  if (!response.ok) {
    throw new Error('Failed to reorder trackers');
  }

  return response.json();
}
```

---

## 8. Interakcje użytkownika

### 8.1. Przeglądanie dashboardu

**Akcja**: Użytkownik wchodzi na `/app/dashboard`

**Przepływ**:

1. Komponent montuje się
2. Hook `useDashboard()` wykonuje zapytanie GET /api/dashboard
3. Podczas ładowania wyświetla się LoadingState (skeleton)
4. Po udanym pobraniu danych renderuje się lista trackerów i statystyki
5. Użytkownik widzi kafelki trackerów z sparklines i trendami

**Oczekiwany wynik**: Dashboard załadowany w < 1s, użytkownik widzi wszystkie aktywne trackery.

---

### 8.2. Szybkie dodawanie wpisu

**Akcja**: Użytkownik klika przycisk "Dodaj wpis" na kafelku trackera

**Przepływ**:

1. onClick wywołuje `openBottomSheet(trackerId)`
2. BottomSheet otwiera się z animacją od dołu ekranu
3. Tracker jest pre-selected (nazwa i typ widoczne)
4. Formularz wartości jest gotowy do wypełnienia (autofocus)
5. Użytkownik wprowadza wartość
6. Klika "Zapisz"
7. Wywołanie POST /api/trackers/:trackerId/entries
8. Optimistic update - BottomSheet zamyka się, wartość pojawia się na kafelku
9. W tle wykonuje się invalidate query dla dashboardu

**Oczekiwany wynik**: Wpis dodany w < 5 sekund, natychmiastowy feedback wizualny.

---

### 8.3. Nawigacja do szczegółów trackera

**Akcja**: Użytkownik klika na kafelek trackera (lub przycisk "Zobacz")

**Przepływ**:

1. onClick wywołuje `navigate(/app/trackers/${trackerId})`
2. React Router nawiguje do widoku TrackerDetail
3. View Transition API (jeśli dostępne) dodaje płynną animację

**Oczekiwany wynik**: Użytkownik widzi szczegółowy widok trackera z pełnym wykresem i historią wpisów.

---

### 8.4. Zmiana kolejności trackerów (Edit Mode)

**Akcja**: Użytkownik klika przycisk "Edytuj układ" w header

**Przepływ**:

1. Stan `isEditMode` zmienia się na `true`
2. Kafelki trackerów pokazują "handle" do przeciągania
3. Użytkownik przeciąga kafelki w nowej kolejności (drag-and-drop)
4. Po puszczeniu, lokalny stan aktualizuje kolejność (optimistic)
5. Klika "Zapisz"
6. Wywołanie PATCH /api/trackers/reorder z nową kolejnością
7. Na sukces - toast "Kolejność zapisana"
8. Na błąd - rollback do poprzedniej kolejności + toast z błędem

**Oczekiwany wynik**: Zmiana kolejności zapisana, trackery wyświetlają się w nowej kolejności.

---

### 8.5. Dodawanie nowego trackera

**Akcja**: Użytkownik klika FAB "+" (AddTrackerButton)

**Przepływ**:

1. Sprawdzenie limitu trackerów (jeśli 50/50 → toast + return)
2. onClick wywołuje `navigate(/app/trackers/new)`
3. Użytkownik wypełnia formularz tworzenia trackera
4. Po zapisaniu wraca na dashboard z nowym trackerem na liście

**Oczekiwany wynik**: Nowy tracker utworzony i widoczny na dashboardzie.

---

### 8.6. Pull-to-refresh (mobile)

**Akcja**: Użytkownik przeciąga ekran w dół (gesture)

**Przepływ**:

1. Wykrycie pull gesture
2. Wywołanie `refetch()` z TanStack Query
3. Animacja "ładowania"
4. Dashboard odświeża się z nowymi danymi

**Oczekiwany wynik**: Dane dashboardu zaktualizowane.

---

## 9. Warunki i walidacja

### 9.1. Warunki dostępu

**Warunek**: Użytkownik musi być zalogowany (posiadać ważny JWT token)

**Komponent**: Route guard na poziomie routingu React Router

**Weryfikacja**:

- Sprawdzenie obecności tokenu w localStorage/sessionStorage
- Jeśli brak → redirect do `/login`
- Jeśli token wygasł (401 z API) → logout + redirect do `/login`

---

### 9.2. Limit trackerów

**Warunek**: Użytkownik nie może mieć więcej trackerów niż `trackers_limit` (domyślnie 50)

**Komponent**: `AddTrackerButton`

**Weryfikacja**:

```typescript
const canAddTracker = currentTrackerCount < trackerLimit;

if (!canAddTracker) {
  toast.error('Osiągnięto limit trackerów (50/50)');
  return;
}
```

---

### 9.3. Walidacja sparkline_days

**Warunek**: Parametr `sparkline_days` musi być w zakresie 1-30

**Komponent**: `DashboardView` (przed wysłaniem zapytania)

**Weryfikacja**:

```typescript
const sparklineDays = Math.min(Math.max(userInput, 1), 30);
```

---

### 9.4. Ownership dla reorderowania

**Warunek**: Użytkownik może zmieniać kolejność tylko własnych trackerów

**Komponent**: `TrackerGrid` (w trybie Edit Mode)

**Weryfikacja**:

- Filtrowanie listy trackerów przed drag-and-drop (tylko `is_owner === true`)
- API zwróci 403 jeśli użytkownik spróbuje zmienić kolejność nie-własnych trackerów
- Frontend: komunikat "Możesz zmieniać kolejność tylko własnych trackerów"

---

### 9.5. Aktywność trackerów

**Warunek**: Na dashboardzie wyświetlane są tylko aktywne trackery (`is_active === true`)

**Komponent**: Backend (endpoint `/api/dashboard` filtruje)

**Weryfikacja**: Brak walidacji po stronie frontend - backend zwraca już przefiltrowane dane.

---

## 10. Obsługa błędów

### 10.1. Błąd 401 Unauthorized

**Scenariusz**: Token JWT wygasł lub jest nieprawidłowy

**Obsługa**:

1. Interceptor API wykrywa 401
2. Wywołuje funkcję logout (czyszczenie tokenu z storage)
3. Redirect do `/login`
4. Toast: "Sesja wygasła. Zaloguj się ponownie."

---

### 10.2. Błąd 403 Forbidden (reordering)

**Scenariusz**: Użytkownik próbuje zmienić kolejność trackera, którego nie jest właścicielem

**Obsługa**:

1. API zwraca 403
2. Rollback lokalnej zmiany kolejności
3. Toast: "Brak uprawnień. Możesz zmieniać kolejność tylko własnych trackerów."

---

### 10.3. Błąd 500 Internal Server Error

**Scenariusz**: Błąd serwera podczas pobierania danych dashboardu

**Obsługa**:

1. Hook `useDashboard` ustawia `error` state
2. Renderuje się `<ErrorState>`
3. Użytkownik widzi komunikat: "Nie udało się załadować danych"
4. Przycisk "Spróbuj ponownie" → retry query

---

### 10.4. Błąd sieci (Network Error)

**Scenariusz**: Brak połączenia z internetem

**Obsługa**:

1. TanStack Query wykrywa network error
2. Renderuje się `<ErrorState>` z komunikatem "Brak połączenia z internetem"
3. Opcjonalnie: pokazanie banneru "Offline" (globalny komponent)
4. Użytkownik może spróbować ponownie gdy połączenie wróci

---

### 10.5. Pusta lista trackerów

**Scenariusz**: Użytkownik nie ma żadnych trackerów (nowy użytkownik lub usunął wszystkie)

**Obsługa**:

1. Backend zwraca pustą tablicę `trackers: []`
2. Komponent `DashboardView` wykrywa `data.trackers.length === 0`
3. Renderuje się `<EmptyState>` zamiast `<TrackerGrid>`
4. EmptyState zachęca do utworzenia pierwszego trackera

---

### 10.6. Błąd dodawania wpisu (z BottomSheet)

**Scenariusz**: Błąd przy POST /api/trackers/:trackerId/entries (np. 422 walidacja)

**Obsługa**:

1. API zwraca 422 z `details` (błędy walidacji)
2. BottomSheet pozostaje otwarty
3. Wyświetlenie inline error messages przy polach formularza
4. Toast: "Nieprawidłowa wartość. Sprawdź formularz."
5. Użytkownik może poprawić i spróbować ponownie

---

### 10.7. Limit trackerów osiągnięty

**Scenariusz**: Użytkownik klika AddTrackerButton mając już 50/50 trackerów

**Obsługa**:

1. Walidacja w komponencie `AddTrackerButton`
2. Jeśli `currentTrackerCount >= trackerLimit` → prevent navigation
3. Toast: "Osiągnięto limit trackerów (50/50). Usuń nieużywane trackery aby dodać nowe."
4. Opcjonalnie: link do widoku trackerów z filtrem `is_active=false`

---

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury projektu

1. Utworzenie folderu `src/pages/app/dashboard/`
2. Utworzenie pliku `DashboardView.tsx` (główny komponent)
3. Utworzenie folderu `src/components/dashboard/` dla sub-komponentów
4. Dodanie routingu `/app/dashboard` w React Router

### Krok 2: Implementacja API Client

1. Utworzenie `src/lib/api/dashboard.ts`
2. Implementacja funkcji `getDashboard(sparklineDays)`
3. Implementacja funkcji `reorderTrackers(order)`
4. Dodanie typów request/response (import z `@kipio/shared`)

### Krok 3: Implementacja TanStack Query Hooks

1. Utworzenie `src/hooks/useDashboard.ts`
2. Implementacja hooka `useDashboard()` z queryKey i queryFn
3. Utworzenie `src/hooks/useReorderTrackers.ts`
4. Implementacja hooka `useReorderTrackers()` z mutation i invalidation

### Krok 4: Implementacja komponentów prezentacyjnych

1. `DashboardHeader.tsx` - nagłówek z powitaniem i statystykami
2. `UserGreeting.tsx` - spersonalizowane powitanie
3. `SummaryStats.tsx` - kontener dla statystyk
4. `StatCard.tsx` - pojedyncza karta statystyki
5. `TrackerIcon.tsx` - ikona trackera z fallback
6. `SparklineChart.tsx` - mini wykres (Recharts)
7. `TrendIndicator.tsx` - wskaźnik trendu ze strzałką
8. `QuickActionButtons.tsx` - przyciski akcji na kafelku

### Krok 5: Implementacja komponentów kontenerowych

1. `TrackerCard.tsx` - kafelek trackera z logiką onClick
2. `TrackerGrid.tsx` / `TrackerList.tsx` - responsywny kontener z drag-and-drop (opcjonalnie: biblioteka react-beautiful-dnd)
3. `AddTrackerButton.tsx` - FAB z walidacją limitu

### Krok 6: Implementacja stanów widoku

1. `EmptyState.tsx` - widok pustej listy
2. `LoadingState.tsx` - skeleton loading
3. `ErrorState.tsx` - komunikat błędu z retry

### Krok 7: Implementacja głównego komponentu DashboardView

1. Import hooków `useDashboard()` i `useReorderTrackers()`
2. Logika warunkowego renderowania (loading/error/empty/data)
3. Obsługa zdarzeń (onAddEntry, onViewDetails, onReorder)
4. Integracja z globalnym BottomSheet (Context/Zustand)

### Krok 8: Stylowanie komponentów

1. Tailwind CSS classes dla layoutu responsywnego
2. Grid/Flexbox dla TrackerGrid (mobile: list, desktop: grid 2-4 kolumny)
3. Animacje (View Transitions API, CSS transitions dla BottomSheet)
4. Dark mode styling (domyślny)

### Krok 9: Obsługa błędów i edge cases

1. Implementacja error boundary dla całego widoku
2. Obsługa 401 (redirect do login)
3. Obsługa 403, 500, network errors (toast + ErrorState)
4. Walidacja limitu trackerów
5. Rollback przy błędzie reorderowania

### Krok 10: Integracja z BottomSheet

1. Utworzenie Context/Zustand store dla BottomSheet state
2. Hook `useBottomSheet()` z metodami open/close
3. Przekazanie `selectedTrackerId` do BottomSheet przy otwarciu
4. Implementacja formularza dodawania wpisu w BottomSheet (osobny plan implementacji)

### Krok 11: Pull-to-refresh (mobile)

1. Użycie biblioteki lub custom gesture detector
2. Wywołanie `refetch()` z TanStack Query
3. Animacja loading podczas odświeżania

### Krok 12: Optymalizacja wydajności

1. Memoizacja komponentów (React.memo dla TrackerCard, SparklineChart)
2. useMemo dla przetworzonej listy trackerów
3. useCallback dla handlerów zdarzeń
4. Lazy loading dla SparklineChart (jeśli wykres jest ciężki)

### Krok 13: Testy jednostkowe

1. Testy dla hooków API (`useDashboard`, `useReorderTrackers`)
2. Testy komponentów prezentacyjnych (snapshot tests)
3. Testy interakcji użytkownika (React Testing Library)
4. Mock API responses dla testów

### Krok 14: Testy integracyjne

1. Test flow: załadowanie dashboardu → otwarcie BottomSheet → dodanie wpisu
2. Test flow: zmiana kolejności trackerów (Edit Mode)
3. Test obsługi błędów (mock API errors)

### Krok 15: Dokumentacja i code review

1. Dodanie JSDoc komentarzy do głównych komponentów i hooków
2. Aktualizacja README z opisem widoku Dashboard
3. Code review z zespołem
4. Feedback i refactoring

### Krok 16: Deploy i monitoring

1. Merge do main branch
2. Deploy na środowisko staging
3. Testy manualne E2E
4. Monitoring błędów (Sentry/podobne)
5. Deploy na produkcję

---

## Dodatkowe uwagi

### Accessibility (a11y)

- Wszystkie przyciski muszą mieć odpowiednie `aria-label`
- Keyboard navigation: Tab, Enter, Escape (dla BottomSheet)
- Screen reader support: semantyczne HTML (header, main, article, button)
- Focus management (auto-focus w BottomSheet, focus trap)
- Color contrast zgodny z WCAG AA

### Performance

- Lazy loading dla wykresów (kod splitting)
- Virtual scrolling jeśli użytkownik ma > 20 trackerów (react-window)
- Debounce dla pull-to-refresh
- Optimistic updates dla lepszego UX

### Mobile-First

- Touch-friendly rozmiary przycisków (min 44x44px)
- Swipe gestures (pull-to-refresh, swipe-to-close BottomSheet)
- Responsywny layout (mobile: lista, tablet/desktop: grid)
- PWA: offline banner (jeśli brak połączenia)

### Przyszłe rozszerzenia

- Filtrowanie trackerów (po typie, aktywności)
- Wyszukiwanie trackerów (search bar w header)
- Widok kafelków vs. lista (toggle view)
- Customizacja liczby dni dla sparkline (user preference)
- Eksport danych bezpośrednio z dashboardu
