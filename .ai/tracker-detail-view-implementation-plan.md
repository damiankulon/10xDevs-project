# Plan implementacji widoku szczegółów trackera

## 1. Przegląd

Widok szczegółów trackera stanowi kluczowy element aplikacji Kipio, pozwalający użytkownikom na szczegółową analizę zgromadzonych danych, zarządzanie wpisami oraz szybkie dodawanie nowych pomiarów. Widok ten adresuje User Story US-009 (Widok szczegółowy i historia) oraz US-006 (Szybkie dodawanie danych), oferując pełną funkcjonalność wizualizacji, edycji i zarządzania danymi trackera.

Widok prezentuje:

- Szczegółowe informacje o trackerze (nazwa, typ, konfigurację)
- Zaawansowane wizualizacje (wykresy liniowe dla danych liczbowych, heatmapy dla danych boolowskich, listę dla tekstu)
- Statystyki zagregowane (średnia, minimum, maksimum, odchylenie standardowe)
- Paginowaną listę wpisów z możliwością inline editing i usuwania
- Formularz dodawania nowych wpisów (Bottom Sheet lub Floating Action Button)

## 2. Routing widoku

**Ścieżka**: `/app/trackers/:trackerId`

Routing obsługiwany przez React Router w ramach aplikacji SPA. Parametr `:trackerId` to UUID trackera pobierany z URL.

**Zabezpieczenia**:

- Widok dostępny tylko dla zalogowanych użytkowników
- Walidacja dostępu do trackera na poziomie API (właściciel lub użytkownik z uprawnieniami read/write)
- Przekierowanie do `/app` jeśli tracker nie istnieje lub użytkownik nie ma dostępu (błąd 403/404)

## 3. Struktura komponentów

```
TrackerDetailPage (strona główna)
├── TrackerDetailHeader
│   ├── BackButton
│   ├── TrackerTitle
│   ├── TrackerMetaBadges (typ danych, jednostka, badge "Shared")
│   └── TrackerActions
│       ├── EditTrackerButton (tylko właściciel)
│       └── ShareTrackerButton (tylko właściciel)
│
├── TimeRangeSelector (7d, 30d, 90d, 1y, all)
│
├── TrackerVisualizationSection
│   ├── StatsCards (dla number/scale: avg, min, max, std_dev, total entries)
│   ├── ChartContainer (warunkowo zależnie od data_type)
│   │   ├── LineChart (number/scale - Recharts)
│   │   ├── CalendarHeatmap (boolean - custom component)
│   │   └── TextEntriesCloud (text - word frequency visualization)
│   └── EmptyChartState (gdy brak danych)
│
├── EntriesSection
│   ├── EntriesSectionHeader
│   │   ├── SectionTitle ("Wpisy historyczne")
│   │   ├── EntriesCount
│   │   └── SortToggle (asc/desc by recorded_at)
│   ├── EntriesList (infinite scroll)
│   │   ├── EntryItem (wielokrotnie)
│   │   │   ├── EntryValue (display zależnie od data_type)
│   │   │   ├── EntryTimestamp (relative + absolute)
│   │   │   └── EntryActions
│   │   │       ├── EditEntryButton
│   │   │       └── DeleteEntryButton
│   │   ├── LoadMoreTrigger (intersection observer)
│   │   └── LoadingSpinner
│   ├── EmptyEntriesState
│   └── EntriesListSkeleton (loading state)
│
├── AddEntryFAB (Floating Action Button)
└── AddEntryBottomSheet (modal)
    ├── BottomSheetHeader
    │   ├── Title ("Dodaj wpis")
    │   └── CloseButton
    ├── AddEntryForm
    │   ├── ValueInput (dynamiczny zależnie od data_type)
    │   │   ├── NumberInput (z jednostką)
    │   │   ├── ScaleSlider (z min/max z config)
    │   │   ├── BooleanToggle (Yes/No)
    │   │   └── TextInput (textarea)
    │   ├── DateTimePicker (domyślnie "teraz")
    │   └── FormActions
    │       ├── SaveButton
    │       └── CancelButton
    └── FormErrorBanner (422 validation errors)

Dodatkowe modale/dialogi:
├── EditEntryModal (inline editing)
│   ├── EditEntryForm (similar to AddEntryForm)
│   └── FormActions (Save/Cancel)
│
└── DeleteConfirmationDialog
    ├── WarningMessage
    └── DialogActions (Confirm/Cancel)
```

## 4. Szczegóły komponentów

### 4.1. TrackerDetailPage

**Opis**: Główny kontener strony odpowiedzialny za orchestrację wszystkich podkomponentów, zarządzanie stanem globalnym widoku oraz obsługę pobierania danych.

**Główne elementy**:

- Container div z responsive padding
- Grid layout dla desktop (sidebar + main content) lub stack dla mobile
- Error boundary dla obsługi błędów krytycznych
- Loading skeleton podczas pierwszego ładowania

**Obsługiwane zdarzenia**:

- `onMount`: Inicjalizacja - pobranie szczegółów trackera i pierwszej strony wpisów
- `onTimeRangeChange`: Zmiana zakresu czasu dla statystyk
- `onEntryAdded`: Odświeżenie statystyk i listy po dodaniu wpisu
- `onEntryUpdated`: Aktualizacja wpisu na liście
- `onEntryDeleted`: Usunięcie wpisu z listy i aktualizacja statystyk

**Warunki walidacji**:

- Tracker musi istnieć (404 handling)
- Użytkownik musi mieć dostęp read lub write (403 handling)
- trackerId w URL musi być poprawnym UUID

**Typy**:

- `TrackerDetailResponseDto` (szczegóły trackera)
- `TrackerStatsResponseDto` (statystyki)
- `EntryListResponseDto` (lista wpisów)
- `TrackerDetailPageState` (lokalny stan widoku - TimeRange, pagination, modals)

**Propsy**: Brak (strona top-level, parametry z URL via useParams)

---

### 4.2. TrackerDetailHeader

**Opis**: Nagłówek strony prezentujący podstawowe informacje o trackerze oraz akcje dostępne dla użytkownika (właściciela).

**Główne elementy**:

- Przycisk powrotu (back arrow icon)
- Tytuł trackera (h1) z kolorem trackera jako accent
- Badge z typem danych (pill badge)
- Badge z jednostką (jeśli number type)
- Badge "Shared" (jeśli is_owner = false)
- Dropdown menu z akcjami (Edit, Share, Delete - tylko dla właściciela)

**Obsługiwane zdarzenia**:

- `onBackClick`: Nawigacja do `/app` (Dashboard)
- `onEditClick`: Otwarcie modala edycji trackera
- `onShareClick`: Otwarcie modala zarządzania udostępnieniami
- `onDeleteClick`: Otwarcie dialogu potwierdzenia usunięcia

**Warunki walidacji**:

- Akcje Edit/Share/Delete widoczne tylko gdy `is_owner === true`
- Badge "Shared" widoczny gdy `is_owner === false`

**Typy**:

- `TrackerDetailHeaderProps`:
  ```typescript
  interface TrackerDetailHeaderProps {
    tracker: TrackerDetailResponseDto;
    onBack: () => void;
    onEdit?: () => void; // Optional - tylko dla właściciela
    onShare?: () => void; // Optional - tylko dla właściciela
    onDelete?: () => void; // Optional - tylko dla właściciela
  }
  ```

**Propsy**:

- `tracker`: TrackerDetailResponseDto
- `onBack`: () => void
- `onEdit`: () => void (opcjonalnie)
- `onShare`: () => void (opcjonalnie)
- `onDelete`: () => void (opcjonalnie)

---

### 4.3. TimeRangeSelector

**Opis**: Przełącznik zakresu czasu dla statystyk i wykresu. Pozwala użytkownikowi wybrać okres analizy (7 dni, 30 dni, 90 dni, 1 rok, wszystko).

**Główne elementy**:

- Button group (segmented control) z opcjami: 7d, 30d, 90d, 1y, All
- Aktywny przycisk wyróżniony kolorem accent
- Responsive: horizontal scroll na mobile, full width na desktop

**Obsługiwane zdarzenia**:

- `onRangeChange`: Zmiana wybranego zakresu czasu

**Warunki walidacji**:

- Wartość musi być jednym z: '7d' | '30d' | '90d' | '1y' | 'all'

**Typy**:

- `TimeRangeSelectorProps`:
  ```typescript
  interface TimeRangeSelectorProps {
    value: StatsPeriod;
    onChange: (period: StatsPeriod) => void;
  }
  ```

**Propsy**:

- `value`: StatsPeriod (current selected range)
- `onChange`: (period: StatsPeriod) => void

---

### 4.4. TrackerVisualizationSection

**Opis**: Sekcja zawierająca wizualizację danych trackera. Renderuje różne typy wykresów zależnie od typu danych oraz karty ze statystykami zagregowanymi.

**Główne elementy**:

- Grid z kartami statystyk (Avg, Min, Max, StdDev, Total Entries) - tylko dla number/scale
- ResponsiveContainer dla wykresu (Recharts)
- Warunkowo renderowany wykres:
  - LineChart (dla number i scale)
  - CalendarHeatmap (dla boolean)
  - TextEntriesCloud/TextEntriesList (dla text)
- EmptyChartState jeśli brak danych w wybranym okresie
- Skeleton loader podczas ładowania

**Obsługiwane zdarzenia**:

- `onChartPointClick`: Możliwość kliknięcia punktu na wykresie (future enhancement)
- `onHeatmapDayClick`: Możliwość kliknięcia dnia na heatmapie (future enhancement)

**Warunki walidacji**:

- Statystyki liczbowe wyświetlane tylko dla data_type: 'number' lub 'scale'
- Typ wykresu musi odpowiadać data_type trackera
- Brak wykresu przy pustym zbiorze danych (EmptyChartState)

**Typy**:

- `TrackerVisualizationSectionProps`:
  ```typescript
  interface TrackerVisualizationSectionProps {
    tracker: TrackerDetailResponseDto;
    stats: TrackerStatsResponseDto | null;
    isLoading: boolean;
  }
  ```

**Propsy**:

- `tracker`: TrackerDetailResponseDto
- `stats`: TrackerStatsResponseDto | null
- `isLoading`: boolean

---

### 4.5. StatsCards

**Opis**: Komponent prezentujący karty z zagregowanymi statystykami liczbowymi (średnia, min, max, mediana, odchylenie standardowe, liczba wpisów).

**Główne elementy**:

- Grid 2x3 (mobile) lub 3x2 (desktop) z kartami
- Każda karta zawiera: ikonę, label, wartość z jednostką
- Skeleton loader dla każdej karty podczas ładowania

**Obsługiwane zdarzenia**: Brak (komponent prezentacyjny)

**Warunki walidacji**:

- Wyświetlany tylko dla data_type: 'number' lub 'scale'
- Wartości formatowane z odpowiednią precyzją (2 miejsca po przecinku)
- Jednostka wyświetlana z wartością (jeśli tracker.unit nie null)

**Typy**:

- `StatsCardsProps`:

  ```typescript
  interface StatsCardsProps {
    stats: NumericStatsDto | null;
    unit: string | null;
    isLoading: boolean;
  }

  interface StatCardData {
    icon: React.ReactNode;
    label: string;
    value: string;
  }
  ```

**Propsy**:

- `stats`: NumericStatsDto | null
- `unit`: string | null
- `isLoading`: boolean

---

### 4.6. LineChart

**Opis**: Wykres liniowy dla trackerów typu number i scale, zbudowany przy użyciu biblioteki Recharts.

**Główne elementy**:

- ResponsiveContainer (zapewnia responsywność)
- LineChart z danymi z chart_data
- XAxis z labelami dat
- YAxis z wartościami i jednostką
- Tooltip z formatowaniem wartości
- Line z kolorem zgodnym z tracker.color

**Obsługiwane zdarzenia**:

- `onPointHover`: Wyświetlenie tooltipa z wartością i datą

**Warunki walidacji**:

- Renderowany tylko dla data_type: 'number' lub 'scale'
- Minimalna liczba punktów do wyświetlenia: 1
- YAxis domain dostosowany do min/max z config (dla scale)

**Typy**:

- `LineChartProps`:
  ```typescript
  interface LineChartProps {
    data: ChartDataDto;
    color: string | null;
    unit: string | null;
    config: TrackerConfig | null;
  }
  ```

**Propsy**:

- `data`: ChartDataDto (labels + values arrays)
- `color`: string | null (kolor linii)
- `unit`: string | null (jednostka dla tooltipa i YAxis)
- `config`: TrackerConfig | null (min/max dla scale)

---

### 4.7. CalendarHeatmap

**Opis**: Heatmapa kalendarzowa dla trackerów typu boolean, wizualizująca dni jako kafelki z kolorami zależnymi od wartości (zielony = true, czerwony = false, szary = brak danych).

**Główne elementy**:

- Grid dni z ostatnich X tygodni (zależnie od time range)
- Każdy kafelek reprezentuje jeden dzień
- Legenda (true/false/no data)
- Tooltip z datą i wartością przy hover

**Obsługiwane zdarzenia**:

- `onDayHover`: Wyświetlenie tooltipa
- `onDayClick`: (future) Otwarcie listy wpisów z danego dnia

**Warunki walidacji**:

- Renderowany tylko dla data_type: 'boolean'
- Obsługa dni bez danych (szary kolor)

**Typy**:

- `CalendarHeatmapProps`:

  ```typescript
  interface CalendarHeatmapProps {
    data: HeatmapDataPointDto[];
    period: StatsPeriod;
  }

  interface HeatmapDay {
    date: string;
    value: boolean | null;
    count: number;
  }
  ```

**Propsy**:

- `data`: HeatmapDataPointDto[]
- `period`: StatsPeriod

---

### 4.8. EntriesSection

**Opis**: Sekcja zawierająca listę historycznych wpisów z możliwością sortowania, infinite scroll, inline editing i usuwania.

**Główne elementy**:

- Nagłówek sekcji z tytułem "Wpisy historyczne" i licznikiem
- Toggle sortowania (ASC/DESC by recorded_at)
- Lista wpisów (EntryItem wielokrotnie)
- Intersection Observer trigger dla infinite scroll
- Loading spinner przy ładowaniu kolejnych stron
- EmptyEntriesState jeśli brak wpisów

**Obsługiwane zdarzenia**:

- `onSortChange`: Zmiana kierunku sortowania
- `onLoadMore`: Załadowanie kolejnej strony wpisów (infinite scroll)
- `onEntryEdit`: Otwarcie modala edycji wpisu
- `onEntryDelete`: Otwarcie dialogu potwierdzenia usunięcia

**Warunki walidacji**:

- Infinite scroll aktywny tylko jeśli są kolejne strony (pagination.page < pagination.total_pages)
- Akcje Edit/Delete widoczne tylko jeśli użytkownik jest autorem wpisu (entry.user_id === currentUserId) lub właścicielem trackera

**Typy**:

- `EntriesSectionProps`:
  ```typescript
  interface EntriesSectionProps {
    entries: EntryResponseDto[];
    pagination: PaginationDto;
    sortOrder: SortOrder;
    isLoading: boolean;
    canEdit: boolean; // czy użytkownik ma uprawnienia do edycji
    onSortChange: (order: SortOrder) => void;
    onLoadMore: () => void;
    onEntryEdit: (entry: EntryResponseDto) => void;
    onEntryDelete: (entryId: string) => void;
  }
  ```

**Propsy**:

- `entries`: EntryResponseDto[]
- `pagination`: PaginationDto
- `sortOrder`: SortOrder
- `isLoading`: boolean
- `canEdit`: boolean
- `onSortChange`: (order: SortOrder) => void
- `onLoadMore`: () => void
- `onEntryEdit`: (entry: EntryResponseDto) => void
- `onEntryDelete`: (entryId: string) => void

---

### 4.9. EntryItem

**Opis**: Pojedynczy element listy wpisów, prezentujący wartość, timestamp oraz akcje (edit/delete).

**Główne elementy**:

- Container (list item)
- EntryValue (formatowana wartość zależnie od data_type)
- EntryTimestamp (relative time + absolute w tooltipie)
- EntryActions dropdown (edit/delete buttons)

**Obsługiwane zdarzenia**:

- `onEdit`: Kliknięcie przycisku edycji
- `onDelete`: Kliknięcie przycisku usunięcia

**Warunki walidacji**:

- Akcje widoczne tylko jeśli canEdit === true
- Wartość formatowana zależnie od data_type:
  - number/scale: formatowanie liczby z jednostką
  - boolean: "Yes" / "No" lub ikony ✓/✗
  - text: pełny tekst lub truncated jeśli > 100 znaków

**Typy**:

- `EntryItemProps`:
  ```typescript
  interface EntryItemProps {
    entry: EntryResponseDto;
    dataType: DataType;
    unit: string | null;
    canEdit: boolean;
    onEdit: (entry: EntryResponseDto) => void;
    onDelete: (entryId: string) => void;
  }
  ```

**Propsy**:

- `entry`: EntryResponseDto
- `dataType`: DataType (z trackera)
- `unit`: string | null (z trackera)
- `canEdit`: boolean
- `onEdit`: (entry: EntryResponseDto) => void
- `onDelete`: (entryId: string) => void

---

### 4.10. AddEntryBottomSheet

**Opis**: Bottom Sheet / Modal do szybkiego dodawania nowego wpisu. Optymalizowany pod mobile z autofocus na polu wartości.

**Główne elementy**:

- BottomSheet container (animacja slide-up z dołu)
- Header z tytułem i przyciskiem zamknięcia
- Formularz z dynamicznym polem wartości
- DateTimePicker (domyślnie "now")
- Przyciski Save/Cancel

**Obsługiwane zdarzenia**:

- `onSubmit`: Wysłanie formularza (POST /api/trackers/:trackerId/entries)
- `onClose`: Zamknięcie bottom sheeta
- `onSwipeDown`: Zamknięcie przez swipe gesture

**Warunki walidacji**:

- Wartość wymagana (nie może być pusta)
- Wartość musi odpowiadać typowi danych trackera:
  - number: musi być liczbą, dla scale musi być w zakresie config.min - config.max
  - boolean: musi być true/false
  - text: string, max 1000 znaków (walidacja API)
- recorded_at musi być poprawną datą ISO8601, nie może być w przyszłości
- Wyłączony przycisk Save podczas submitting

**Typy**:

- `AddEntryBottomSheetProps`:

  ```typescript
  interface AddEntryBottomSheetProps {
    isOpen: boolean;
    tracker: TrackerDetailResponseDto;
    onClose: () => void;
    onSuccess: (entry: EntryResponseDto) => void;
  }

  interface AddEntryFormData {
    value: number | boolean | string;
    recorded_at: string; // ISO8601
  }
  ```

**Propsy**:

- `isOpen`: boolean
- `tracker`: TrackerDetailResponseDto
- `onClose`: () => void
- `onSuccess`: (entry: EntryResponseDto) => void

---

### 4.11. ValueInput (dynamiczny)

**Opis**: Komponent renderujący odpowiedni input zależnie od typu danych trackera. Abstrahuje logikę wyboru typu inputu.

**Główne elementy** (warunkowe renderowanie):

**Dla data_type: 'number'**:

- NumberInput (input type="number")
- Label z jednostką (jeśli unit nie null)
- Step="any" dla akceptowania wartości dziesiętnych

**Dla data_type: 'scale'**:

- Slider (range input)
- Wyświetlanie aktualnej wartości
- Min/Max z tracker.config
- Tick marks co 1 jednostkę

**Dla data_type: 'boolean'**:

- Toggle switch lub Radio buttons (Yes/No)
- Duże targety dla łatwego klikania na mobile

**Dla data_type: 'text'**:

- Textarea
- Character counter (max 1000 znaków)
- Auto-resize

**Obsługiwane zdarzenia**:

- `onChange`: Zmiana wartości
- `onBlur`: Walidacja po utracie focusu

**Warunki walidacji**:

- number: musi być poprawną liczbą
- scale: musi być w zakresie config.min - config.max
- boolean: musi być true lub false
- text: max 1000 znaków

**Typy**:

- `ValueInputProps`:
  ```typescript
  interface ValueInputProps {
    dataType: DataType;
    value: number | boolean | string;
    onChange: (value: number | boolean | string) => void;
    unit?: string | null;
    config?: TrackerConfig | null;
    error?: string;
    autoFocus?: boolean;
  }
  ```

**Propsy**:

- `dataType`: DataType
- `value`: number | boolean | string
- `onChange`: (value: number | boolean | string) => void
- `unit`: string | null (opcjonalnie)
- `config`: TrackerConfig | null (opcjonalnie, dla scale)
- `error`: string (opcjonalnie, komunikat błędu)
- `autoFocus`: boolean (opcjonalnie, domyślnie true)

---

### 4.12. EditEntryModal

**Opis**: Modal do edycji istniejącego wpisu. Podobny do AddEntryBottomSheet, ale pre-populated z aktualnymi wartościami.

**Główne elementy**:

- Modal overlay
- Modal container
- Header z tytułem "Edytuj wpis"
- Formularz z ValueInput (pre-filled)
- DateTimePicker (pre-filled)
- Przyciski Save/Cancel

**Obsługiwane zdarzenia**:

- `onSubmit`: Aktualizacja wpisu (PATCH /api/trackers/:trackerId/entries/:entryId)
- `onClose`: Zamknięcie modala

**Warunki walidacji**:

- Te same warunki co AddEntryBottomSheet
- Dodatkowo: tylko autor wpisu (entry.user_id === currentUserId) lub właściciel trackera może edytować

**Typy**:

- `EditEntryModalProps`:

  ```typescript
  interface EditEntryModalProps {
    isOpen: boolean;
    entry: EntryResponseDto;
    tracker: TrackerDetailResponseDto;
    onClose: () => void;
    onSuccess: (updatedEntry: EntryResponseDto) => void;
  }

  interface UpdateEntryFormData {
    value?: number | boolean | string;
    recorded_at?: string;
  }
  ```

**Propsy**:

- `isOpen`: boolean
- `entry`: EntryResponseDto
- `tracker`: TrackerDetailResponseDto
- `onClose`: () => void
- `onSuccess`: (updatedEntry: EntryResponseDto) => void

---

### 4.13. DeleteConfirmationDialog

**Opis**: Dialog potwierdzenia usunięcia wpisu. Zapobiega przypadkowemu usunięciu danych.

**Główne elementy**:

- Dialog overlay (backdrop)
- Dialog container
- Ikona ostrzeżenia
- Tytuł "Usuń wpis?"
- Komunikat "Ta operacja jest nieodwracalna"
- Przyciski Confirm (czerwony) / Cancel

**Obsługiwane zdarzenia**:

- `onConfirm`: Potwierdzenie usunięcia (DELETE /api/trackers/:trackerId/entries/:entryId)
- `onCancel`: Anulowanie i zamknięcie dialogu

**Warunki walidacji**:

- Wyświetlany tylko po kliknięciu Delete w EntryItem
- Przycisk Confirm wyłączony podczas wykonywania DELETE request

**Typy**:

- `DeleteConfirmationDialogProps`:
  ```typescript
  interface DeleteConfirmationDialogProps {
    isOpen: boolean;
    entryId: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting: boolean;
  }
  ```

**Propsy**:

- `isOpen`: boolean
- `entryId`: string
- `onConfirm`: () => void
- `onCancel`: () => void
- `isDeleting`: boolean

---

### 4.14. AddEntryFAB (Floating Action Button)

**Opis**: Przycisk pływający w prawym dolnym rogu ekranu, otwierający AddEntryBottomSheet.

**Główne elementy**:

- Circular button z ikoną "+"
- Fixed position (bottom-right)
- Pulsująca animacja dla zwrócenia uwagi (opcjonalnie)
- Tooltip "Dodaj wpis"

**Obsługiwane zdarzenia**:

- `onClick`: Otwarcie AddEntryBottomSheet

**Warunki walidacji**:

- Widoczny tylko jeśli użytkownik ma uprawnienia write (is_owner === true || shared_permission === 'write')
- Ukryty podczas scrollowania w dół (opcjonalne enhancement)

**Typy**:

- `AddEntryFABProps`:
  ```typescript
  interface AddEntryFABProps {
    onClick: () => void;
    disabled?: boolean;
  }
  ```

**Propsy**:

- `onClick`: () => void
- `disabled`: boolean (opcjonalnie)

---

## 5. Typy

### 5.1. DTO z API (z @shared/types)

Wykorzystywane typy z shared package:

```typescript
// Tracker types
import {
  TrackerDetailResponseDto,
  TrackerStatsResponseDto,
  StatsPeriod,
  DataType,
  TrackerConfig,
  ScaleConfig,
  NumericStatsDto,
  ChartDataDto,
  HeatmapDataPointDto,
} from '@shared/types';

// Entry types
import {
  EntryResponseDto,
  EntryListResponseDto,
  CreateEntryCommand,
  UpdateEntryCommand,
  EntryQueryDto,
  PaginationDto,
  SortOrder,
} from '@shared/types';

// Error types
import { ErrorResponseDto, ValidationErrorDetailDto } from '@shared/types';
```

### 5.2. ViewModel types (specyficzne dla widoku)

```typescript
/**
 * Lokalny stan widoku TrackerDetailPage
 */
interface TrackerDetailPageState {
  // Dane z API
  tracker: TrackerDetailResponseDto | null;
  stats: TrackerStatsResponseDto | null;
  entries: EntryResponseDto[];
  pagination: PaginationDto | null;

  // UI state
  selectedTimeRange: StatsPeriod;
  sortOrder: SortOrder;
  isLoadingTracker: boolean;
  isLoadingStats: boolean;
  isLoadingEntries: boolean;
  isLoadingMore: boolean;

  // Modal states
  isAddEntryOpen: boolean;
  editingEntry: EntryResponseDto | null;
  deletingEntryId: string | null;

  // Error states
  trackerError: ErrorResponseDto | null;
  statsError: ErrorResponseDto | null;
  entriesError: ErrorResponseDto | null;
}

/**
 * Dane do wyświetlenia jednej karty statystyki
 */
interface StatCardData {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}

/**
 * Dzień na heatmapie (processed z HeatmapDataPointDto)
 */
interface HeatmapDay {
  date: string; // YYYY-MM-DD
  value: boolean | null;
  count: number;
  displayDate: string; // Formatowana data dla tooltipa
}

/**
 * Punkt danych dla LineChart (processed z ChartDataDto)
 */
interface ChartDataPoint {
  date: string; // Label
  value: number;
  formattedDate: string; // Dla tooltipa
  formattedValue: string; // Z jednostką
}

/**
 * Formatowana wartość wpisu dla wyświetlenia
 */
interface FormattedEntryValue {
  display: string; // Wartość do wyświetlenia
  raw: number | boolean | string; // Oryginalna wartość
  icon?: React.ReactNode; // Opcjonalna ikona (np. dla boolean)
}

/**
 * Dane formularza dodawania wpisu (React Hook Form)
 */
interface AddEntryFormData {
  value: number | boolean | string;
  recorded_at: string; // ISO8601
}

/**
 * Dane formularza edycji wpisu (React Hook Form)
 */
interface UpdateEntryFormData {
  value?: number | boolean | string;
  recorded_at?: string; // ISO8601
}

/**
 * Opcje zakresu czasu dla TimeRangeSelector
 */
interface TimeRangeOption {
  value: StatsPeriod;
  label: string;
  description: string; // Dla tooltipa
}

/**
 * Konfiguracja uprawniena użytkownika do akcji
 */
interface UserPermissions {
  canEdit: boolean; // Czy może edytować tracker
  canDelete: boolean; // Czy może usunąć tracker
  canShare: boolean; // Czy może udostępniać tracker
  canAddEntries: boolean; // Czy może dodawać wpisy
  canEditEntries: boolean; // Czy może edytować wpisy (własne lub wszystkie)
  canDeleteEntries: boolean; // Czy może usuwać wpisy
}
```

### 5.3. Zod schemas (walidacja formularzy)

```typescript
import { z } from 'zod';

/**
 * Schema walidacji dla formularza dodawania wpisu
 */
const addEntryNumberSchema = z.object({
  value: z.number({
    required_error: 'Wartość jest wymagana',
    invalid_type_error: 'Wartość musi być liczbą',
  }),
  recorded_at: z
    .string()
    .datetime()
    .refine(
      (date) => new Date(date) <= new Date(),
      'Data nie może być w przyszłości'
    ),
});

const addEntryScaleSchema = z.object({
  value: z
    .number({
      required_error: 'Wartość jest wymagana',
      invalid_type_error: 'Wartość musi być liczbą',
    })
    .refine(
      (val, ctx) => {
        const config = ctx.parent.config as ScaleConfig;
        return val >= config.min && val <= config.max;
      },
      (ctx) => {
        const config = ctx.parent.config as ScaleConfig;
        return {
          message: `Wartość musi być w zakresie ${config.min} - ${config.max}`,
        };
      }
    ),
  recorded_at: z
    .string()
    .datetime()
    .refine(
      (date) => new Date(date) <= new Date(),
      'Data nie może być w przyszłości'
    ),
});

const addEntryBooleanSchema = z.object({
  value: z.boolean({
    required_error: 'Wartość jest wymagana',
  }),
  recorded_at: z
    .string()
    .datetime()
    .refine(
      (date) => new Date(date) <= new Date(),
      'Data nie może być w przyszłości'
    ),
});

const addEntryTextSchema = z.object({
  value: z
    .string({
      required_error: 'Wartość jest wymagana',
    })
    .max(1000, 'Tekst nie może być dłuższy niż 1000 znaków'),
  recorded_at: z
    .string()
    .datetime()
    .refine(
      (date) => new Date(date) <= new Date(),
      'Data nie może być w przyszłości'
    ),
});

/**
 * Factory function zwracająca odpowiedni schema zależnie od data_type
 */
function getAddEntrySchema(dataType: DataType, config?: TrackerConfig) {
  switch (dataType) {
    case 'number':
      return addEntryNumberSchema;
    case 'scale':
      return addEntryScaleSchema.extend({
        config: z.custom<ScaleConfig>(),
      });
    case 'boolean':
      return addEntryBooleanSchema;
    case 'text':
      return addEntryTextSchema;
    default:
      throw new Error(`Unsupported data type: ${dataType}`);
  }
}
```

## 6. Zarządzanie stanem

### 6.1. Stan serwerowy (TanStack Query)

Wykorzystanie TanStack Query (React Query) do zarządzania stanem serwerowym z automatycznym cache'owaniem, refetch i synchronizacją.

**Query keys convention**:

```typescript
const queryKeys = {
  trackerDetail: (trackerId: string) => ['trackers', trackerId] as const,
  trackerStats: (trackerId: string, period: StatsPeriod) =>
    ['trackers', trackerId, 'stats', period] as const,
  trackerEntries: (trackerId: string, query: EntryQueryDto) =>
    ['trackers', trackerId, 'entries', query] as const,
};
```

**Główne queries**:

```typescript
// 1. useTrackerDetail - pobiera szczegóły trackera
const useTrackerDetail = (trackerId: string) => {
  return useQuery({
    queryKey: queryKeys.trackerDetail(trackerId),
    queryFn: () => apiClient.get(`/api/trackers/${trackerId}`),
    staleTime: 5 * 60 * 1000, // 5 minut
    retry: 1,
  });
};

// 2. useTrackerStats - pobiera statystyki dla wybranego okresu
const useTrackerStats = (trackerId: string, period: StatsPeriod) => {
  return useQuery({
    queryKey: queryKeys.trackerStats(trackerId, period),
    queryFn: () =>
      apiClient.get(`/api/trackers/${trackerId}/stats`, {
        params: { period },
      }),
    staleTime: 2 * 60 * 1000, // 2 minuty
    enabled: !!trackerId,
  });
};

// 3. useTrackerEntries - pobiera listę wpisów z paginacją
const useTrackerEntries = (trackerId: string, query: EntryQueryDto) => {
  return useInfiniteQuery({
    queryKey: queryKeys.trackerEntries(trackerId, query),
    queryFn: ({ pageParam = 1 }) =>
      apiClient.get(`/api/trackers/${trackerId}/entries`, {
        params: { ...query, page: pageParam },
      }),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      return pagination.page < pagination.total_pages
        ? pagination.page + 1
        : undefined;
    },
    staleTime: 1 * 60 * 1000, // 1 minuta
  });
};
```

**Główne mutations**:

```typescript
// 1. useCreateEntry - dodaje nowy wpis
const useCreateEntry = (trackerId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEntryCommand) =>
      apiClient.post(`/api/trackers/${trackerId}/entries`, data),
    onSuccess: () => {
      // Invalidate i refetch związanych queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.trackerStats(trackerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.trackerEntries(trackerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.trackerDetail(trackerId),
      });
    },
  });
};

// 2. useUpdateEntry - aktualizuje istniejący wpis
const useUpdateEntry = (trackerId: string, entryId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateEntryCommand) =>
      apiClient.patch(`/api/trackers/${trackerId}/entries/${entryId}`, data),
    onMutate: async (updatedEntry) => {
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: queryKeys.trackerEntries(trackerId),
      });

      const previousEntries = queryClient.getQueryData(
        queryKeys.trackerEntries(trackerId)
      );

      // Aktualizacja cache
      queryClient.setQueryData(
        queryKeys.trackerEntries(trackerId),
        (old: any) => {
          // Update entry in pages
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.map((entry: EntryResponseDto) =>
                entry.id === entryId ? { ...entry, ...updatedEntry } : entry
              ),
            })),
          };
        }
      );

      return { previousEntries };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update
      if (context?.previousEntries) {
        queryClient.setQueryData(
          queryKeys.trackerEntries(trackerId),
          context.previousEntries
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.trackerEntries(trackerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.trackerStats(trackerId),
      });
    },
  });
};

// 3. useDeleteEntry - usuwa wpis
const useDeleteEntry = (trackerId: string, entryId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClient.delete(`/api/trackers/${trackerId}/entries/${entryId}`),
    onMutate: async () => {
      // Optimistic update - usunięcie z cache
      await queryClient.cancelQueries({
        queryKey: queryKeys.trackerEntries(trackerId),
      });

      const previousEntries = queryClient.getQueryData(
        queryKeys.trackerEntries(trackerId)
      );

      queryClient.setQueryData(
        queryKeys.trackerEntries(trackerId),
        (old: any) => ({
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.filter(
              (entry: EntryResponseDto) => entry.id !== entryId
            ),
          })),
        })
      );

      return { previousEntries };
    },
    onError: (err, variables, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(
          queryKeys.trackerEntries(trackerId),
          context.previousEntries
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.trackerEntries(trackerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.trackerStats(trackerId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.trackerDetail(trackerId),
      });
    },
  });
};
```

### 6.2. Stan UI (React useState/Context)

Lokalny stan UI zarządzany przez useState w głównym komponencie TrackerDetailPage:

```typescript
// W TrackerDetailPage
const [selectedTimeRange, setSelectedTimeRange] = useState<StatsPeriod>('30d');
const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
const [editingEntry, setEditingEntry] = useState<EntryResponseDto | null>(null);
const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
```

Przekazywanie przez props drilling (brak potrzeby Context API dla tego widoku).

### 6.3. Custom Hooks

**useTrackerDetailViewModel** - główny hook agregujący logikę widoku:

```typescript
interface UseTrackerDetailViewModelParams {
  trackerId: string;
}

interface UseTrackerDetailViewModelReturn {
  // Dane
  tracker: TrackerDetailResponseDto | null;
  stats: TrackerStatsResponseDto | null;
  entries: EntryResponseDto[];
  pagination: PaginationDto | null;

  // Loading states
  isLoadingTracker: boolean;
  isLoadingStats: boolean;
  isLoadingEntries: boolean;
  isLoadingMore: boolean;

  // Error states
  trackerError: ErrorResponseDto | null;
  statsError: ErrorResponseDto | null;
  entriesError: ErrorResponseDto | null;

  // UI state
  selectedTimeRange: StatsPeriod;
  sortOrder: SortOrder;
  isAddEntryOpen: boolean;
  editingEntry: EntryResponseDto | null;
  deletingEntryId: string | null;

  // Permissions
  permissions: UserPermissions;

  // Actions
  setSelectedTimeRange: (period: StatsPeriod) => void;
  setSortOrder: (order: SortOrder) => void;
  loadMoreEntries: () => void;
  openAddEntry: () => void;
  closeAddEntry: () => void;
  openEditEntry: (entry: EntryResponseDto) => void;
  closeEditEntry: () => void;
  openDeleteConfirmation: (entryId: string) => void;
  closeDeleteConfirmation: () => void;
  handleCreateEntry: (data: CreateEntryCommand) => Promise<void>;
  handleUpdateEntry: (
    entryId: string,
    data: UpdateEntryCommand
  ) => Promise<void>;
  handleDeleteEntry: (entryId: string) => Promise<void>;
}

const useTrackerDetailViewModel = ({
  trackerId,
}: UseTrackerDetailViewModelParams): UseTrackerDetailViewModelReturn => {
  const { data: currentUser } = useCurrentUser();

  // UI state
  const [selectedTimeRange, setSelectedTimeRange] =
    useState<StatsPeriod>('30d');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EntryResponseDto | null>(
    null
  );
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);

  // Queries
  const {
    data: tracker,
    isLoading: isLoadingTracker,
    error: trackerError,
  } = useTrackerDetail(trackerId);

  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useTrackerStats(trackerId, selectedTimeRange);

  const {
    data: entriesData,
    isLoading: isLoadingEntries,
    error: entriesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTrackerEntries(trackerId, { sort_order: sortOrder, limit: 20 });

  // Mutations
  const createEntryMutation = useCreateEntry(trackerId);
  const updateEntryMutation = useUpdateEntry(trackerId, editingEntry?.id ?? '');
  const deleteEntryMutation = useDeleteEntry(trackerId, deletingEntryId ?? '');

  // Flatten infinite query data
  const entries = useMemo(() => {
    return entriesData?.pages.flatMap((page) => page.data) ?? [];
  }, [entriesData]);

  const pagination = useMemo(() => {
    return entriesData?.pages[entriesData.pages.length - 1]?.pagination ?? null;
  }, [entriesData]);

  // Calculate permissions
  const permissions = useMemo<UserPermissions>(() => {
    if (!tracker || !currentUser) {
      return {
        canEdit: false,
        canDelete: false,
        canShare: false,
        canAddEntries: false,
        canEditEntries: false,
        canDeleteEntries: false,
      };
    }

    const isOwner = tracker.is_owner;
    const hasWritePermission = tracker.shared_permission === 'write';

    return {
      canEdit: isOwner,
      canDelete: isOwner,
      canShare: isOwner,
      canAddEntries: isOwner || hasWritePermission,
      canEditEntries: isOwner || hasWritePermission,
      canDeleteEntries: isOwner || hasWritePermission,
    };
  }, [tracker, currentUser]);

  // Action handlers
  const loadMoreEntries = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCreateEntry = useCallback(
    async (data: CreateEntryCommand) => {
      await createEntryMutation.mutateAsync(data);
      setIsAddEntryOpen(false);
    },
    [createEntryMutation]
  );

  const handleUpdateEntry = useCallback(
    async (entryId: string, data: UpdateEntryCommand) => {
      await updateEntryMutation.mutateAsync(data);
      setEditingEntry(null);
    },
    [updateEntryMutation]
  );

  const handleDeleteEntry = useCallback(
    async (entryId: string) => {
      await deleteEntryMutation.mutateAsync();
      setDeletingEntryId(null);
    },
    [deleteEntryMutation]
  );

  return {
    // Dane
    tracker,
    stats,
    entries,
    pagination,

    // Loading states
    isLoadingTracker,
    isLoadingStats,
    isLoadingEntries,
    isLoadingMore: isFetchingNextPage,

    // Error states
    trackerError: trackerError as ErrorResponseDto | null,
    statsError: statsError as ErrorResponseDto | null,
    entriesError: entriesError as ErrorResponseDto | null,

    // UI state
    selectedTimeRange,
    sortOrder,
    isAddEntryOpen,
    editingEntry,
    deletingEntryId,

    // Permissions
    permissions,

    // Actions
    setSelectedTimeRange,
    setSortOrder,
    loadMoreEntries,
    openAddEntry: () => setIsAddEntryOpen(true),
    closeAddEntry: () => setIsAddEntryOpen(false),
    openEditEntry: setEditingEntry,
    closeEditEntry: () => setEditingEntry(null),
    openDeleteConfirmation: setDeletingEntryId,
    closeDeleteConfirmation: () => setDeletingEntryId(null),
    handleCreateEntry,
    handleUpdateEntry,
    handleDeleteEntry,
  };
};
```

**useIntersectionObserver** - dla infinite scroll:

```typescript
const useIntersectionObserver = (
  callback: () => void,
  options?: IntersectionObserverInit
) => {
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        callback();
      }
    }, options);

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [callback, options]);

  return targetRef;
};
```

## 7. Integracja API

### 7.1. API Client Setup

Wykorzystanie Axios jako HTTP client z interceptorami dla autoryzacji i obsługi błędów:

```typescript
// lib/api-client.ts
import axios from 'axios';
import { supabase } from './supabase';

const apiClient = axios.create({
  baseURL: import.meta.env.PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - dodanie JWT token
apiClient.interceptors.request.use(
  async (config) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - obsługa błędów
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }

    return Promise.reject(error.response?.data || error);
  }
);

export default apiClient;
```

### 7.2. Endpointy wykorzystywane przez widok

#### GET /api/trackers/:id

**Request**:

```typescript
GET /api/trackers/550e8400-e29b-41d4-a716-446655440000
Headers: {
  Authorization: Bearer <jwt_token>
}
```

**Response (200 OK)**:

```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  user_id: "auth0|123456",
  name: "Waga",
  data_type: "number",
  unit: "kg",
  config: {},
  color: "#3b82f6",
  icon: "scale",
  display_order: 0,
  is_active: true,
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-01-15T10:00:00Z",
  is_owner: true,
  shared_permission: null,
  stats: {
    total_entries: 45,
    first_entry_at: "2025-12-01T08:00:00Z",
    last_entry_at: "2026-02-01T07:30:00Z"
  }
}
```

**Type**: `TrackerDetailResponseDto`

**Error responses**:

- `401 Unauthorized` - Brak lub nieprawidłowy token
- `403 Forbidden` - Użytkownik nie ma dostępu do trackera
- `404 Not Found` - Tracker nie istnieje

---

#### GET /api/trackers/:trackerId/stats

**Request**:

```typescript
GET /api/trackers/550e8400-e29b-41d4-a716-446655440000/stats?period=30d
Headers: {
  Authorization: Bearer <jwt_token>
}
```

**Query params**:

- `period`: StatsPeriod ('7d' | '30d' | '90d' | '1y' | 'all') - domyślnie '30d'

**Response (200 OK)**:

```typescript
{
  tracker_id: "550e8400-e29b-41d4-a716-446655440000",
  period: "30d",
  data_type: "number",
  stats: {
    count: 30,
    average: 75.5,
    min: 73.2,
    max: 77.8,
    median: 75.4,
    std_dev: 1.2
  },
  chart_data: {
    labels: ["2026-01-02", "2026-01-03", "2026-01-04", ...],
    values: [75.5, 75.3, 75.7, ...]
  },
  heatmap_data: [
    { date: "2026-01-02", count: 1, value: 75.5 },
    { date: "2026-01-03", count: 1, value: 75.3 },
    ...
  ]
}
```

**Type**: `TrackerStatsResponseDto`

**Error responses**:

- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`

---

#### GET /api/trackers/:trackerId/entries

**Request**:

```typescript
GET /api/trackers/550e8400-e29b-41d4-a716-446655440000/entries?page=1&limit=20&sort_order=desc
Headers: {
  Authorization: Bearer <jwt_token>
}
```

**Query params**:

- `page`: number - numer strony (domyślnie 1)
- `limit`: number - liczba elementów na stronę (domyślnie 50, max 100)
- `sort_order`: SortOrder ('asc' | 'desc') - domyślnie 'desc'
- `from`: ISO8601 - filtruj wpisy od tej daty (opcjonalnie)
- `to`: ISO8601 - filtruj wpisy do tej daty (opcjonalnie)

**Response (200 OK)**:

```typescript
{
  data: [
    {
      id: "660e8400-e29b-41d4-a716-446655440001",
      tracker_id: "550e8400-e29b-41d4-a716-446655440000",
      user_id: "auth0|123456",
      value: 75.5,
      recorded_at: "2026-02-01T07:30:00Z",
      created_at: "2026-02-01T07:31:00Z",
      updated_at: "2026-02-01T07:31:00Z"
    },
    ...
  ],
  pagination: {
    page: 1,
    limit: 20,
    total_items: 45,
    total_pages: 3
  }
}
```

**Type**: `EntryListResponseDto`

**Error responses**:

- `400 Bad Request` - Nieprawidłowe parametry query
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`

---

#### POST /api/trackers/:trackerId/entries

**Request**:

```typescript
POST /api/trackers/550e8400-e29b-41d4-a716-446655440000/entries
Headers: {
  Authorization: Bearer <jwt_token>,
  Content-Type: application/json
}
Body: {
  value: 75.8,
  recorded_at: "2026-02-01T08:00:00Z" // optional, defaults to now
}
```

**Request type**: `CreateEntryCommand`

```typescript
interface CreateEntryCommand {
  value: number | boolean | string; // typ zależny od tracker.data_type
  recorded_at?: string; // ISO8601, opcjonalnie
}
```

**Response (201 Created)**:

```typescript
{
  id: "770e8400-e29b-41d4-a716-446655440002",
  tracker_id: "550e8400-e29b-41d4-a716-446655440000",
  user_id: "auth0|123456",
  value: 75.8,
  recorded_at: "2026-02-01T08:00:00Z",
  created_at: "2026-02-01T08:01:00Z",
  updated_at: "2026-02-01T08:01:00Z"
}
```

**Response type**: `EntryResponseDto`

**Error responses**:

- `400 Bad Request` - Nieprawidłowe body requestu
- `401 Unauthorized`
- `403 Forbidden` - Użytkownik nie ma uprawnień write
- `404 Not Found` - Tracker nie istnieje
- `422 Unprocessable Entity` - Wartość nie pasuje do data_type trackera

**Walidacja 422**:

```typescript
{
  statusCode: 422,
  error: "Unprocessable Entity",
  message: "Validation failed",
  details: [
    {
      field: "value",
      message: "Value must be a number between 1 and 10"
    }
  ],
  timestamp: "2026-02-01T08:01:00Z",
  path: "/api/trackers/550e8400-e29b-41d4-a716-446655440000/entries"
}
```

---

#### PATCH /api/trackers/:trackerId/entries/:entryId

**Request**:

```typescript
PATCH /api/trackers/550e8400-e29b-41d4-a716-446655440000/entries/770e8400-e29b-41d4-a716-446655440002
Headers: {
  Authorization: Bearer <jwt_token>,
  Content-Type: application/json
}
Body: {
  value: 76.0
}
```

**Request type**: `UpdateEntryCommand`

```typescript
interface UpdateEntryCommand {
  value?: number | boolean | string;
  recorded_at?: string; // ISO8601
}
```

**Response (200 OK)**:

```typescript
{
  id: "770e8400-e29b-41d4-a716-446655440002",
  tracker_id: "550e8400-e29b-41d4-a716-446655440000",
  user_id: "auth0|123456",
  value: 76.0,
  recorded_at: "2026-02-01T08:00:00Z",
  created_at: "2026-02-01T08:01:00Z",
  updated_at: "2026-02-01T08:15:00Z"
}
```

**Response type**: `EntryResponseDto`

**Error responses**:

- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden` - Użytkownik nie jest autorem wpisu i nie jest właścicielem trackera
- `404 Not Found` - Entry lub Tracker nie istnieje
- `422 Unprocessable Entity` - Walidacja wartości

---

#### DELETE /api/trackers/:trackerId/entries/:entryId

**Request**:

```typescript
DELETE /api/trackers/550e8400-e29b-41d4-a716-446655440000/entries/770e8400-e29b-41d4-a716-446655440002
Headers: {
  Authorization: Bearer <jwt_token>
}
```

**Response (204 No Content)**

**Error responses**:

- `401 Unauthorized`
- `403 Forbidden` - Użytkownik nie jest autorem wpisu i nie jest właścicielem trackera
- `404 Not Found` - Entry lub Tracker nie istnieje

---

### 7.3. Error Handling Strategy

**Typy błędów i obsługa**:

1. **401 Unauthorized** - Redirect do `/login`
   - Interceptor globalny w axios
2. **403 Forbidden** - Wyświetlenie komunikatu "Nie masz dostępu do tego trackera" + redirect do `/app`
   - Obsługa w TrackerDetailPage (useEffect)
3. **404 Not Found** - Wyświetlenie komunikatu "Tracker nie został znaleziony" + redirect do `/app`
   - Obsługa w TrackerDetailPage (useEffect)
4. **422 Unprocessable Entity** - Wyświetlenie błędów walidacji przy polach formularza
   - React Hook Form setError dla każdego pola z details
   - Przykład:
   ```typescript
   if (error.statusCode === 422 && error.details) {
     error.details.forEach((detail: ValidationErrorDetailDto) => {
       setError(detail.field as any, {
         type: 'server',
         message: detail.message,
       });
     });
   }
   ```
5. **500 Internal Server Error** - Toast notification "Wystąpił błąd serwera. Spróbuj ponownie."
   - Obsługa w onError mutations
6. **Network Error** - Toast notification "Brak połączenia z internetem"
   - Obsługa w axios interceptor

## 8. Interakcje użytkownika

### 8.1. Główne przepływy użytkownika

#### Przepływ 1: Przeglądanie szczegółów trackera

1. Użytkownik klika tracker na Dashboardzie
2. Nawigacja do `/app/trackers/:trackerId`
3. Wyświetlenie loading skeleton
4. Równoległe pobieranie:
   - GET /api/trackers/:id (szczegóły)
   - GET /api/trackers/:id/stats?period=30d (statystyki)
   - GET /api/trackers/:id/entries?page=1&limit=20 (wpisy)
5. Renderowanie:
   - Header z nazwą i metadanymi
   - Karty statystyk (avg, min, max, std_dev)
   - Wykres liniowy/heatmapa
   - Lista wpisów
6. Użytkownik może:
   - Zmienić zakres czasu (TimeRangeSelector)
   - Scrollować listę wpisów (infinite scroll)
   - Edytować/usunąć wpis (inline actions)
   - Dodać nowy wpis (FAB)
   - Powrócić do Dashboard (back button)

#### Przepływ 2: Dodawanie nowego wpisu (US-006)

1. Użytkownik klika FAB (Floating Action Button)
2. Otwarcie AddEntryBottomSheet z animacją slide-up
3. Autofocus na polu wartości
4. Użytkownik wprowadza wartość:
   - Number: wpisuje liczbę (np. 75.5)
   - Scale: przesuwa slider (np. 8/10)
   - Boolean: przełącza toggle (Yes/No)
   - Text: wpisuje tekst w textarea
5. Opcjonalnie zmienia datę/czas (domyślnie "now")
6. Klika "Zapisz"
7. Walidacja frontendu (React Hook Form + Zod):
   - Czy wartość jest wymagana
   - Czy wartość odpowiada typowi
   - Czy data nie jest w przyszłości
   - Dla scale: czy wartość w zakresie min-max
8. Jeśli walidacja OK:
   - POST /api/trackers/:id/entries
   - Loading state na przycisku
9. Odpowiedź z API:
   - **201 Created**:
     - Toast "Wpis dodany pomyślnie"
     - Zamknięcie Bottom Sheet
     - Odświeżenie statystyk i listy wpisów (invalidate queries)
     - Nowy wpis pojawia się na górze listy
   - **422 Unprocessable Entity**:
     - Wyświetlenie błędów przy polach formularza
     - Bottom Sheet pozostaje otwarty
   - **403 Forbidden**:
     - Toast "Nie masz uprawnień do dodawania wpisów"
     - Zamknięcie Bottom Sheet
10. Całość <= 5 sekund (US-006)

#### Przepływ 3: Edycja wpisu (US-009)

1. Użytkownik klika ikonę "Edit" przy wpisie na liście
2. Otwarcie EditEntryModal z pre-filled wartościami
3. Użytkownik modyfikuje wartość lub datę
4. Klika "Zapisz"
5. Walidacja frontendu (jak w Przepływie 2)
6. Jeśli walidacja OK:
   - PATCH /api/trackers/:trackerId/entries/:entryId
   - Optimistic update - natychmiastowa zmiana wartości na liście (TanStack Query)
7. Odpowiedź z API:
   - **200 OK**:
     - Toast "Wpis zaktualizowany"
     - Zamknięcie modala
     - Aktualizacja potwierdzona w cache
   - **422 Unprocessable Entity**:
     - Wyświetlenie błędów
     - Rollback optimistic update
   - **403 Forbidden**:
     - Toast "Nie masz uprawnień do edycji tego wpisu"
     - Rollback optimistic update
     - Zamknięcie modala

#### Przepływ 4: Usuwanie wpisu (US-009)

1. Użytkownik klika ikonę "Delete" przy wpisie na liście
2. Otwarcie DeleteConfirmationDialog
3. Komunikat: "Czy na pewno chcesz usunąć ten wpis? Ta operacja jest nieodwracalna."
4. Użytkownik klika "Usuń":
   - DELETE /api/trackers/:trackerId/entries/:entryId
   - Optimistic update - natychmiastowe usunięcie z listy
   - Loading state na przycisku "Usuń"
5. Odpowiedź z API:
   - **204 No Content**:
     - Toast "Wpis usunięty"
     - Zamknięcie dialogu
     - Aktualizacja statystyk (invalidate)
   - **403 Forbidden**:
     - Toast "Nie masz uprawnień do usunięcia tego wpisu"
     - Rollback optimistic update
   - **404 Not Found**:
     - Toast "Wpis nie został znaleziony"
     - Rollback optimistic update
6. Użytkownik klika "Anuluj":
   - Zamknięcie dialogu bez żadnej akcji

#### Przepływ 5: Zmiana zakresu czasu dla statystyk

1. Użytkownik klika przycisk w TimeRangeSelector (np. "7d")
2. Aktywny przycisk zmienia kolor (visual feedback)
3. GET /api/trackers/:id/stats?period=7d
4. Loading state dla sekcji wykres + karty statystyk (skeleton)
5. Po otrzymaniu odpowiedzi:
   - Aktualizacja wykres z nowymi danymi
   - Aktualizacja kart statystyk
   - Animacja transition (smooth)

#### Przepływ 6: Infinite scroll dla listy wpisów

1. Użytkownik scrolluje listę wpisów w dół
2. Intersection Observer wykrywa trigger element (ostatni element + offset)
3. Jeśli hasNextPage === true:
   - GET /api/trackers/:id/entries?page=2&limit=20
   - Loading spinner pojawia się pod listą
4. Po otrzymaniu odpowiedzi:
   - Nowe wpisy dołączane do istniejącej listy (append)
   - Pagination state aktualizowany
   - Loading spinner znika
5. Powtarzalne aż do ostatniej strony

### 8.2. Keyboard Navigation

**Skróty klawiaturowe**:

- `Esc` - Zamknięcie Bottom Sheet / Modala / Dialogu
- `Ctrl/Cmd + Enter` - Submit formularza (Add/Edit Entry)
- `Tab` / `Shift+Tab` - Nawigacja między polami formularza
- `Backspace` - Powrót do Dashboard (gdy focus nie jest w input)

**Focus management**:

- Bottom Sheet: Focus trap - Tab nie wychodzi poza modal
- Autofocus na pierwszym polu w formularzach
- Po zamknięciu modala: powrót focusu do elementu, który otworzył modal (FAB / Edit button)

### 8.3. Touch Gestures (Mobile)

- **Swipe down** na Bottom Sheet - Zamknięcie
- **Pull to refresh** na liście wpisów - Odświeżenie danych (opcjonalnie)
- **Long press** na Entry Item - Szybki dostęp do menu (Edit/Delete)

## 9. Warunki i walidacja

### 9.1. Warunki wyświetlania komponentów

#### TrackerDetailHeader

**Warunek**: Zawsze wyświetlany jeśli tracker załadowany

**Badge "Shared"**:

```typescript
Warunek: tracker.is_owner === false;
```

**Actions (Edit/Share/Delete)**:

```typescript
Warunek: tracker.is_owner === true;
```

#### StatsCards

**Warunek wyświetlania**:

```typescript
Warunek: tracker.data_type === 'number' || tracker.data_type === 'scale';
```

**Wyświetlanie jednostki**:

```typescript
Warunek: tracker.unit !== null;
Format: `${value} ${tracker.unit}`;
```

#### LineChart

**Warunek wyświetlania**:

```typescript
Warunek: tracker.data_type === 'number' || tracker.data_type === 'scale';
```

**EmptyChartState zamiast wykresu**:

```typescript
Warunek: stats.chart_data.values.length === 0;
```

#### CalendarHeatmap

**Warunek wyświetlania**:

```typescript
Warunek: tracker.data_type === 'boolean';
```

#### TextEntriesCloud

**Warunek wyświetlania**:

```typescript
Warunek: tracker.data_type === 'text';
```

#### Entry Actions (Edit/Delete)

**Warunek wyświetlania**:

```typescript
Warunek: entry.user_id === currentUser.id || // Użytkownik jest autorem
  tracker.is_owner === true; // Użytkownik jest właścicielem trackera
```

#### AddEntryFAB

**Warunek wyświetlania**:

```typescript
Warunek: tracker.is_owner === true || tracker.shared_permission === 'write';
```

**Disabled state**:

```typescript
Warunek: isLoadingTracker || trackerError !== null;
```

#### LoadMoreTrigger (Infinite Scroll)

**Warunek wyświetlania**:

```typescript
Warunek: pagination !== null && pagination.page < pagination.total_pages;
```

### 9.2. Walidacja formularzy

#### AddEntryForm / EditEntryForm

**Pole value (number)**:

```typescript
Reguły walidacji:
1. Wymagane: value !== undefined && value !== null && value !== ''
   Komunikat: "Wartość jest wymagana"

2. Typ: typeof value === 'number'
   Komunikat: "Wartość musi być liczbą"

3. Skończona liczba: !isNaN(value) && isFinite(value)
   Komunikat: "Wartość musi być poprawną liczbą"
```

**Pole value (scale)**:

```typescript
Reguły walidacji:
1-3. Jak wyżej dla number

4. Zakres: value >= tracker.config.min && value <= tracker.config.max
   Komunikat: `Wartość musi być w zakresie ${config.min} - ${config.max}`
```

**Pole value (boolean)**:

```typescript
Reguły walidacji:
1. Typ: typeof value === 'boolean'
   Komunikat: "Wartość musi być typu boolean"
```

**Pole value (text)**:

```typescript
Reguły walidacji:
1. Wymagane: value !== undefined && value !== null && value.trim() !== ''
   Komunikat: "Tekst nie może być pusty"

2. Długość: value.length <= 1000
   Komunikat: "Tekst nie może być dłuższy niż 1000 znaków"
```

**Pole recorded_at**:

```typescript
Reguły walidacji:
1. Format: Poprawna data ISO8601
   Komunikat: "Niepoprawny format daty"

2. Nie w przyszłości: new Date(recorded_at) <= new Date()
   Komunikat: "Data nie może być w przyszłości"
```

### 9.3. Walidacja po stronie API (422 Unprocessable Entity)

**Mapowanie błędów API na pola formularza**:

```typescript
// Przykład obsługi 422 w handleSubmit
const handleSubmit = async (formData: AddEntryFormData) => {
  try {
    await createEntryMutation.mutateAsync(formData);
  } catch (error) {
    if (error.statusCode === 422 && error.details) {
      error.details.forEach((detail: ValidationErrorDetailDto) => {
        setError(detail.field as keyof AddEntryFormData, {
          type: 'server',
          message: detail.message,
        });
      });
    } else {
      // Ogólny błąd
      toast.error('Wystąpił błąd podczas zapisywania wpisu');
    }
  }
};
```

**Przykładowe błędy 422 z API**:

```typescript
// Scale value out of range
{
  statusCode: 422,
  details: [
    {
      field: "value",
      message: "Value must be between 1 and 10"
    }
  ]
}

// Invalid date format
{
  statusCode: 422,
  details: [
    {
      field: "recorded_at",
      message: "Invalid date format. Expected ISO8601."
    }
  ]
}

// Text too long
{
  statusCode: 422,
  details: [
    {
      field: "value",
      message: "Text cannot exceed 1000 characters"
    }
  ]
}
```

### 9.4. Warunki permissions (zabezpieczenia)

**Dodawanie wpisu**:

```typescript
Warunek:
  tracker.is_owner === true ||
  tracker.shared_permission === 'write'

Jeśli false:
  - FAB ukryty
  - POST /api/trackers/:id/entries zwróci 403
```

**Edycja wpisu**:

```typescript
Warunek:
  (entry.user_id === currentUser.id) || // Autor wpisu
  (tracker.is_owner === true)           // Właściciel trackera

Jeśli false:
  - Edit button ukryty
  - PATCH /api/trackers/:id/entries/:entryId zwróci 403
```

**Usuwanie wpisu**:

```typescript
Warunek: Identyczny jak dla edycji

Jeśli false:
  - Delete button ukryty
  - DELETE /api/trackers/:id/entries/:entryId zwróci 403
```

**Edycja trackera**:

```typescript
Warunek: tracker.is_owner === true

Jeśli false:
  - Edit Tracker button ukryty w header
```

**Udostępnianie trackera**:

```typescript
Warunek: tracker.is_owner === true

Jeśli false:
  - Share button ukryty w header
```

## 10. Obsługa błędów

### 10.1. Błędy ładowania danych

#### Tracker nie istnieje (404)

**Wykrycie**: useTrackerDetail zwraca error z statusCode 404

**Obsługa**:

```typescript
useEffect(() => {
  if (trackerError?.statusCode === 404) {
    toast.error('Tracker nie został znaleziony');
    setTimeout(() => {
      navigate('/app');
    }, 2000);
  }
}, [trackerError, navigate]);
```

**UI**: Toast notification + redirect do Dashboard po 2 sekundach

#### Brak dostępu do trackera (403)

**Wykrycie**: useTrackerDetail zwraca error z statusCode 403

**Obsługa**:

```typescript
useEffect(() => {
  if (trackerError?.statusCode === 403) {
    toast.error('Nie masz dostępu do tego trackera');
    setTimeout(() => {
      navigate('/app');
    }, 2000);
  }
}, [trackerError, navigate]);
```

**UI**: Toast notification + redirect do Dashboard

#### Błąd sieciowy podczas ładowania

**Wykrycie**: Network error lub timeout w TanStack Query

**Obsługa**:

```typescript
const { error, refetch } = useTrackerDetail(trackerId);

if (error && !error.statusCode) {
  // Network error
  return (
    <ErrorState
      title="Błąd połączenia"
      message="Nie można pobrać danych trackera. Sprawdź połączenie z internetem."
      action={
        <Button onClick={() => refetch()}>
          Spróbuj ponownie
        </Button>
      }
    />
  );
}
```

**UI**: Komponent ErrorState z przyciskiem "Spróbuj ponownie"

### 10.2. Błędy podczas mutacji

#### Walidacja formularza (422)

**Wykrycie**: createEntryMutation.error.statusCode === 422

**Obsługa**:

```typescript
onError: (error: ErrorResponseDto) => {
  if (error.statusCode === 422 && error.details) {
    error.details.forEach((detail) => {
      setError(detail.field as any, {
        type: 'server',
        message: detail.message,
      });
    });
    toast.error('Popraw błędy w formularzu');
  }
};
```

**UI**: Błędy wyświetlane przy odpowiednich polach formularza + toast

#### Brak uprawnień podczas mutacji (403)

**Wykrycie**: mutation.error.statusCode === 403

**Obsługa**:

```typescript
onError: (error: ErrorResponseDto) => {
  if (error.statusCode === 403) {
    toast.error('Nie masz uprawnień do wykonania tej operacji');
    setIsAddEntryOpen(false); // Zamknięcie modala
  }
};
```

**UI**: Toast notification + zamknięcie formularza

#### Konflikt / Wpis nie istnieje podczas edycji/usuwania (404)

**Wykrycie**: updateEntryMutation.error.statusCode === 404

**Obsługa**:

```typescript
onError: (error: ErrorResponseDto) => {
  if (error.statusCode === 404) {
    toast.error('Wpis nie został znaleziony. Mógł zostać usunięty.');
    queryClient.invalidateQueries(queryKeys.trackerEntries(trackerId));
    setEditingEntry(null);
  }
};
```

**UI**: Toast + invalidation listy (odświeżenie) + zamknięcie modala

#### Błąd serwera (500)

**Wykrycie**: error.statusCode === 500

**Obsługa**:

```typescript
onError: (error: ErrorResponseDto) => {
  if (error.statusCode === 500) {
    toast.error('Wystąpił błąd serwera. Spróbuj ponownie później.');
    // Nie rollback optimistic update - użytkownik może spróbować ponownie
  }
};
```

**UI**: Toast notification

### 10.3. Optimistic Updates i Rollback

#### Strategia optimistic update dla edycji wpisu

```typescript
const updateEntryMutation = useMutation({
  mutationFn: (data: UpdateEntryCommand) =>
    apiClient.patch(`/api/trackers/${trackerId}/entries/${entryId}`, data),

  // Przed wysłaniem request - natychmiastowa aktualizacja UI
  onMutate: async (updatedEntry) => {
    // Anuluj in-flight queries aby uniknąć race condition
    await queryClient.cancelQueries({
      queryKey: queryKeys.trackerEntries(trackerId),
    });

    // Zapisz poprzedni stan (dla rollback)
    const previousEntries = queryClient.getQueryData(
      queryKeys.trackerEntries(trackerId)
    );

    // Optimistic update - aktualizuj cache
    queryClient.setQueryData(
      queryKeys.trackerEntries(trackerId),
      (old: any) => ({
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          data: page.data.map((entry: EntryResponseDto) =>
            entry.id === entryId
              ? {
                  ...entry,
                  ...updatedEntry,
                  updated_at: new Date().toISOString(),
                }
              : entry
          ),
        })),
      })
    );

    return { previousEntries };
  },

  // Jeśli błąd - przywróć poprzedni stan
  onError: (err, variables, context) => {
    if (context?.previousEntries) {
      queryClient.setQueryData(
        queryKeys.trackerEntries(trackerId),
        context.previousEntries
      );
    }

    toast.error('Nie udało się zaktualizować wpisu');
  },

  // Po zakończeniu (sukces lub błąd) - zawsze refetch aby zsynchronizować
  onSettled: () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.trackerEntries(trackerId),
    });
  },

  // Sukces
  onSuccess: () => {
    toast.success('Wpis zaktualizowany');
    setEditingEntry(null);
  },
});
```

#### Strategia optimistic update dla usuwania wpisu

```typescript
const deleteEntryMutation = useMutation({
  mutationFn: () =>
    apiClient.delete(`/api/trackers/${trackerId}/entries/${entryId}`),

  onMutate: async () => {
    await queryClient.cancelQueries({
      queryKey: queryKeys.trackerEntries(trackerId),
    });

    const previousEntries = queryClient.getQueryData(
      queryKeys.trackerEntries(trackerId)
    );

    // Optimistic update - usuń z cache
    queryClient.setQueryData(
      queryKeys.trackerEntries(trackerId),
      (old: any) => ({
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          data: page.data.filter(
            (entry: EntryResponseDto) => entry.id !== entryId
          ),
          pagination: {
            ...page.pagination,
            total_items: page.pagination.total_items - 1,
          },
        })),
      })
    );

    return { previousEntries };
  },

  onError: (err, variables, context) => {
    if (context?.previousEntries) {
      queryClient.setQueryData(
        queryKeys.trackerEntries(trackerId),
        context.previousEntries
      );
    }

    toast.error('Nie udało się usunąć wpisu');
  },

  onSettled: () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.trackerEntries(trackerId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.trackerStats(trackerId),
    });
  },

  onSuccess: () => {
    toast.success('Wpis usunięty');
    setDeletingEntryId(null);
  },
});
```

### 10.4. Offline handling

**Wykrycie braku połączenia**:

```typescript
const isOnline = useOnlineStatus(); // Custom hook

if (!isOnline) {
  return (
    <OfflineBanner>
      Jesteś offline. Funkcje wymagające połączenia są niedostępne.
    </OfflineBanner>
  );
}
```

**Wyłączenie mutacji offline**:

```typescript
<AddEntryFAB
  onClick={openAddEntry}
  disabled={!isOnline}
/>
```

**UI**: Banner u góry strony + disabled buttons dla mutacji

### 10.5. Error Boundary

Komponent Error Boundary dla całego widoku TrackerDetailPage:

```typescript
class TrackerDetailErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TrackerDetail Error:', error, errorInfo);
    // Opcjonalnie: wysłanie do error tracking service (Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="Coś poszło nie tak"
          message="Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę."
          action={
            <Button onClick={() => window.location.reload()}>
              Odśwież stronę
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
```

## 11. Kroki implementacji

### Krok 1: Setup projektowy i routing

**Zadania**:

1. Utworzenie struktury folderów:

   ```
   src/pages/app/trackers/
   ├── [trackerId].tsx          # Strona główna
   src/components/tracker-detail/
   ├── TrackerDetailHeader.tsx
   ├── TimeRangeSelector.tsx
   ├── TrackerVisualizationSection.tsx
   ├── StatsCards.tsx
   ├── LineChart.tsx
   ├── CalendarHeatmap.tsx
   ├── EntriesSection.tsx
   ├── EntryItem.tsx
   ├── AddEntryFAB.tsx
   ├── AddEntryBottomSheet.tsx
   ├── ValueInput.tsx
   ├── EditEntryModal.tsx
   ├── DeleteConfirmationDialog.tsx
   └── index.ts
   ```

2. Dodanie route w React Router:

   ```typescript
   <Route path="/app/trackers/:trackerId" element={<TrackerDetailPage />} />
   ```

3. Utworzenie typów w pliku:
   ```
   src/components/tracker-detail/types.ts
   ```

**Definicja ukończenia**: Routing działa, można przejść do `/app/trackers/test-id`, strona renderuje się (nawet jeśli pusta).

---

### Krok 2: Setup integracji API i custom hooks

**Zadania**:

1. Utworzenie API query hooks:

   ```
   src/hooks/api/
   ├── useTrackerDetail.ts
   ├── useTrackerStats.ts
   ├── useTrackerEntries.ts
   └── index.ts
   ```

2. Utworzenie API mutation hooks:

   ```
   src/hooks/api/
   ├── useCreateEntry.ts
   ├── useUpdateEntry.ts
   ├── useDeleteEntry.ts
   └── index.ts
   ```

3. Utworzenie query keys convention:

   ```typescript
   // src/lib/query-keys.ts
   export const trackerKeys = {
     detail: (id: string) => ['trackers', id] as const,
     stats: (id: string, period: StatsPeriod) =>
       ['trackers', id, 'stats', period] as const,
     entries: (id: string, query: EntryQueryDto) =>
       ['trackers', id, 'entries', query] as const,
   };
   ```

4. Implementacja useTrackerDetailViewModel custom hook

**Definicja ukończenia**: Hooki API działają, można testować pobieranie danych w konsoli.

---

### Krok 3: Implementacja TrackerDetailPage i podstawowego layoutu

**Zadania**:

1. Implementacja głównego komponentu TrackerDetailPage:
   - useParams do pobrania trackerId
   - Użycie useTrackerDetailViewModel
   - Obsługa stanów loading/error
   - Skeleton loader

2. Implementacja TrackerDetailHeader:
   - Wyświetlanie nazwy trackera
   - Back button
   - Badges (typ, jednostka, "Shared")
   - Dropdown z akcjami (tylko szkielet)

3. Testowanie podstawowej nawigacji i ładowania danych

**Definicja ukończenia**: Strona wyświetla nazwę trackera, back button działa, skeleton loader podczas ładowania.

---

### Krok 4: Implementacja sekcji wizualizacji (wykresy i statystyki)

**Zadania**:

1. Implementacja TimeRangeSelector:
   - Button group z opcjami
   - Active state styling
   - onChange handler

2. Implementacja StatsCards:
   - Grid layout
   - Karty z ikonami i wartościami
   - Formatowanie liczb z jednostkami
   - Skeleton loader

3. Implementacja LineChart (Recharts):
   - ResponsiveContainer
   - XAxis, YAxis, Tooltip
   - Line z kolorem z trackera
   - Obsługa pustego stanu

4. Implementacja CalendarHeatmap:
   - Custom component z grid dni
   - Kolorowanie kafelków
   - Tooltip przy hover
   - Legenda

5. Implementacja TrackerVisualizationSection:
   - Warunkowe renderowanie wykresów zależnie od data_type
   - Integracja z TimeRangeSelector

**Definicja ukończenia**: Wykresy renderują się poprawnie dla różnych typów trackerów, TimeRangeSelector zmienia zakres danych.

---

### Krok 5: Implementacja listy wpisów z infinite scroll

**Zadania**:

1. Implementacja EntryItem:
   - Formatowanie wartości zależnie od data_type
   - Timestamp (relative + absolute)
   - Akcje Edit/Delete (tylko UI)

2. Implementacja EntriesSection:
   - Lista EntryItem
   - Sort toggle
   - Nagłówek z licznikiem

3. Implementacja infinite scroll:
   - useIntersectionObserver hook
   - LoadMoreTrigger component
   - Integracja z useInfiniteQuery

4. Implementacja EmptyEntriesState (gdy brak wpisów)

**Definicja ukończenia**: Lista wpisów wyświetla się, infinite scroll ładuje kolejne strony, sortowanie działa.

---

### Krok 6: Implementacja formularza dodawania wpisu

**Zadania**:

1. Implementacja ValueInput:
   - NumberInput (dla number)
   - ScaleSlider (dla scale)
   - BooleanToggle (dla boolean)
   - TextInput (dla text)
   - Warunkowe renderowanie

2. Implementacja AddEntryBottomSheet:
   - Bottom sheet container z animacją
   - Header z zamknięciem
   - Formularz z React Hook Form
   - DateTimePicker
   - Przyciski Save/Cancel

3. Implementacja AddEntryFAB

4. Integracja z useCreateEntry mutation:
   - onSubmit handler
   - Optimistic update
   - Toast notifications
   - Obsługa błędów 422

5. Implementacja Zod schemas dla walidacji

**Definicja ukończenia**: FAB otwiera Bottom Sheet, formularz waliduje poprawnie, można dodać wpis, lista odświeża się.

---

### Krok 7: Implementacja edycji i usuwania wpisów

**Zadania**:

1. Implementacja EditEntryModal:
   - Modal z formularzem (podobny do Add)
   - Pre-filling wartości
   - Integracja z useUpdateEntry

2. Implementacja DeleteConfirmationDialog:
   - Dialog z potwierdzeniem
   - Integracja z useDeleteEntry

3. Podpięcie akcji Edit/Delete w EntryItem:
   - onClick handlers
   - Otwieranie modali

4. Implementacja optimistic updates dla edycji i usuwania

5. Implementacja rollback w przypadku błędów

**Definicja ukończenia**: Można edytować i usuwać wpisy, optimistic updates działają, rollback w przypadku błędów.

---

### Krok 8: Implementacja permissions i zabezpieczeń

**Zadania**:

1. Obliczanie UserPermissions w useTrackerDetailViewModel

2. Warunkowe renderowanie elementów UI:
   - FAB (canAddEntries)
   - Edit/Delete actions (canEditEntries/canDeleteEntries)
   - Header actions (canEdit, canShare)

3. Wyświetlanie badge "Shared" gdy is_owner === false

4. Obsługa błędów 403 przy mutacjach:
   - Toast notifications
   - Zamykanie modali

**Definicja ukończenia**: UI dostosowuje się do uprawnień użytkownika, błędy 403 są obsługiwane.

---

### Krok 9: Obsługa błędów i edge cases

**Zadania**:

1. Implementacja Error Boundary dla całego widoku

2. Obsługa błędów 404/403 przy ładowaniu trackera:
   - Toast notification
   - Redirect do Dashboard

3. Obsługa błędów sieciowych:
   - ErrorState component z "Spróbuj ponownie"
   - Offline banner

4. Obsługa pustych stanów:
   - EmptyChartState (brak danych na wykresie)
   - EmptyEntriesState (brak wpisów)

5. Testowanie edge cases:
   - Tracker bez wpisów
   - Tracker z 1 wpisem
   - Bardzo długie teksty w value (text type)
   - Wartości skrajne (min/max dla scale)

**Definicja ukończenia**: Wszystkie edge cases obsłużone, błędy wyświetlają się czytelnie.

---

### Krok 10: Styling, animacje i responsywność

**Zadania**:

1. Styling wszystkich komponentów z Tailwind CSS:
   - Dark mode jako domyślny
   - Shadcn/ui components

2. Dodanie animacji:
   - Bottom Sheet slide-up/down
   - Modal fade-in/out
   - Skeleton shimmer
   - Chart transitions (Recharts)

3. Responsywność:
   - Mobile-first approach
   - Breakpoints dla tablet/desktop
   - Touch-friendly targets (min 44x44px)

4. Accessibility:
   - ARIA labels
   - Focus management
   - Keyboard navigation
   - Screen reader testing

**Definicja ukończenia**: UI wygląda zgodnie z designem, animacje płynne, responsywność na wszystkich urządzeniach.

---

### Krok 11: Testing i optymalizacja

**Zadania**:

1. Unit testy dla custom hooks:
   - useTrackerDetailViewModel
   - useIntersectionObserver

2. Integration testy dla komponentów:
   - AddEntryBottomSheet (formularz + submit)
   - EntryItem (edit/delete actions)

3. E2E testy (Playwright/Cypress):
   - Przepływ dodawania wpisu
   - Przepływ edycji wpisu
   - Przepływ usuwania wpisu
   - Infinite scroll

4. Performance optimization:
   - React.memo dla EntryItem
   - useMemo dla obliczonych wartości
   - Lazy loading dla modali

5. Code review i refactoring

**Definicja ukończenia**: Testy przechodzą, wydajność optymalna, kod czysty.

---

### Krok 12: Dokumentacja i finalizacja

**Zadania**:

1. Dokumentacja JSDoc dla wszystkich komponentów i hooków

2. README dla folderu `tracker-detail`:
   - Struktura komponentów
   - Przepływy użytkownika
   - API integration

3. Storybook stories dla komponentów prezentacyjnych (opcjonalnie)

4. Finalne testowanie manualne:
   - Wszystkie user stories z PRD
   - Cross-browser testing
   - Mobile testing (rzeczywiste urządzenia)

5. Deployment na staging i feedback od stakeholderów

**Definicja ukończenia**: Widok gotowy do produkcji, dokumentacja kompletna, feedback zebrany.

---

## Podsumowanie

Plan implementacji widoku szczegółów trackera obejmuje **12 kroków** rozłożonych logicznie od setup-u projektowego, przez integrację API, implementację UI, obsługę błędów, aż po testing i dokumentację. Każdy krok ma jasno zdefiniowane zadania i kryteria ukończenia.

**Szacowany czas realizacji**: 3-4 tygodnie dla 1 programisty frontend (assuming 40h/tydzień)

**Kluczowe technologie**:

- React 19 + TypeScript
- TanStack Query (React Query) dla zarządzania stanem serwerowym
- React Hook Form + Zod dla formularzy
- Recharts dla wykresów
- Tailwind CSS + Shadcn/ui dla UI
- Axios dla HTTP requests

**Największe wyzwania**:

1. Optimistic updates z rollback (mutacje)
2. Infinite scroll z TanStack Query
3. Warunkowe renderowanie wykresów zależnie od data_type
4. Walidacja formularzy z różnymi typami danych
5. Responsywność i touch gestures na mobile
