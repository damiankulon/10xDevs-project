# Plan implementacji widoku tworzenia trackera

## 1. Przegląd

Widok tworzenia trackera umożliwia użytkownikom definiowanie nowych niestandardowych metryk do śledzenia. Widok będzie zaimplementowany jako modal dostępny z poziomu dashboardu, zapewniający szybkie i intuicyjne tworzenie trackerów z walidacją w czasie rzeczywistym. Implementacja musi być zoptymalizowana pod urządzenia mobilne (Mobile-first) i zapewniać możliwość utworzenia trackera w minimalnym czasie.

Kluczowe cele:

- Umożliwienie użytkownikowi szybkiego dodania nowego trackera (docelowo < 30 sekund)
- Walidacja danych zgodnie z wymaganiami API i limitami użytkownika
- Dynamiczne dostosowanie formularza w zależności od wybranego typu danych
- Obsługa błędów API (limit trackerów, walidacja)
- Natychmiastowa aktualizacja dashboardu po utworzeniu

## 2. Routing widoku

**Główna ścieżka:** Modal otwarty na `/app/dashboard` lub `/app/trackers/new`

**Implementacja routingu:**

- Modal sterowany przez stan URL (`?modal=create-tracker`) lub dedykowana ścieżka
- React Router obsługuje nawigację w sekcji aplikacyjnej
- Po zamknięciu modalu: powrót do dashboardu
- Po utworzeniu trackera: przekierowanie do szczegółów trackera lub pozostanie na dashboardzie z toast notification

**Query parameters:**

- `?modal=create-tracker` - otwarcie modalu tworzenia
- `?template=<template_id>` - (opcjonalnie) pre-fill z szablonu

## 3. Struktura komponentów

```
CreateTrackerView (Modal Container)
├── CreateTrackerModal
│   ├── ModalHeader
│   │   ├── Title ("Utwórz nowy tracker")
│   │   └── CloseButton
│   ├── CreateTrackerForm
│   │   ├── TrackerNameInput
│   │   ├── DataTypeSelector
│   │   │   └── DataTypeOption (x4: number, scale, boolean, text)
│   │   ├── ConditionalFields (dynamiczne renderowanie)
│   │   │   ├── UnitInput (tylko dla data_type: number)
│   │   │   └── ScaleConfigInputs (tylko dla data_type: scale)
│   │   │       ├── MinValueInput
│   │   │       └── MaxValueInput
│   │   ├── OptionalFields (collapsible)
│   │   │   ├── ColorPicker
│   │   │   └── IconSelector
│   │   └── FormActions
│   │       ├── CancelButton
│   │       └── SubmitButton ("Utwórz tracker")
│   └── LimitWarning (jeśli blisko limitu)
```

## 4. Szczegóły komponentów

### CreateTrackerView

- **Opis:** Główny kontener widoku zarządzający stanem modalu i orchestracją komponentów
- **Główne elementy:**
  - Dialog/Modal overlay z shadcn/ui
  - Obsługa klawiatury (ESC do zamknięcia)
  - Focus trap wewnątrz modalu
- **Obsługiwane interakcje:**
  - Otwarcie modalu (trigger z dashboardu)
  - Zamknięcie modalu (ESC, kliknięcie overlay, przycisk zamknij)
  - Nawigacja klawiaturą
- **Warunki walidacji:** Brak (delegowane do formularza)
- **Typy:** `CreateTrackerModalProps`
- **Propsy:**
  - `isOpen: boolean` - stan otwarcia modalu
  - `onClose: () => void` - callback zamknięcia
  - `onSuccess?: (tracker: TrackerResponseDto) => void` - callback po utworzeniu

### CreateTrackerModal

- **Opis:** Wrapper modalu zawierający nagłówek, formularz i ostrzeżenie o limicie
- **Główne elementy:**
  - `Dialog` z shadcn/ui
  - `DialogContent`, `DialogHeader`, `DialogTitle`
  - Conditional render dla `LimitWarning`
- **Obsługiwane interakcje:** Przekazywanie eventów do dzieci
- **Warunki walidacji:** Brak
- **Typy:** `CreateTrackerModalProps`
- **Propsy:**
  - `isOpen: boolean`
  - `onClose: () => void`
  - `currentTrackerCount: number` - do wyświetlenia ostrzeżenia
  - `trackerLimit: number` - domyślnie 50

### ModalHeader

- **Opis:** Nagłówek modalu z tytułem i przyciskiem zamknięcia
- **Główne elementy:**
  - `DialogHeader` z shadcn/ui
  - `DialogTitle` - "Utwórz nowy tracker"
  - `Button` (X icon) do zamknięcia
- **Obsługiwane interakcje:** Kliknięcie przycisku zamknij
- **Warunki walidacji:** Brak
- **Typy:** Standard shadcn/ui types
- **Propsy:**
  - `onClose: () => void`

### CreateTrackerForm

- **Opis:** Główny formularz zarządzający stanem i walidacją danych trackera
- **Główne elementy:**
  - `<form>` element z React Hook Form
  - Wszystkie pola formularza jako komponenty dzieci
  - Error messages display
- **Obsługiwane interakcje:**
  - Submit formularza (Enter, kliknięcie przycisku)
  - Zmiana wartości pól
  - Walidacja w czasie rzeczywistym
- **Warunki walidacji:**
  - `name`: wymagane, max 100 znaków, min 1 znak po trim
  - `data_type`: wymagane, jeden z: 'number' | 'scale' | 'boolean' | 'text'
  - `unit`: opcjonalne, max 20 znaków, tylko gdy data_type === 'number'
  - `config.min`: wymagane gdy data_type === 'scale', typ: number
  - `config.max`: wymagane gdy data_type === 'scale', typ: number, większe niż min
  - `color`: opcjonalne, format hex #RRGGBB, regex: /^#[0-9A-F]{6}$/i
  - `icon`: opcjonalne, max 50 znaków
  - `display_order`: opcjonalne, integer >= 0
- **Typy:** `CreateTrackerFormData`, `CreateTrackerDto`
- **Propsy:**
  - `onSuccess: (tracker: TrackerResponseDto) => void`
  - `onCancel: () => void`

### TrackerNameInput

- **Opis:** Pole tekstowe do wprowadzenia nazwy trackera z licznikiem znaków
- **Główne elementy:**
  - `Input` z shadcn/ui
  - `Label` - "Nazwa trackera"
  - Character counter (np. "25/100")
  - Error message display
- **Obsługiwane interakcje:**
  - Wprowadzanie tekstu
  - Autofocus przy otwarciu modalu
  - Walidacja on blur i on change
- **Warunki walidacji:**
  - Wymagane (required)
  - Min 1 znak po trim
  - Max 100 znaków
  - Komunikat błędu: "Nazwa jest wymagana" lub "Nazwa może mieć maksymalnie 100 znaków"
- **Typy:** Standard HTML input props + React Hook Form integration
- **Propsy:** Zarządzane przez React Hook Form (register)

### DataTypeSelector

- **Opis:** Selector typu danych trackera z wizualnymi kartami opcji
- **Główne elementy:**
  - `RadioGroup` z shadcn/ui lub custom card selector
  - 4x `DataTypeOption` komponenty
  - Description dla każdego typu
- **Obsługiwane interakcje:**
  - Wybór jednej opcji (radio behavior)
  - Keyboard navigation (strzałki)
  - Zmiana wartości powoduje reset pól warunkowych
- **Warunki walidacji:**
  - Wymagane (required)
  - Jeden z: 'number', 'scale', 'boolean', 'text'
  - Komunikat błędu: "Wybierz typ danych"
- **Typy:** `DataType = 'number' | 'scale' | 'boolean' | 'text'`
- **Propsy:** Zarządzane przez React Hook Form

### DataTypeOption

- **Opis:** Pojedyncza opcja typu danych z ikoną, tytułem i opisem
- **Główne elementy:**
  - `Card` z shadcn/ui (clickable)
  - Icon component
  - Title (np. "Liczba")
  - Description (np. "Wartości liczbowe z opcjonalną jednostką")
  - Selected state indicator
- **Obsługiwane interakcje:** Kliknięcie do wyboru
- **Warunki walidacji:** Brak (delegowane do parent)
- **Typy:** `DataTypeOptionProps`
- **Propsy:**
  - `type: DataType`
  - `title: string`
  - `description: string`
  - `icon: ReactNode`
  - `selected: boolean`
  - `onClick: () => void`

### ConditionalFields

- **Opis:** Kontener renderujący pola warunkowe w zależności od wybranego data_type
- **Główne elementy:**
  - Conditional render: `UnitInput` lub `ScaleConfigInputs`
  - Animacja przy przełączaniu (optional fade-in)
- **Obsługiwane interakcje:** Przekazywanie do dzieci
- **Warunki walidacji:** Delegowane do dzieci
- **Typy:** Brak specyficznych
- **Propsy:**
  - `dataType: DataType`

### UnitInput

- **Opis:** Pole tekstowe dla jednostki (tylko dla data_type: number)
- **Główne elementy:**
  - `Input` z shadcn/ui
  - `Label` - "Jednostka (opcjonalnie)"
  - Placeholder: "np. kg, km, min"
  - Character counter "0/20"
- **Obsługivane interakcje:** Wprowadzanie tekstu
- **Warunki walidacji:**
  - Opcjonalne
  - Max 20 znaków
  - Tylko dla data_type === 'number'
  - Komunikat błędu: "Jednostka może mieć maksymalnie 20 znaków"
- **Typy:** Standard input props
- **Propsy:** Zarządzane przez React Hook Form

### ScaleConfigInputs

- **Opis:** Para pól numerycznych dla konfiguracji skali (min/max)
- **Główne elementy:**
  - Container (flex row na desktop, column na mobile)
  - `MinValueInput`
  - `MaxValueInput`
  - Description: "Określ zakres skali"
- **Obsługiwane interakcje:** Wprowadzanie wartości, walidacja relacji min < max
- **Warunki walidacji:**
  - Oba pola wymagane gdy data_type === 'scale'
  - min musi być liczbą
  - max musi być liczbą
  - max musi być większe od min
  - Komunikaty błędów:
    - "Wartość minimalna jest wymagana"
    - "Wartość maksymalna jest wymagana"
    - "Wartość maksymalna musi być większa niż minimalna"
- **Typy:** `ScaleConfig = { min: number; max: number }`
- **Propsy:** Zarządzane przez React Hook Form

### MinValueInput

- **Opis:** Pole numeryczne dla wartości minimalnej skali
- **Główne elementy:**
  - `Input` type="number" z shadcn/ui
  - `Label` - "Minimum"
- **Obsługiwane interakcje:** Wprowadzanie liczby
- **Warunki walidacji:** Zobacz ScaleConfigInputs
- **Typy:** Number input props
- **Propsy:** Zarządzane przez React Hook Form

### MaxValueInput

- **Opis:** Pole numeryczne dla wartości maksymalnej skali
- **Główne elementy:**
  - `Input` type="number" z shadcn/ui
  - `Label` - "Maksimum"
- **Obsługiwane interakcje:** Wprowadzanie liczby
- **Warunki walidacji:** Zobacz ScaleConfigInputs
- **Typy:** Number input props
- **Propsy:** Zarządzane przez React Hook Form

### OptionalFields

- **Opis:** Sekcja collapsible z opcjonalnymi polami (kolor, ikona)
- **Główne elementy:**
  - `Collapsible` z shadcn/ui
  - `CollapsibleTrigger` - "Opcje zaawansowane (opcjonalnie)"
  - `CollapsibleContent`
    - `ColorPicker`
    - `IconSelector`
- **Obsługiwane interakcje:**
  - Rozwijanie/zwijanie sekcji
  - Przekazywanie eventów do dzieci
- **Warunki walidacji:** Delegowane do dzieci
- **Typy:** Standard collapsible props
- **Propsy:** Brak

### ColorPicker

- **Opis:** Input kolorów z podglądem
- **Główne elementy:**
  - `Input` type="color" lub custom color picker
  - `Label` - "Kolor (opcjonalnie)"
  - Color preview swatch
  - Text input dla hex value z validation
- **Obsługiwane interakcje:**
  - Wybór koloru z palety
  - Wprowadzanie hex value
- **Warunki walidacji:**
  - Opcjonalne
  - Format hex: /^#[0-9A-F]{6}$/i
  - Komunikat błędu: "Nieprawidłowy format koloru (użyj #RRGGBB)"
- **Typy:** Color string (hex)
- **Propsy:** Zarządzane przez React Hook Form

### IconSelector

- **Opis:** Dropdown lub grid selector dla ikony trackera
- **Główne elementy:**
  - `Select` z shadcn/ui lub custom grid picker
  - `Label` - "Ikona (opcjonalnie)"
  - Lista dostępnych ikon
  - Preview wybranej ikony
- **Obsługiwane interakcje:**
  - Wybór ikony z listy
  - Search/filter ikon (nice to have)
- **Warunki walidacji:**
  - Opcjonalne
  - Max 50 znaków (nazwa ikony)
  - Komunikat błędu: "Nazwa ikony może mieć maksymalnie 50 znaków"
- **Typy:** Icon string identifier
- **Propsy:** Zarządzane przez React Hook Form

### FormActions

- **Opis:** Przyciski akcji formularza (anuluj, utwórz)
- **Główne elementy:**
  - Container (flex, justify-end, gap)
  - `CancelButton`
  - `SubmitButton`
- **Obsługiwane interakcje:**
  - Submit formularza
  - Anulowanie
- **Warunki walidacji:** Brak
- **Typy:** Standard
- **Propsy:**
  - `onCancel: () => void`
  - `isSubmitting: boolean`

### CancelButton

- **Opis:** Przycisk anulowania tworzenia trackera
- **Główne elementy:**
  - `Button` variant="outline" z shadcn/ui
  - Text: "Anuluj"
- **Obsługiwane interakcje:**
  - Kliknięcie zamyka modal
  - Nie submittuje formularza (type="button")
- **Warunki walidacji:** Brak
- **Typy:** Button props
- **Propsy:**
  - `onClick: () => void`
  - `disabled: boolean` (podczas submittowania)

### SubmitButton

- **Opis:** Przycisk tworzenia trackera
- **Główne elementy:**
  - `Button` variant="default" z shadcn/ui
  - Text: "Utwórz tracker" lub "Tworzenie..." (loading state)
  - Loading spinner (opcjonalnie)
- **Obsługiwane interakcje:**
  - Kliknięcie submittuje formularz
  - Disabled podczas submittowania
- **Warunki walidacji:** Disabled jeśli formularz jest invalid
- **Typy:** Button props
- **Propsy:**
  - `type: "submit"`
  - `disabled: boolean`
  - `isLoading: boolean`

### LimitWarning

- **Opis:** Ostrzeżenie wyświetlane gdy użytkownik zbliża się do limitu trackerów
- **Główne elementy:**
  - `Alert` z shadcn/ui (variant="warning")
  - Icon (AlertTriangle)
  - Message: "Zbliżasz się do limitu trackerów (X/50)"
- **Obsługiwane interakcje:** Brak (informacyjny)
- **Warunki walidacji:**
  - Wyświetlane gdy currentCount >= limit \* 0.8 (40+ trackerów)
- **Typy:** Alert props
- **Propsy:**
  - `currentCount: number`
  - `limit: number`

## 5. Typy

### CreateTrackerDto (Request)

```typescript
// Typ dla żądania API - dane wysyłane do POST /api/trackers
export interface CreateTrackerDto {
  name: string; // wymagane, max 100 znaków
  data_type: DataType; // wymagane
  unit?: string | null; // opcjonalne, max 20 znaków, tylko dla 'number'
  config?: ScaleConfig | Record<string, never>; // wymagane dla 'scale', opcjonalne dla innych
  color?: string | null; // opcjonalne, format #RRGGBB
  icon?: string | null; // opcjonalne, max 50 znaków
  display_order?: number; // opcjonalne, integer >= 0
}
```

### DataType

```typescript
// Enum lub union type dla typów danych trackera
export type DataType = 'number' | 'scale' | 'boolean' | 'text';
```

### ScaleConfig

```typescript
// Konfiguracja dla typu 'scale'
export interface ScaleConfig {
  min: number; // wymagane, wartość minimalna skali
  max: number; // wymagane, wartość maksymalna (> min)
}
```

### TrackerResponseDto (Response)

```typescript
// Typ odpowiedzi API - tracker zwrócony po utworzeniu
export interface TrackerResponseDto {
  id: string; // UUID
  user_id: string; // UUID
  name: string;
  data_type: DataType;
  unit: string | null;
  config: ScaleConfig | Record<string, never>;
  color: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}
```

### CreateTrackerFormData (ViewModel)

```typescript
// Typ dla stanu formularza (może różnić się od DTO)
export interface CreateTrackerFormData {
  name: string;
  data_type: DataType;
  unit: string; // empty string zamiast null w formularzu
  scaleMin: string; // string dla controlled input, konwersja do number
  scaleMax: string; // string dla controlled input, konwersja do number
  color: string; // empty string zamiast null
  icon: string; // empty string zamiast null
}
```

### CreateTrackerModalProps

```typescript
// Propsy dla głównego komponentu modalu
export interface CreateTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tracker: TrackerResponseDto) => void;
  currentTrackerCount?: number;
  trackerLimit?: number; // domyślnie 50
}
```

### DataTypeOptionProps

```typescript
// Propsy dla opcji typu danych
export interface DataTypeOptionProps {
  type: DataType;
  title: string;
  description: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}
```

### ApiError

```typescript
// Typ dla błędów API
export interface ApiError {
  statusCode: number;
  message: string | string[]; // może być array dla validation errors
  error?: string; // nazwa błędu (np. "Bad Request")
}
```

### CreateTrackerApiResponse

```typescript
// Union type dla odpowiedzi API
export type CreateTrackerApiResponse =
  | { success: true; data: TrackerResponseDto }
  | { success: false; error: ApiError };
```

## 6. Zarządzanie stanem

### Custom Hook: useCreateTracker

Dedykowany hook zarządzający logiką tworzenia trackera z integracją TanStack Query.

```typescript
interface UseCreateTrackerOptions {
  onSuccess?: (tracker: TrackerResponseDto) => void;
  onError?: (error: ApiError) => void;
}

interface UseCreateTrackerReturn {
  createTracker: (data: CreateTrackerDto) => Promise<void>;
  isLoading: boolean;
  error: ApiError | null;
  reset: () => void;
}

function useCreateTracker(
  options?: UseCreateTrackerOptions
): UseCreateTrackerReturn;
```

**Odpowiedzialności:**

- Wywołanie API POST /api/trackers
- Obsługa stanów: loading, error, success
- Invalidacja cache TanStack Query dla listy trackerów
- Optimistic update (opcjonalnie)
- Przekazywanie success/error callbacks

**Implementacja z TanStack Query:**

```typescript
const mutation = useMutation({
  mutationFn: (data: CreateTrackerDto) => apiClient.post('/api/trackers', data),
  onSuccess: (response) => {
    queryClient.invalidateQueries({ queryKey: ['trackers'] });
    options?.onSuccess?.(response.data);
  },
  onError: (error) => {
    options?.onError?.(error);
  },
});
```

### Stan formularza: React Hook Form

React Hook Form zarządza stanem formularza z integracją Zod dla walidacji.

**Schema walidacji (Zod):**

```typescript
const createTrackerSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Nazwa jest wymagana')
      .max(100, 'Nazwa może mieć maksymalnie 100 znaków')
      .trim(),

    data_type: z.enum(['number', 'scale', 'boolean', 'text'], {
      required_error: 'Wybierz typ danych',
    }),

    unit: z
      .string()
      .max(20, 'Jednostka może mieć maksymalnie 20 znaków')
      .optional()
      .or(z.literal('')),

    scaleMin: z.string().optional(),
    scaleMax: z.string().optional(),

    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, 'Nieprawidłowy format koloru (użyj #RRGGBB)')
      .optional()
      .or(z.literal('')),

    icon: z
      .string()
      .max(50, 'Nazwa ikony może mieć maksymalnie 50 znaków')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      // Walidacja: unit tylko dla 'number'
      if (data.data_type !== 'number' && data.unit) {
        return false;
      }
      return true;
    },
    {
      message: "Jednostka jest dozwolona tylko dla typu 'Liczba'",
      path: ['unit'],
    }
  )
  .refine(
    (data) => {
      // Walidacja: config dla 'scale'
      if (data.data_type === 'scale') {
        const min = parseFloat(data.scaleMin || '');
        const max = parseFloat(data.scaleMax || '');

        if (isNaN(min) || isNaN(max)) {
          return false;
        }
        if (max <= min) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Wartość maksymalna musi być większa niż minimalna',
      path: ['scaleMax'],
    }
  );
```

**Inicjalizacja formularza:**

```typescript
const form = useForm<CreateTrackerFormData>({
  resolver: zodResolver(createTrackerSchema),
  defaultValues: {
    name: '',
    data_type: 'number',
    unit: '',
    scaleMin: '',
    scaleMax: '',
    color: '',
    icon: '',
  },
  mode: 'onBlur', // walidacja po opuszczeniu pola
});
```

### Stan modalu

Stan otwarcia/zamknięcia modalu zarządzany przez parent component (Dashboard) lub React Router.

**Wariant 1: Query parameter**

```typescript
const navigate = useNavigate();
const [searchParams] = useSearchParams();
const isOpen = searchParams.get('modal') === 'create-tracker';

const openModal = () => navigate('?modal=create-tracker');
const closeModal = () => navigate('.');
```

**Wariant 2: Stan lokalny**

```typescript
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
```

### Stan profilu użytkownika

Dane profilu (limit trackerów, aktualna liczba) pobierane z TanStack Query.

```typescript
const { data: profile } = useQuery({
  queryKey: ['profile', 'me'],
  queryFn: () => apiClient.get('/api/profiles/me'),
});

const { data: trackers } = useQuery({
  queryKey: ['trackers'],
  queryFn: () => apiClient.get('/api/trackers'),
});

const currentCount = trackers?.data?.length ?? 0;
const limit = profile?.trackers_limit ?? 50;
```

## 7. Integracja API

### Endpoint: POST /api/trackers

**URL:** `${API_BASE_URL}/api/trackers`

**Metoda:** POST

**Headers:**

```typescript
{
  'Authorization': `Bearer ${jwtToken}`,
  'Content-Type': 'application/json'
}
```

**Request Body Type:** `CreateTrackerDto`

**Transformacja danych formularza do DTO:**

```typescript
function transformFormDataToDto(
  formData: CreateTrackerFormData
): CreateTrackerDto {
  const dto: CreateTrackerDto = {
    name: formData.name.trim(),
    data_type: formData.data_type,
  };

  // Dodaj unit tylko dla typu 'number'
  if (formData.data_type === 'number' && formData.unit) {
    dto.unit = formData.unit;
  }

  // Dodaj config tylko dla typu 'scale'
  if (formData.data_type === 'scale') {
    dto.config = {
      min: parseFloat(formData.scaleMin),
      max: parseFloat(formData.scaleMax),
    };
  } else {
    dto.config = {};
  }

  // Dodaj opcjonalne pola jeśli wypełnione
  if (formData.color) {
    dto.color = formData.color;
  }

  if (formData.icon) {
    dto.icon = formData.icon;
  }

  // display_order można ustawić na podstawie aktualnej liczby trackerów
  dto.display_order = currentTrackerCount;

  return dto;
}
```

**Response Type:** `TrackerResponseDto`

**Response Codes:**

- `201 Created` - Tracker utworzony pomyślnie
- `400 Bad Request` - Nieprawidłowe dane wejściowe (błędna struktura JSON)
- `401 Unauthorized` - Brak lub nieprawidłowy JWT token
- `403 Forbidden` - Przekroczony limit trackerów
- `422 Unprocessable Entity` - Błędy walidacji (szczegóły w response body)

**Przykładowe wywołanie:**

```typescript
async function createTracker(
  data: CreateTrackerDto
): Promise<TrackerResponseDto> {
  const response = await fetch(`${API_BASE_URL}/api/trackers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw error;
  }

  return response.json();
}
```

**Obsługa w komponencie:**

```typescript
const { createTracker, isLoading, error } = useCreateTracker({
  onSuccess: (tracker) => {
    toast.success(`Tracker "${tracker.name}" utworzony pomyślnie`);
    onClose();
    // Opcjonalnie: przekierowanie do szczegółów
    // navigate(`/app/trackers/${tracker.id}`);
  },
  onError: (error) => {
    // Obsługa błędów opisana w sekcji 10
  },
});

const onSubmit = async (formData: CreateTrackerFormData) => {
  const dto = transformFormDataToDto(formData);
  await createTracker(dto);
};
```

## 8. Interakcje użytkownika

### 1. Otwarcie modalu tworzenia trackera

**Trigger:** Kliknięcie przycisku "Dodaj tracker" na dashboardzie lub FAB (Floating Action Button)

**Akcja:**

- Modal pojawia się z animacją fade-in + slide-up
- Focus automatycznie przeniesiony na pole "Nazwa trackera"
- Body strony otrzymuje overflow: hidden (zapobiega scrollowaniu)
- Pobrane dane profilu (limit trackerów)

**Warunki:**

- Jeśli użytkownik osiągnął limit (50 trackerów), modal nie otwiera się
- Zamiast tego: toast error "Osiągnięto limit trackerów (50/50)"

### 2. Wprowadzanie nazwy trackera

**Interakcja:** Użytkownik wpisuje tekst w pole "Nazwa trackera"

**Akcja:**

- Licznik znaków aktualizuje się w czasie rzeczywistym (np. "25/100")
- Walidacja uruchamia się po opuszczeniu pola (onBlur)
- Komunikat błędu wyświetla się poniżej pola jeśli:
  - Pole jest puste
  - Przekroczono 100 znaków

**Visual feedback:**

- Border pola: czerwony przy błędzie, niebieski przy focus, szary domyślnie
- Error message: czerwony tekst poniżej pola

### 3. Wybór typu danych

**Interakcja:** Użytkownik klika na jedną z 4 kart typu danych

**Akcja:**

- Wybrana karta otrzymuje border highlight i background change
- Poprzednio wybrana karta traci highlight
- Pola warunkowe (unit lub scale config) pojawiają się/znikają z animacją:
  - Wybór "Liczba" → pojawia się pole "Jednostka"
  - Wybór "Skala" → pojawiają się pola "Minimum" i "Maksimum"
  - Wybór "Tak/Nie" lub "Tekst" → pola warunkowe znikają
- Reset wartości pól warunkowych przy zmianie typu

**Keyboard navigation:**

- Strzałki prawo/lewo: przełączanie między opcjami
- Enter/Space: wybór opcji
- Tab: wyjście z grupy radio

### 4. Wprowadzanie jednostki (dla typu "Liczba")

**Interakcja:** Użytkownik wpisuje tekst w pole "Jednostka"

**Akcja:**

- Opcjonalne pole, brak wymagania
- Walidacja max 20 znaków
- Placeholder sugeruje przykłady: "np. kg, km, min"
- Licznik znaków: "5/20"

**Visual feedback:**

- Error message jeśli > 20 znaków

### 5. Konfiguracja skali (dla typu "Skala")

**Interakcja:** Użytkownik wprowadza wartości min i max

**Akcja:**

- Oba pola wymagane
- Walidacja typu: tylko liczby
- Cross-field validation: max > min
- Walidacja po wprowadzeniu obu wartości (onBlur na drugim polu)

**Komunikaty błędów:**

- "Wartość minimalna jest wymagana" - jeśli puste
- "Wartość maksymalna jest wymagana" - jeśli puste
- "Wartość maksymalna musi być większa niż minimalna" - jeśli max <= min

**Visual feedback:**

- Oba pola czerwone jeśli walidacja min > max nie przechodzi
- Help text poniżej: "Określ zakres skali (np. 1-10)"

### 6. Rozwijanie opcji zaawansowanych

**Interakcja:** Kliknięcie "Opcje zaawansowane (opcjonalnie)"

**Akcja:**

- Sekcja rozwija się z animacją slide-down
- Ikona chevron obraca się (down → up)
- Pojawiają się pola: ColorPicker i IconSelector
- Stan zapamiętany podczas sesji (nie reset przy zmianie data_type)

### 7. Wybór koloru

**Interakcja:** Użytkownik otwiera color picker lub wpisuje hex value

**Akcja:**

- Kliknięcie color swatch otwiera natywny picker
- Wybór koloru aktualizuje preview swatch i text input
- Można wpisać hex ręcznie (z walidacją formatu)
- Walidacja regex: /^#[0-9A-F]{6}$/i

**Visual feedback:**

- Preview swatch pokazuje wybrany kolor
- Error message przy nieprawidłowym formacie

### 8. Wybór ikony

**Interakcja:** Użytkownik wybiera ikonę z dropdown/grid

**Akcja:**

- Otwarcie listy dostępnych ikon
- Scroll przez listę
- Kliknięcie ikony wybiera ją i zamyka dropdown
- Preview wybranej ikony obok selecta

**Nice to have:**

- Search/filter ikon po nazwie

### 9. Anulowanie tworzenia

**Interakcja:** Kliknięcie przycisku "Anuluj", ESC lub kliknięcie overlay

**Akcja:**

- Modal zamyka się z animacją fade-out
- Formularz jest resetowany
- Jeśli były niezapisane zmiany: opcjonalny dialog potwierdzenia
  - "Czy na pewno chcesz anulować? Niezapisane zmiany zostaną utracone."
  - Przyciski: "Kontynuuj edycję" / "Anuluj"

**Visual feedback:**

- Smooth close animation
- Przywrócenie focus na trigger button (accessibility)

### 10. Tworzenie trackera (submit)

**Interakcja:** Kliknięcie przycisku "Utwórz tracker" lub Enter w formularzu

**Akcja:**

1. Walidacja formularza (Zod schema)
2. Jeśli błędy walidacji:
   - Scroll do pierwszego błędu
   - Focus na błędnym polu
   - Wyświetlenie wszystkich error messages
   - Shake animation na przycisku submit
3. Jeśli walidacja OK:
   - Przycisk zmienia stan na loading ("Tworzenie...")
   - Disabled wszystkie pola formularza
   - Wysłanie POST request
   - Oczekiwanie na response

**Success flow:**

- Toast success: "Tracker '[nazwa]' utworzony pomyślnie"
- Modal zamyka się
- Dashboard odświeża się (invalidate query)
- Nowy tracker pojawia się na liście

**Error flow:**

- Obsługa błędów API (patrz sekcja 10)
- Formularz pozostaje otwarty
- Pola odblokowane
- Przycisk wraca do stanu "Utwórz tracker"

## 9. Warunki i walidacja

### Warunki walidacji na poziomie formularza

#### Pole: name (Nazwa trackera)

**Komponenty:** `TrackerNameInput`

**Warunki:**

1. **Wymagane:** Pole nie może być puste
   - Walidacja: `z.string().min(1)`
   - Komunikat: "Nazwa jest wymagana"
   - Trigger: onBlur, onSubmit
   - Visual: czerwony border, error message poniżej

2. **Maksymalna długość:** 100 znaków
   - Walidacja: `z.string().max(100)`
   - Komunikat: "Nazwa może mieć maksymalnie 100 znaków"
   - Trigger: onChange (live), onBlur
   - Visual: licznik znaków czerwony po przekroczeniu, error message

3. **Trim whitespace:** Usunięcie spacji z początku i końca
   - Walidacja: `z.string().trim()`
   - Automatyczna transformacja przed wysłaniem

**Wpływ na UI:**

- Submit button disabled jeśli pole puste lub > 100 znaków
- Character counter: "0/100" (szary), "100/100" (pomarańczowy), "105/100" (czerwony)

#### Pole: data_type (Typ danych)

**Komponenty:** `DataTypeSelector`

**Warunki:**

1. **Wymagane:** Musi być wybrana jedna opcja
   - Walidacja: `z.enum(['number', 'scale', 'boolean', 'text'])`
   - Komunikat: "Wybierz typ danych"
   - Trigger: onSubmit
   - Visual: error message powyżej selectora

**Wpływ na UI:**

- Domyślna wartość: 'number' (pre-selected)
- Zmiana typu powoduje:
  - Reset pól warunkowych (unit, scaleMin, scaleMax)
  - Show/hide odpowiednich sekcji

#### Pole: unit (Jednostka)

**Komponenty:** `UnitInput`

**Warunki:**

1. **Opcjonalne:** Może być puste
   - Walidacja: `z.string().optional()`

2. **Maksymalna długość:** 20 znaków
   - Walidacja: `z.string().max(20)`
   - Komunikat: "Jednostka może mieć maksymalnie 20 znaków"
   - Trigger: onChange (live), onBlur
   - Visual: licznik znaków, error message

3. **Warunek kontekstowy:** Dozwolone TYLKO dla data_type === 'number'
   - Walidacja: custom refine w schema
   - Komunikat: "Jednostka jest dozwolona tylko dla typu 'Liczba'"
   - Trigger: onChange data_type, onSubmit
   - Visual: pole disabled lub hidden dla innych typów

**Wpływ na UI:**

- Widoczne tylko gdy data_type === 'number'
- Character counter: "0/20"
- Nie wysyłane do API jeśli puste (null)

#### Pola: scaleMin, scaleMax (Konfiguracja skali)

**Komponenty:** `MinValueInput`, `MaxValueInput`

**Warunki:**

1. **Wymagane gdy data_type === 'scale':**
   - Walidacja: custom refine
   - Komunikat: "Wartość minimalna jest wymagana" / "Wartość maksymalna jest wymagana"
   - Trigger: onBlur, onSubmit
   - Visual: czerwony border, error messages

2. **Typ danych:** Musi być liczbą
   - Walidacja: `parseFloat()` + `isNaN()` check
   - Komunikat: "Wartość musi być liczbą"
   - Trigger: onBlur
   - Visual: error message

3. **Relacja min < max:**
   - Walidacja: custom refine `max > min`
   - Komunikat: "Wartość maksymalna musi być większa niż minimalna"
   - Trigger: onBlur na max field, onSubmit
   - Visual: error message pod polem max, oba pola czerwone

4. **Warunek kontekstowy:** Wymagane TYLKO dla data_type === 'scale'
   - Visual: pola widoczne tylko gdy data_type === 'scale'

**Wpływ na UI:**

- Widoczne tylko gdy data_type === 'scale'
- Oba pola wymagane jednocześnie
- Cross-field validation highlight
- Nie wysyłane do API dla innych typów danych

#### Pole: color (Kolor)

**Komponenty:** `ColorPicker`

**Warunki:**

1. **Opcjonalne:** Może być puste
   - Walidacja: `z.string().optional()`

2. **Format hex:** Musi być w formacie #RRGGBB
   - Walidacja: `z.string().regex(/^#[0-9A-F]{6}$/i)`
   - Komunikat: "Nieprawidłowy format koloru (użyj #RRGGBB)"
   - Trigger: onChange, onBlur
   - Visual: error message, preview swatch pokazuje error state

**Wpływ na UI:**

- Preview swatch zawsze pokazuje aktualny kolor
- Text input akceptuje tylko hex
- Color picker natywny wymusza poprawny format
- Nie wysyłane do API jeśli puste (null)

#### Pole: icon (Ikona)

**Komponenty:** `IconSelector`

**Warunki:**

1. **Opcjonalne:** Może być puste
   - Walidacja: `z.string().optional()`

2. **Maksymalna długość:** 50 znaków (nazwa ikony)
   - Walidacja: `z.string().max(50)`
   - Komunikat: "Nazwa ikony może mieć maksymalnie 50 znaków"
   - Trigger: onSubmit (raczej nie wystąpi przy wyborze z listy)

**Wpływ na UI:**

- Dropdown/grid z predefiniowanymi ikonami
- Preview wybranej ikony
- Nie wysyłane do API jeśli puste (null)

### Warunki na poziomie API

#### Limit trackerów

**Warunek:** Użytkownik nie może utworzyć więcej niż limit trackerów

**Weryfikacja:**

- Przed otwarciem modalu: check `currentCount >= limit`
  - Jeśli true: modal się nie otwiera, toast error
- Przed submitem: optional check (API i tak zweryfikuje)
- API response 403: obsługa błędu

**Komunikat:**

- Toast: "Osiągnięto limit trackerów (50/50). Usuń nieaktywne trackery, aby dodać nowe."

**Wpływ na UI:**

- Przycisk "Dodaj tracker" disabled jeśli limit osiągnięty
- Tooltip wyjaśniający: "Osiągnięto limit trackerów"
- LimitWarning w modalu jeśli blisko limitu (40+)

#### Autentykacja

**Warunek:** Użytkownik musi być zalogowany (ważny JWT token)

**Weryfikacja:**

- Middleware/guard na poziomie routingu
- Header Authorization w każdym requeście
- API response 401: przekierowanie do logowania

**Komunikat:**

- "Sesja wygasła. Zaloguj się ponownie."

**Wpływ na UI:**

- Global auth state check
- Redirect do /login jeśli 401

### Wpływ warunków na stan UI

| Warunek                    | Stan UI                  | Akcja                                   |
| -------------------------- | ------------------------ | --------------------------------------- |
| Formularz invalid          | Submit button disabled   | Użytkownik nie może wysłać formularza   |
| Limit trackerów osiągnięty | Modal nie otwiera się    | Toast error, przycisk disabled          |
| data_type !== 'number'     | UnitInput hidden         | Pole nie wyświetlane                    |
| data_type !== 'scale'      | ScaleConfigInputs hidden | Pola nie wyświetlane                    |
| Submitting (isLoading)     | Wszystkie pola disabled  | Zapobiega wielokrotnemu submitowi       |
| API error 422              | Form errors displayed    | Mapowanie błędów API na pola formularza |
| Brak połączenia            | Offline banner           | Informacja o braku internetu            |

## 10. Obsługa błędów

### Błędy walidacji formularza (Client-side)

**Źródło:** Zod schema validation w React Hook Form

**Typy błędów:**

- Puste wymagane pola
- Przekroczenie limitów znaków
- Nieprawidłowy format (hex color)
- Cross-field validation (max <= min dla scale)

**Obsługa:**

1. Błędy wyświetlane poniżej odpowiednich pól
2. Pierwsze pole z błędem otrzymuje focus
3. Submit button disabled
4. Visual feedback: czerwone bordery, ikony error

**Przykład:**

```typescript
{errors.name && (
  <p className="text-sm text-red-600 mt-1">
    {errors.name.message}
  </p>
)}
```

### Błędy API

#### 400 Bad Request

**Przyczyna:** Nieprawidłowa struktura JSON lub missing required fields

**Obsługa:**

```typescript
if (error.statusCode === 400) {
  toast.error('Nieprawidłowe dane. Sprawdź formularz i spróbuj ponownie.');
  // Opcjonalnie: log error details dla debugowania
  console.error('API 400:', error);
}
```

**UI:**

- Toast error (czerwony)
- Formularz pozostaje otwarty
- Użytkownik może poprawić dane

#### 401 Unauthorized

**Przyczyna:** Brak lub nieprawidłowy JWT token, sesja wygasła

**Obsługa:**

```typescript
if (error.statusCode === 401) {
  toast.error('Sesja wygasła. Zaloguj się ponownie.');
  // Czyszczenie local storage
  localStorage.removeItem('auth_token');
  // Przekierowanie do logowania
  navigate('/login', {
    state: { from: '/app/dashboard' },
  });
}
```

**UI:**

- Toast error
- Modal zamyka się
- Redirect do /login
- Po zalogowaniu: powrót do dashboardu

#### 403 Forbidden

**Przyczyna:** Przekroczony limit trackerów (50/50)

**Obsługa:**

```typescript
if (error.statusCode === 403) {
  toast.error(
    'Osiągnięto limit trackerów (50/50). Usuń nieaktywne trackery, aby dodać nowe.',
    { duration: 5000 }
  );
  onClose(); // Zamknij modal
}
```

**UI:**

- Toast error z instrukcją
- Modal zamyka się automatycznie
- Użytkownik widzi listę trackerów na dashboardzie
- Może usunąć nieaktywne trackery

**Prewencja:**

- Check przed otwarciem modalu
- Wyświetlenie LimitWarning w modalu przy 40+ trackerach

#### 422 Unprocessable Entity

**Przyczyna:** Błędy walidacji po stronie serwera (np. invalid hex, config mismatch)

**Format response:**

```json
{
  "statusCode": 422,
  "message": [
    "unit is only allowed for data_type 'number'",
    "config must include min and max for data_type 'scale'"
  ],
  "error": "Unprocessable Entity"
}
```

**Obsługa:**

```typescript
if (error.statusCode === 422) {
  // Mapowanie błędów API na pola formularza
  const messages = Array.isArray(error.message)
    ? error.message
    : [error.message];

  messages.forEach((msg) => {
    if (msg.includes('unit')) {
      form.setError('unit', { message: msg });
    } else if (msg.includes('config')) {
      form.setError('scaleMax', { message: msg });
    } else if (msg.includes('color')) {
      form.setError('color', { message: msg });
    }
  });

  // Ogólny toast jeśli nie można zmapować
  toast.error('Sprawdź poprawność danych w formularzu');
}
```

**UI:**

- Error messages pod konkretnymi polami
- Scroll do pierwszego błędu
- Focus na błędnym polu
- Formularz pozostaje otwarty

### Błędy sieciowe

#### Network Error / Timeout

**Przyczyna:** Brak połączenia z internetem, timeout requesta

**Obsługa:**

```typescript
if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
  toast.error(
    'Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.',
    { duration: 5000 }
  );
}
```

**UI:**

- Toast error
- Offline banner na górze strony
- Formularz pozostaje otwarty (użytkownik może spróbować ponownie)
- Retry button w toaście (nice to have)

#### 500 Internal Server Error

**Przyczyna:** Błąd po stronie serwera

**Obsługa:**

```typescript
if (error.statusCode === 500) {
  toast.error('Wystąpił błąd serwera. Spróbuj ponownie później.', {
    duration: 5000,
  });
  // Opcjonalnie: raportowanie błędu (Sentry, LogRocket)
  reportError(error);
}
```

**UI:**

- Toast error
- Formularz pozostaje otwarty
- Użytkownik może spróbować ponownie później

### Przypadki brzegowe

#### Zduplikowana nazwa trackera

**Uwaga:** API nie weryfikuje unikalności nazwy (dozwolone duplikaty)

**Obsługa:** Brak specjalnej obsługi (dozwolone przez design)

**UI:** Brak ostrzeżenia

#### Bardzo długie nazwy (blisko limitu)

**Obsługa:**

- Live character counter
- Ostrzeżenie przy 90+ znaków (pomarańczowy counter)
- Error przy > 100 znaków

#### Nieprawidłowe wartości skali (min >= max)

**Obsługa:**

- Client-side validation przed submitem
- Cross-field validation w Zod schema
- Error message pod polem max

**UI:**

- Oba pola czerwone
- Error message: "Wartość maksymalna musi być większa niż minimalna"

#### Zmiana typu danych z wypełnionymi polami warunkowymi

**Obsługa:**

- Automatyczny reset pól warunkowych
- Opcjonalnie: confirmation dialog jeśli były wypełnione
  - "Zmiana typu danych wyczyści pola jednostki/skali. Kontynuować?"

**UI:**

- Smooth transition (fade out old fields, fade in new)
- Brak error messages (reset stanu)

### Strategia retry

**Dla błędów przejściowych (network, 500):**

- Automatyczny retry z exponential backoff (TanStack Query)
- Max 3 próby
- Użytkownik widzi loading state

**Konfiguracja TanStack Query:**

```typescript
const mutation = useMutation({
  mutationFn: createTrackerApi,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

## 11. Kroki implementacji

### Faza 1: Przygotowanie typów i struktury (30 min)

1. **Utworzenie pliku typów**
   - Ścieżka: `apps/web/src/components/trackers/types.ts`
   - Zdefiniowanie wszystkich typów z sekcji 5:
     - `CreateTrackerDto`
     - `DataType`
     - `ScaleConfig`
     - `TrackerResponseDto`
     - `CreateTrackerFormData`
     - `CreateTrackerModalProps`
     - `DataTypeOptionProps`
     - `ApiError`

2. **Utworzenie struktury katalogów**

   ```
   apps/web/src/components/trackers/
   ├── types.ts
   ├── CreateTrackerModal.tsx
   ├── CreateTrackerForm.tsx
   ├── DataTypeSelector.tsx
   ├── ConditionalFields.tsx
   └── hooks/
       └── useCreateTracker.ts
   ```

3. **Importowanie dependencies**
   - shadcn/ui components: Dialog, Button, Input, Label, Alert
   - React Hook Form + Zod resolver
   - TanStack Query
   - React Router (useNavigate)

### Faza 2: Implementacja custom hooka (45 min)

4. **Utworzenie useCreateTracker hook**
   - Ścieżka: `apps/web/src/components/trackers/hooks/useCreateTracker.ts`
   - Implementacja z TanStack Query mutation
   - Obsługa success/error callbacks
   - Invalidacja cache dla listy trackerów
   - Transformacja FormData → DTO

5. **Testowanie hooka w izolacji**
   - Utworzenie prostego test component
   - Weryfikacja wywołania API
   - Sprawdzenie invalidacji cache

### Faza 3: Budowa komponentów formularza (2h)

6. **Implementacja DataTypeSelector**
   - Ścieżka: `apps/web/src/components/trackers/DataTypeSelector.tsx`
   - 4 opcje jako karty (RadioGroup)
   - Ikony dla każdego typu (np. z lucide-react)
   - Keyboard navigation
   - Integracja z React Hook Form

7. **Implementacja ConditionalFields**
   - Ścieżka: `apps/web/src/components/trackers/ConditionalFields.tsx`
   - UnitInput component (Input + Label + counter)
   - ScaleConfigInputs component (2x number inputs)
   - Conditional rendering z animacją

8. **Implementacja ColorPicker i IconSelector**
   - ColorPicker: Input type="color" + text input dla hex
   - IconSelector: Select z shadcn/ui + lista ikon
   - Preview components

9. **Implementacja CreateTrackerForm**
   - Ścieżka: `apps/web/src/components/trackers/CreateTrackerForm.tsx`
   - Inicjalizacja React Hook Form z Zod schema
   - Kompozycja wszystkich pól:
     - TrackerNameInput
     - DataTypeSelector
     - ConditionalFields
     - Collapsible z OptionalFields
   - Form actions (Cancel, Submit buttons)
   - Obsługa submit z wywołaniem useCreateTracker

### Faza 4: Schema walidacji Zod (45 min)

10. **Utworzenie schema walidacji**
    - W pliku CreateTrackerForm.tsx lub osobny validation.ts
    - Pełny schema z sekcji 6
    - Custom refines dla:
      - unit tylko dla 'number'
      - config wymagane dla 'scale'
      - max > min validation

11. **Testowanie walidacji**
    - Test wszystkich wymaganych pól
    - Test limitów znaków
    - Test cross-field validation
    - Weryfikacja error messages

### Faza 5: Implementacja modalu (1h)

12. **Utworzenie CreateTrackerModal**
    - Ścieżka: `apps/web/src/components/trackers/CreateTrackerModal.tsx`
    - Dialog z shadcn/ui
    - DialogHeader z tytułem i przyciskiem zamknij
    - Osadzenie CreateTrackerForm
    - LimitWarning component (conditional)

13. **Implementacja LimitWarning**
    - Alert z shadcn/ui
    - Conditional render (>= 80% limitu)
    - Message: "Zbliżasz się do limitu trackerów (X/50)"

14. **Zarządzanie stanem modalu**
    - Integracja z query parameter lub local state
    - Open/close handlers
    - Focus management (focus trap)
    - Keyboard handlers (ESC)

### Faza 6: Integracja z Dashboard (1h)

15. **Dodanie triggera na Dashboard**
    - Przycisk "Dodaj tracker" (FAB lub button w header)
    - Handler otwierający modal
    - Check limitu przed otwarciem

16. **Pobieranie danych profilu**
    - useQuery dla `/api/profiles/me`
    - Pobranie trackers_limit
    - Liczenie aktualnych trackerów

17. **Integracja success callback**
    - Zamknięcie modalu po utworzeniu
    - Toast notification
    - Invalidacja i refresh listy trackerów
    - Opcjonalnie: przekierowanie do szczegółów

### Faza 7: Obsługa błędów (1h)

18. **Implementacja error handlera**
    - Mapowanie błędów API na pola formularza (422)
    - Toast notifications dla błędów systemowych
    - Obsługa 401 (redirect do login)
    - Obsługa 403 (limit trackerów)

19. **UI error states**
    - Error boundaries
    - Loading states (skeleton, spinners)
    - Disabled states podczas submittowania
    - Retry logic dla network errors

### Faza 8: Styling i animacje (1h)

20. **Stylowanie komponentów**
    - Tailwind classes zgodnie z design system
    - Mobile-first responsive design
    - Dark mode support
    - Consistent spacing i typography

21. **Dodanie animacji**
    - Modal open/close transitions
    - Conditional fields fade-in/out
    - Button hover/active states
    - Loading spinner animations

22. **Accessibility audit**
    - ARIA labels
    - Focus management
    - Keyboard navigation
    - Screen reader testing

### Faza 9: Testowanie (1.5h)

23. **Testy manualne - happy path**
    - Utworzenie trackera typu "number"
    - Utworzenie trackera typu "scale"
    - Utworzenie trackera typu "boolean"
    - Utworzenie trackera typu "text"
    - Weryfikacja pojawienia się na dashboardzie

24. **Testy manualne - edge cases**
    - Puste pola wymagane
    - Przekroczenie limitów znaków
    - Nieprawidłowy format koloru
    - Scale z min >= max
    - Zmiana typu danych z wypełnionymi polami
    - Osiągnięcie limitu trackerów

25. **Testy API errors**
    - Symulacja 401 (invalid token)
    - Symulacja 403 (limit reached)
    - Symulacja 422 (validation errors)
    - Symulacja network error

26. **Testy responsywności**
    - Mobile (320px - 768px)
    - Tablet (768px - 1024px)
    - Desktop (1024px+)
    - Landscape orientation

27. **Testy accessibility**
    - Keyboard navigation (Tab, Enter, ESC, strzałki)
    - Screen reader (NVDA/JAWS)
    - Focus management
    - Color contrast (WCAG AA)

### Faza 10: Optimizacje i polish (1h)

28. **Performance optimization**
    - Memoizacja komponentów (React.memo)
    - useCallback dla event handlers
    - Lazy loading modalu (React.lazy)
    - Debouncing dla live validation

29. **UX improvements**
    - Autofocus na pierwszym polu
    - Autosave draft (localStorage) - nice to have
    - Confirmation dialog przy anulowaniu z wypełnionym formularzem
    - Tooltips dla opcji zaawansowanych

30. **Code review i cleanup**
    - Usunięcie console.logs
    - Komentarze JSDoc dla exportowanych funkcji
    - Formatowanie kodu (Prettier)
    - Linting (ESLint)

### Faza 11: Dokumentacja (30 min)

31. **Utworzenie dokumentacji komponentu**
    - README.md w katalogu trackers
    - Przykłady użycia
    - Props documentation
    - Known limitations

32. **Update dokumentacji projektu**
    - Dodanie nowego widoku do ui-plan.md
    - Update API integration docs
    - Changelog entry

### Szacowany całkowity czas: 10-12 godzin

**Breakdown:**

- Przygotowanie: 30 min
- Custom hook: 45 min
- Komponenty formularza: 2h
- Walidacja: 45 min
- Modal: 1h
- Integracja: 1h
- Obsługa błędów: 1h
- Styling: 1h
- Testowanie: 1.5h
- Optimizacje: 1h
- Dokumentacja: 30 min

**Dodatkowy czas na bufory i nieprzewidziane problemy: +2-3h**

### Kolejność priorytetów (jeśli ograniczony czas)

**Must-have (MVP):**

1. Podstawowy formularz z polami wymaganymi (name, data_type)
2. Conditional fields (unit, scale config)
3. Walidacja client-side
4. Integracja API
5. Podstawowa obsługa błędów

**Should-have:** 6. Opcjonalne pola (color, icon) 7. Zaawansowana obsługa błędów (mapowanie 422) 8. LimitWarning component 9. Animacje i transitions 10. Confirmation dialog przy anulowaniu

**Nice-to-have:** 11. Autosave draft 12. Advanced icon selector z searchem 13. Template pre-fill 14. Keyboard shortcuts 15. Analytics tracking
