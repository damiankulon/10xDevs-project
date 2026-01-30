# API Endpoint Implementation Plan: GET /api/export

## 1. Przegląd punktu końcowego

Endpoint `GET /api/export` umożliwia użytkownikom eksportowanie swoich danych z aplikacji Kipio. Obsługuje dwa formaty wyjściowe: JSON i CSV. Użytkownik może eksportować wszystkie swoje trackery lub wybrać konkretne za pomocą filtra `tracker_ids`. Dodatkowo możliwe jest filtrowanie wpisów (entries) według zakresu dat.

**Główne funkcjonalności:**

- Eksport danych użytkownika w formacie JSON lub CSV
- Filtrowanie trackerów po ID (opcjonalne)
- Filtrowanie wpisów po zakresie dat (opcjonalne)
- Obsługa nagłówków `Content-Disposition` do pobierania pliku
- Uwierzytelnianie za pomocą JWT token

## 2. Szczegóły żądania

### Metoda HTTP

`GET`

### Struktura URL

`/api/export`

### Nagłówki

| Nagłówek        | Wartość              | Wymagany |
| --------------- | -------------------- | -------- |
| `Authorization` | `Bearer <jwt_token>` | Tak      |

### Parametry Query

| Parametr      | Typ       | Domyślnie | Wymagany | Opis                                        |
| ------------- | --------- | --------- | -------- | ------------------------------------------- |
| `format`      | `string`  | `json`    | Nie      | Format eksportu: `json` lub `csv`           |
| `tracker_ids` | `string`  | -         | Nie      | Lista UUID trackerów oddzielona przecinkami |
| `from`        | `ISO8601` | -         | Nie      | Data początkowa dla wpisów                  |
| `to`          | `ISO8601` | -         | Nie      | Data końcowa dla wpisów                     |

### Przykładowe żądania

```
GET /api/export
GET /api/export?format=csv
GET /api/export?tracker_ids=uuid1,uuid2&from=2026-01-01T00:00:00Z&to=2026-01-31T23:59:59Z
```

## 3. Wykorzystywane typy

### Istniejące typy z `@kipio/shared`

```typescript
// Enum dla formatu eksportu
export const ExportFormat = {
  JSON: 'json',
  CSV: 'csv',
} as const;

export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

// Query DTO
export interface ExportQueryDto {
  format?: ExportFormat;
  tracker_ids?: string;
  from?: string;
  to?: string;
}

// User DTO dla eksportu
export interface ExportUserDto {
  id: string;
  display_name: string;
}

// Entry DTO dla eksportu
export interface ExportEntryDto {
  id: string;
  value: EntryValue;
  recorded_at: string;
}

// Tracker DTO dla eksportu
export interface ExportTrackerDto {
  id: string;
  name: string;
  data_type: DataType;
  unit: string | null;
  entries: ExportEntryDto[];
}

// Response DTO dla JSON
export interface ExportResponseDto {
  exported_at: string;
  user: ExportUserDto;
  trackers: ExportTrackerDto[];
}

// Zod schema dla walidacji
export const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  tracker_ids: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
```

### Nowe typy do utworzenia w serwisie

```typescript
// Interfejs dla wewnętrznego przekazywania sparsowanych parametrów
interface ExportParams {
  userId: string;
  format: ExportFormat;
  trackerIds?: string[];
  from?: Date;
  to?: Date;
}

// Struktura wiersza CSV
interface CsvRow {
  tracker_id: string;
  tracker_name: string;
  entry_id: string;
  value: string;
  recorded_at: string;
}
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

#### Format JSON

**Headers:**

```
Content-Type: application/json
Content-Disposition: attachment; filename="kipio_export_2026-01-27.json"
```

**Body:**

```json
{
  "exported_at": "2026-01-27T12:00:00Z",
  "user": {
    "id": "uuid",
    "display_name": "John Doe"
  },
  "trackers": [
    {
      "id": "uuid",
      "name": "Weight",
      "data_type": "number",
      "unit": "kg",
      "entries": [
        {
          "id": "uuid",
          "value": 75.5,
          "recorded_at": "2026-01-23T08:00:00Z"
        }
      ]
    }
  ]
}
```

#### Format CSV

**Headers:**

```
Content-Type: text/csv
Content-Disposition: attachment; filename="kipio_export_2026-01-27.csv"
```

**Body:**

```csv
tracker_id,tracker_name,entry_id,value,recorded_at
uuid,Weight,uuid,75.5,2026-01-23T08:00:00Z
```

### Błędy

| Status Code                 | Opis                             | Kiedy występuje                                                    |
| --------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `400 Bad Request`           | Nieprawidłowe parametry query    | Nieprawidłowy format UUID w tracker_ids, nieprawidłowy format daty |
| `401 Unauthorized`          | Brak lub nieprawidłowy token JWT | Brak nagłówka Authorization lub wygasły/nieprawidłowy token        |
| `500 Internal Server Error` | Błąd serwera                     | Błąd bazy danych, nieoczekiwany wyjątek                            |

## 5. Przepływ danych

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Request    │────▶│ ExportController │────▶│  ExportService   │────▶│    Supabase    │
│  GET /export │     │  (walidacja)     │     │  (logika)        │     │   (DB)         │
└──────────────┘     └──────────────────┘     └──────────────────┘     └────────────────┘
                              │                        │                        │
                              │                        │  1. Pobierz profil     │
                              │                        │─────────────────────────▶
                              │                        │◀─────────────────────────
                              │                        │                        │
                              │                        │  2. Pobierz trackery   │
                              │                        │─────────────────────────▶
                              │                        │◀─────────────────────────
                              │                        │                        │
                              │                        │  3. Pobierz entries    │
                              │                        │─────────────────────────▶
                              │                        │◀─────────────────────────
                              │                        │                        │
                              │  4. Format response    │                        │
                              │◀───────────────────────│                        │
                              │                        │                        │
                              │  5. Ustaw headers      │                        │
                              │  i zwróć odpowiedź     │                        │
                              ▼                        ▼                        ▼
```

### Szczegółowy przepływ:

1. **Walidacja żądania** (Controller)
   - Walidacja JWT token przez `JwtAuthGuard`
   - Walidacja parametrów query przez `ExportQueryDto` i Zod schema
   - Parsowanie `tracker_ids` z comma-separated string do tablicy UUID

2. **Pobieranie profilu użytkownika** (Service)
   - Query do tabeli `profiles` po `user_id`
   - Pobranie `display_name` dla eksportu

3. **Pobieranie trackerów** (Service)
   - Query do tabeli `trackers` po `user_id`
   - Filtrowanie po `tracker_ids` jeśli podano
   - Wykluczenie soft-deleted (`deleted_at IS NULL`)

4. **Pobieranie wpisów** (Service)
   - Query do tabeli `entries` po `tracker_id` dla każdego trackera
   - Filtrowanie po zakresie dat jeśli podano (`from`, `to`)
   - Wykluczenie soft-deleted (`deleted_at IS NULL`)

5. **Formatowanie odpowiedzi** (Service)
   - Mapowanie wartości entries na podstawie `data_type` trackera
   - Budowanie struktury JSON lub CSV

6. **Ustawienie nagłówków odpowiedzi** (Controller)
   - `Content-Type` zgodnie z formatem
   - `Content-Disposition` z nazwą pliku

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

- Wymagany prawidłowy JWT token w nagłówku `Authorization`
- Token walidowany przez `JwtAuthGuard` z Passport.js
- Weryfikacja sygnatury tokenu kluczem publicznym Supabase

### Autoryzacja

- Użytkownik może eksportować tylko własne dane
- Filtrowanie danych po `user_id` z JWT payload (`sub` claim)
- Weryfikacja przynależności trackerów do użytkownika przed eksportem

### Walidacja danych wejściowych

- Walidacja formatu UUID dla `tracker_ids`
- Walidacja formatu ISO8601 dla dat `from` i `to`
- Walidacja wartości enum dla `format`
- Sanityzacja danych przed wstawieniem do CSV (ucieczka znaków specjalnych)

### Ochrona przed atakami

- Rate limiting (implementowany globalnie przez `@nestjs/throttler`)
- Limit rozmiaru eksportu (rozważyć paginację dla dużych zbiorów danych)
- Escape znaków specjalnych w CSV dla ochrony przed CSV Injection

## 7. Obsługa błędów

### Scenariusze błędów

| Scenariusz                         | Status Code | Komunikat                                 | Obsługa                       |
| ---------------------------------- | ----------- | ----------------------------------------- | ----------------------------- |
| Brak tokenu JWT                    | 401         | `Unauthorized`                            | Zwrócony przez `JwtAuthGuard` |
| Nieprawidłowy token JWT            | 401         | `Invalid token`                           | Zwrócony przez `JwtStrategy`  |
| Wygasły token JWT                  | 401         | `Token expired`                           | Zwrócony przez `JwtStrategy`  |
| Nieprawidłowy format `format`      | 400         | `Invalid format. Must be 'json' or 'csv'` | Walidacja Zod                 |
| Nieprawidłowy UUID w `tracker_ids` | 400         | `Invalid tracker ID format`               | Walidacja w kontrolerze       |
| Nieprawidłowy format daty          | 400         | `Invalid date format. Use ISO8601`        | Walidacja Zod                 |
| Tracker nie należy do użytkownika  | 400         | `Tracker not found or access denied`      | Weryfikacja w serwisie        |
| Profil użytkownika nie istnieje    | 500         | `User profile not found`                  | Błąd wewnętrzny               |
| Błąd bazy danych                   | 500         | `Internal server error`                   | Logowanie, ogólny komunikat   |

### Logowanie błędów

```typescript
// Przykład logowania
this.logger.error(`Failed to fetch trackers for user ${userId}`, {
  userId,
  trackerIds,
  error: error.message,
});
```

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Duża liczba trackerów i wpisów**
   - Rozwiązanie: Efektywne query z JOIN zamiast N+1 queries
   - Rozwiązanie: Streaming dla CSV (opcjonalnie w przyszłości)

2. **Brak indeksów na kolumnach filtrujących**
   - Wymagane indeksy:
     - `entries(tracker_id, recorded_at)` - dla filtrowania po dacie
     - `trackers(user_id, deleted_at)` - dla pobierania trackerów użytkownika

3. **Formatowanie dużych zbiorów danych**
   - Rozwiązanie: Lazy evaluation dla CSV
   - Rozwiązanie: Limit wpisów z informacją o pagination

### Optymalizacje

1. **Single query dla trackerów z entries**

   ```sql
   SELECT t.*, e.*
   FROM trackers t
   LEFT JOIN entries e ON e.tracker_id = t.id
   WHERE t.user_id = $1
     AND t.deleted_at IS NULL
     AND e.deleted_at IS NULL
     AND ($2::uuid[] IS NULL OR t.id = ANY($2))
     AND ($3::timestamptz IS NULL OR e.recorded_at >= $3)
     AND ($4::timestamptz IS NULL OR e.recorded_at <= $4)
   ORDER BY t.display_order, e.recorded_at DESC
   ```

2. **Limit eksportu**
   - Maksymalnie 10,000 wpisów na eksport
   - Informacja w odpowiedzi jeśli osiągnięto limit

## 9. Etapy wdrożenia

### Krok 1: Utworzenie modułu Export

Utwórz nowy moduł `export` w strukturze aplikacji NestJS:

```
apps/api/src/export/
├── dto/
│   └── export-query.dto.ts
├── export.controller.ts
├── export.module.ts
├── export.service.ts
└── index.ts
```

**Zadania:**

- Utworzenie plików modułu
- Rejestracja modułu w `AppModule`
- Eksport publicznych elementów przez `index.ts`

### Krok 2: Implementacja DTO i walidacji

**Plik:** `export/dto/export-query.dto.ts`

```typescript
import { IsOptional, IsEnum, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ExportFormat } from '@kipio/shared';

export class ExportQueryDto {
  @IsOptional()
  @IsEnum(['json', 'csv'])
  format?: ExportFormat = 'json';

  @IsOptional()
  @IsString()
  tracker_ids?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, {
    message: 'from must be a valid ISO8601 date string',
  })
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/, {
    message: 'to must be a valid ISO8601 date string',
  })
  to?: string;
}
```

**Zadania:**

- Implementacja DTO z dekoratorami `class-validator`
- Dodanie transformacji dla domyślnych wartości

### Krok 3: Implementacja ExportService

**Plik:** `export/export.service.ts`

**Metody do implementacji:**

1. `export(params: ExportParams): Promise<ExportResponseDto | string>`
   - Główna metoda koordynująca eksport
   - Wywołuje metody pomocnicze
   - Formatuje odpowiedź

2. `getUserProfile(userId: string): Promise<ExportUserDto>`
   - Pobiera dane profilu użytkownika

3. `getTrackersWithEntries(params: ExportParams): Promise<ExportTrackerDto[]>`
   - Pobiera trackery z entries
   - Aplikuje filtry

4. `formatAsJson(data: ExportResponseDto): ExportResponseDto`
   - Formatuje dane jako JSON

5. `formatAsCsv(data: ExportResponseDto): string`
   - Formatuje dane jako CSV
   - Obsługuje escape znaków specjalnych

6. `mapEntryValue(entry: Entry, dataType: DataType): EntryValue`
   - Mapuje wartość entry na podstawie typu danych

**Zadania:**

- Implementacja logiki biznesowej
- Obsługa błędów z odpowiednimi wyjątkami NestJS
- Logowanie operacji

### Krok 4: Implementacja ExportController

**Plik:** `export/export.controller.ts`

```typescript
@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async export(
    @CurrentUser() user: AuthUser,
    @Query() query: ExportQueryDto,
    @Res() res: Response
  ): Promise<void> {
    // Implementacja
  }
}
```

**Zadania:**

- Walidacja parametrów query
- Parsowanie `tracker_ids` na tablicę UUID
- Ustawienie nagłówków odpowiedzi
- Wywołanie serwisu i zwrócenie odpowiedzi

### Krok 5: Implementacja pomocniczych funkcji CSV

**Plik:** `export/utils/csv.utils.ts`

```typescript
export function escapeCsvValue(value: string): string {
  // Implementacja escape dla CSV
}

export function buildCsvRow(row: CsvRow): string {
  // Budowanie wiersza CSV
}

export function buildCsvContent(rows: CsvRow[]): string {
  // Budowanie całego contentu CSV z nagłówkami
}
```

**Zadania:**

- Implementacja escape dla znaków specjalnych (, " \n)
- Obsługa wartości null/undefined
- Budowanie nagłówka CSV

### Krok 6: Rejestracja modułu w AppModule

**Plik:** `app.module.ts`

```typescript
import { ExportModule } from './export';

@Module({
  imports: [
    // ...existing imports
    ExportModule,
  ],
})
export class AppModule {}
```

### Krok 7: Testy jednostkowe

**Plik:** `export/export.service.spec.ts`

**Scenariusze testowe:**

- Eksport wszystkich trackerów (JSON)
- Eksport wszystkich trackerów (CSV)
- Eksport wybranych trackerów
- Eksport z filtrem dat
- Obsługa pustego eksportu (brak trackerów)
- Obsługa trackerów bez entries
- Walidacja nieprawidłowych tracker_ids
- Mapowanie wartości dla różnych typów danych

**Plik:** `export/export.controller.spec.ts`

**Scenariusze testowe:**

- Poprawne ustawienie nagłówków dla JSON
- Poprawne ustawienie nagłówków dla CSV
- Walidacja parametrów query
- Autoryzacja (brak tokenu)

### Krok 8: Testy integracyjne (E2E)

**Plik:** `test/export.e2e-spec.ts`

**Scenariusze testowe:**

- Pełny przepływ eksportu JSON
- Pełny przepływ eksportu CSV
- Eksport z filtrami
- Obsługa błędów autoryzacji
- Obsługa błędów walidacji

### Krok 9: Dokumentacja API

Aktualizacja dokumentacji OpenAPI/Swagger:

- Opis endpointu
- Parametry query
- Przykładowe odpowiedzi
- Kody błędów

### Krok 10: Code review i deployment

**Checklist przed mergem:**

- [ ] Wszystkie testy przechodzą
- [ ] Brak błędów lintingu
- [ ] Dokumentacja zaktualizowana
- [ ] Logowanie błędów zaimplementowane
- [ ] Rate limiting aktywny
- [ ] Security review przeprowadzony

---

## Załącznik A: Struktura plików

```
apps/api/src/
├── export/
│   ├── dto/
│   │   └── export-query.dto.ts
│   ├── utils/
│   │   └── csv.utils.ts
│   ├── export.controller.ts
│   ├── export.module.ts
│   ├── export.service.ts
│   ├── export.service.spec.ts
│   └── index.ts
└── app.module.ts (aktualizacja)
```

## Załącznik B: Przykładowe query SQL

### Pobieranie trackerów z entries

```sql
-- Optymalne query z LEFT JOIN
SELECT
  t.id as tracker_id,
  t.name as tracker_name,
  t.data_type,
  t.unit,
  e.id as entry_id,
  e.value_number,
  e.value_boolean,
  e.value_text,
  e.recorded_at
FROM kipio.trackers t
LEFT JOIN kipio.entries e ON e.tracker_id = t.id
  AND e.deleted_at IS NULL
  AND ($3::timestamptz IS NULL OR e.recorded_at >= $3)
  AND ($4::timestamptz IS NULL OR e.recorded_at <= $4)
WHERE t.user_id = $1
  AND t.deleted_at IS NULL
  AND ($2::uuid[] IS NULL OR t.id = ANY($2))
ORDER BY t.display_order ASC, e.recorded_at DESC;
```

## Załącznik C: Przykładowa implementacja CSV escape

```typescript
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Jeśli wartość zawiera przecinek, cudzysłów lub nową linię, otocz cudzysłowami
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    // Escape cudzysłowów przez podwojenie
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}
```
