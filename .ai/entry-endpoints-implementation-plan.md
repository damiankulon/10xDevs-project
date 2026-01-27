# API Endpoint Implementation Plan: Entry Endpoints

## Analiza

<analysis>

### 1. Kluczowe punkty specyfikacji API

Entry Endpoints zawierają 5 operacji CRUD dla wpisów (entries) powiązanych z trackerami:

1. **GET /api/trackers/:trackerId/entries** - Lista wpisów z paginacją i filtrowaniem
2. **GET /api/trackers/:trackerId/entries/:entryId** - Pojedynczy wpis
3. **POST /api/trackers/:trackerId/entries** - Tworzenie wpisu
4. **PATCH /api/trackers/:trackerId/entries/:entryId** - Aktualizacja wpisu
5. **DELETE /api/trackers/:trackerId/entries/:entryId** - Soft delete wpisu

Kluczowe aspekty:

- Wszystkie endpointy wymagają autoryzacji JWT
- Wartość `value` jest normalizowana w zależności od `data_type` trackera
- Dostęp do wpisów wymaga dostępu do trackera (właściciel lub współdzielenie)
- Modyfikacja/usunięcie wpisu wymaga bycia autorem wpisu
- Soft delete (ustawienie `deleted_at` zamiast fizycznego usunięcia)

### 2. Parametry wymagane i opcjonalne

**Path parameters (wszystkie wymagane):**

- `trackerId` - UUID trackera
- `entryId` - UUID wpisu (dla GET/:id, PATCH, DELETE)

**Query parameters (GET lista - opcjonalne):**

- `page` - numer strony (domyślnie: 1)
- `limit` - elementów na stronę (domyślnie: 50, max: 100)
- `sort_order` - kierunek sortowania po `recorded_at` (asc/desc, domyślnie: desc)
- `from` - data początkowa (ISO8601)
- `to` - data końcowa (ISO8601)

**Request body (POST - wymagane):**

- `value` - wartość wpisu (number | boolean | string)
- `recorded_at` - opcjonalna data pomiaru (ISO8601)

**Request body (PATCH - opcjonalne):**

- `value` - nowa wartość
- `recorded_at` - nowa data pomiaru

### 3. Niezbędne typy DTO i Command Models

Z `packages/shared/src/types.ts`:

- `EntryResponseDto` - odpowiedź dla pojedynczego wpisu
- `EntryListResponseDto` - odpowiedź z paginacją
- `CreateEntryCommand` - komenda tworzenia
- `UpdateEntryCommand` - komenda aktualizacji
- `EntryListQueryDto` - parametry zapytania listy
- `EntryValue` - typ wartości (number | boolean | string)
- `SortOrder` - enum dla kierunku sortowania
- `PaginationDto`, `PaginatedResponseDto` - typy paginacji

Nowe DTO do stworzenia (NestJS validation):

- `CreateEntryDto` - walidacja tworzenia (class-validator)
- `UpdateEntryDto` - walidacja aktualizacji (class-validator)
- `EntryQueryDto` - walidacja parametrów zapytania (class-validator)

### 4. Ekstrakcja logiki do service

Należy stworzyć nowy **EntriesService** (`apps/api/src/entries/entries.service.ts`) z metodami:

```typescript
class EntriesService {
  // Listowanie wpisów z paginacją i filtrowaniem
  async findAll(
    trackerId: string,
    userId: string,
    query: EntryQueryDto
  ): Promise<EntryListResponseDto>;

  // Pojedynczy wpis
  async findOne(
    trackerId: string,
    entryId: string,
    userId: string
  ): Promise<EntryResponseDto>;

  // Tworzenie wpisu
  async create(
    trackerId: string,
    userId: string,
    dto: CreateEntryDto
  ): Promise<EntryResponseDto>;

  // Aktualizacja wpisu
  async update(
    trackerId: string,
    entryId: string,
    userId: string,
    dto: UpdateEntryDto
  ): Promise<EntryResponseDto>;

  // Soft delete
  async remove(
    trackerId: string,
    entryId: string,
    userId: string
  ): Promise<void>;
}
```

Dodatkowe metody pomocnicze (prywatne):

- `validateTrackerAccess(trackerId, userId)` - sprawdzenie dostępu do trackera
- `validateEntryAuthor(entryId, userId)` - sprawdzenie autora wpisu
- `getTracker(trackerId)` - pobranie trackera z data_type
- `normalizeValue(entry, dataType)` - normalizacja wartości do odpowiedniego typu
- `setValueByType(value, dataType)` - ustawienie odpowiedniej kolumny wartości

### 5. Walidacja danych wejściowych

**Parametry ścieżki:**

- `trackerId` - musi być prawidłowym UUID
- `entryId` - musi być prawidłowym UUID

**Query parameters (GET lista):**

- `page` - integer >= 1
- `limit` - integer 1-100
- `sort_order` - enum: 'asc' | 'desc'
- `from` - prawidłowy format ISO8601
- `to` - prawidłowy format ISO8601

**Request body (POST):**

- `value` - wymagane, typ zgodny z `data_type` trackera:
  - `number`/`scale`: musi być liczbą
  - `boolean`: musi być true/false
  - `text`: musi być stringiem
- `recorded_at` - opcjonalne, prawidłowy format ISO8601

**Request body (PATCH):**

- `value` - opcjonalne, typ zgodny z `data_type` trackera
- `recorded_at` - opcjonalne, prawidłowy format ISO8601

**Walidacja biznesowa:**

- Dla typu `scale`: wartość musi być w zakresie min-max z config trackera
- Tracker musi istnieć i nie być usunięty (deleted_at IS NULL)
- Użytkownik musi mieć dostęp do trackera

### 6. Logowanie błędów

Błędy powinny być logowane przez:

- `Logger` z NestJS (już używany w `TrackersService`)
- `GlobalExceptionFilter` (już zaimplementowany)

Poziomy logowania:

- `error` - błędy bazy danych, nieoczekiwane wyjątki
- `warn` - błędy autoryzacji, walidacji
- `log` - operacje CRUD (tworzenie, aktualizacja, usunięcie)

### 7. Potencjalne zagrożenia bezpieczeństwa

1. **IDOR (Insecure Direct Object Reference)** - użytkownik może próbować uzyskać dostęp do wpisów innych użytkowników
   - Mitygacja: sprawdzenie dostępu do trackera przed każdą operacją

2. **Mass Assignment** - nadpisanie pól, które nie powinny być modyfikowane
   - Mitygacja: whitelist pól w DTO

3. **SQL Injection** - przez parametry zapytania
   - Mitygacja: parametryzowane zapytania Supabase, walidacja UUID

4. **Data tampering** - modyfikacja `user_id` lub `tracker_id` w request body
   - Mitygacja: pobieranie `user_id` z JWT, `tracker_id` z path param

5. **Rate limiting** - nadmierne zapytania
   - Mitygacja: @nestjs/throttler (do implementacji globalnie)

### 8. Scenariusze błędów i kody statusu

| Scenariusz                        | Kod | Komunikat                                      |
| --------------------------------- | --- | ---------------------------------------------- |
| Brak/nieprawidłowy token JWT      | 401 | Unauthorized                                   |
| Token wygasł                      | 401 | Token expired                                  |
| Tracker nie istnieje              | 404 | Tracker not found                              |
| Entry nie istnieje                | 404 | Entry not found                                |
| Brak dostępu do trackera          | 403 | Access denied to this tracker                  |
| Użytkownik nie jest autorem wpisu | 403 | Only entry author can modify/delete this entry |
| Nieprawidłowy format UUID         | 400 | Invalid tracker/entry ID format                |
| Nieprawidłowe query params        | 400 | Invalid query parameters                       |
| Wartość niezgodna z data_type     | 422 | Value doesn't match tracker's data_type        |
| Wartość scale poza zakresem       | 422 | Value must be between {min} and {max}          |
| Błąd bazy danych                  | 500 | Internal server error                          |

</analysis>

---

## 1. Przegląd punktu końcowego

Entry Endpoints umożliwiają zarządzanie wpisami (pomiarami) dla trackerów użytkownika. Endpointy obsługują pełny cykl CRUD z uwzględnieniem:

- Normalizacji wartości w zależności od typu danych trackera (`number`, `scale`, `boolean`, `text`)
- Paginacji i filtrowania po zakresie dat
- Kontroli dostępu na poziomie trackera (właściciel lub współdzielenie)
- Kontroli autorstwa przy modyfikacji/usuwaniu wpisów
- Soft delete dla zachowania historii danych

## 2. Szczegóły żądania

### GET /api/trackers/:trackerId/entries

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/trackers/:trackerId/entries`
- **Parametry:**
  - **Wymagane:**
    - `trackerId` (path) - UUID trackera
  - **Opcjonalne (query):**
    - `page` - numer strony (default: 1, min: 1)
    - `limit` - elementów na stronę (default: 50, min: 1, max: 100)
    - `sort_order` - kierunek sortowania: `asc` | `desc` (default: desc)
    - `from` - data początkowa (ISO8601)
    - `to` - data końcowa (ISO8601)

### GET /api/trackers/:trackerId/entries/:entryId

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/trackers/:trackerId/entries/:entryId`
- **Parametry:**
  - **Wymagane:**
    - `trackerId` (path) - UUID trackera
    - `entryId` (path) - UUID wpisu

### POST /api/trackers/:trackerId/entries

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/trackers/:trackerId/entries`
- **Parametry:**
  - **Wymagane:**
    - `trackerId` (path) - UUID trackera
- **Request Body:**
  ```json
  {
    "value": "number | boolean | string (wymagane)",
    "recorded_at": "ISO8601 (opcjonalne, default: now)"
  }
  ```

### PATCH /api/trackers/:trackerId/entries/:entryId

- **Metoda HTTP:** PATCH
- **Struktura URL:** `/api/trackers/:trackerId/entries/:entryId`
- **Parametry:**
  - **Wymagane:**
    - `trackerId` (path) - UUID trackera
    - `entryId` (path) - UUID wpisu
- **Request Body:**
  ```json
  {
    "value": "number | boolean | string (opcjonalne)",
    "recorded_at": "ISO8601 (opcjonalne)"
  }
  ```

### DELETE /api/trackers/:trackerId/entries/:entryId

- **Metoda HTTP:** DELETE
- **Struktura URL:** `/api/trackers/:trackerId/entries/:entryId`
- **Parametry:**
  - **Wymagane:**
    - `trackerId` (path) - UUID trackera
    - `entryId` (path) - UUID wpisu

## 3. Wykorzystywane typy

### Istniejące typy z `@kipio/shared` (packages/shared/src/types.ts)

```typescript
// Typ wartości wpisu
export type EntryValue = number | boolean | string;

// Odpowiedź pojedynczego wpisu
export interface EntryResponseDto {
  id: string;
  tracker_id: string;
  user_id: string;
  value: EntryValue;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

// Odpowiedź listy z paginacją
export type EntryListResponseDto = PaginatedResponseDto<EntryResponseDto>;

// Komenda tworzenia wpisu
export interface CreateEntryCommand {
  value: EntryValue;
  recorded_at?: string;
}

// Komenda aktualizacji wpisu
export interface UpdateEntryCommand {
  value?: EntryValue;
  recorded_at?: string;
}

// Parametry zapytania listy
export interface EntryListQueryDto {
  page?: number;
  limit?: number;
  sort_order?: SortOrder;
  from?: string;
  to?: string;
}

// Kierunek sortowania
export const SortOrder = {
  ASC: 'asc',
  DESC: 'desc',
} as const;
```

### Nowe DTO do stworzenia (NestJS class-validator)

```typescript
// apps/api/src/entries/dto/entry-query.dto.ts
export class EntryQueryDto implements EntryListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

// apps/api/src/entries/dto/create-entry.dto.ts
export class CreateEntryDto implements CreateEntryCommand {
  @IsDefined()
  value: number | boolean | string;

  @IsOptional()
  @IsISO8601()
  recorded_at?: string;
}

// apps/api/src/entries/dto/update-entry.dto.ts
export class UpdateEntryDto implements UpdateEntryCommand {
  @IsOptional()
  value?: number | boolean | string;

  @IsOptional()
  @IsISO8601()
  recorded_at?: string;
}

// apps/api/src/entries/dto/entry-params.dto.ts
export class TrackerParamDto {
  @IsUUID()
  trackerId: string;
}

export class EntryParamsDto extends TrackerParamDto {
  @IsUUID()
  entryId: string;
}
```

## 4. Szczegóły odpowiedzi

### GET /api/trackers/:trackerId/entries

**Status 200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "tracker_id": "uuid",
      "user_id": "uuid",
      "value": 75.5,
      "recorded_at": "2026-01-23T08:00:00Z",
      "created_at": "2026-01-23T08:00:00Z",
      "updated_at": "2026-01-23T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_items": 150,
    "total_pages": 3
  }
}
```

### GET /api/trackers/:trackerId/entries/:entryId, POST, PATCH

**Status 200 OK / 201 Created:**

```json
{
  "id": "uuid",
  "tracker_id": "uuid",
  "user_id": "uuid",
  "value": 75.5,
  "recorded_at": "2026-01-23T08:00:00Z",
  "created_at": "2026-01-23T08:00:00Z",
  "updated_at": "2026-01-23T08:00:00Z"
}
```

### DELETE /api/trackers/:trackerId/entries/:entryId

**Status 204 No Content** - brak ciała odpowiedzi

### Odpowiedzi błędów

```json
{
  "statusCode": 400,
  "message": "Invalid query parameters",
  "error": "Bad Request",
  "details": [
    { "field": "limit", "message": "limit must not be greater than 100" }
  ],
  "timestamp": "2026-01-23T08:00:00Z",
  "path": "/api/trackers/uuid/entries"
}
```

## 5. Przepływ danych

### Diagram przepływu dla POST /api/trackers/:trackerId/entries

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client    │────▶│ EntriesController│────▶│  EntriesService │
│             │     │                 │     │                 │
└─────────────┘     └─────────────────┘     └─────────────────┘
                            │                       │
                            ▼                       ▼
                    ┌───────────────┐       ┌───────────────┐
                    │  JwtAuthGuard │       │ SupabaseService│
                    │  (walidacja   │       │ (baza danych) │
                    │   tokena)     │       │               │
                    └───────────────┘       └───────────────┘
```

### Szczegółowy przepływ dla POST (tworzenie wpisu):

1. **Request** → Controller
   - JWT Guard weryfikuje token
   - Decorator `@CurrentUser()` wyciąga `userId` z tokena
   - ValidationPipe waliduje `trackerId` (UUID) i body (`CreateEntryDto`)

2. **Controller** → Service (`create`)
   - Przekazuje: `trackerId`, `userId`, `createEntryDto`

3. **Service** - walidacja dostępu:
   - Pobiera tracker z bazy (z `data_type`)
   - Sprawdza czy tracker istnieje i nie jest usunięty
   - Sprawdza czy użytkownik ma dostęp (właściciel lub tracker_shares z permission 'write')

4. **Service** - walidacja wartości:
   - Sprawdza zgodność typu `value` z `data_type` trackera
   - Dla typu `scale`: sprawdza czy wartość mieści się w zakresie min-max

5. **Service** - zapis do bazy:
   - Mapuje `value` na odpowiednią kolumnę (`value_number`, `value_boolean`, `value_text`)
   - Wstawia rekord do tabeli `entries`
   - Pobiera utworzony rekord

6. **Service** - normalizacja odpowiedzi:
   - Mapuje kolumny wartości z powrotem na pole `value`
   - Usuwa `deleted_at` z odpowiedzi
   - Zwraca `EntryResponseDto`

7. **Controller** → Response (201 Created)

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

- Wszystkie endpointy chronione przez `JwtAuthGuard`
- Token JWT z Supabase Auth weryfikowany przez `JwtStrategy`
- `userId` pobierany wyłącznie z tokena JWT (nie z body/params)

### Autoryzacja

**Kontrola dostępu do trackera:**

- Właściciel trackera: `tracker.user_id === userId`
- Współdzielenie: rekord w `tracker_shares` gdzie `shared_with_user_id === userId`
- Dla POST/PATCH: wymagane `permission = 'write'` lub własność trackera

**Kontrola autorstwa wpisu:**

- PATCH/DELETE: `entry.user_id === userId`
- Tylko autor może modyfikować/usuwać wpis

### Walidacja danych

- **UUID validation**: wszystkie ID walidowane jako UUID v4
- **Type validation**: wartość sprawdzana pod kątem zgodności z `data_type` trackera
- **Range validation**: dla typu `scale` sprawdzany zakres min-max
- **ISO8601 validation**: daty w formacie ISO8601
- **Sanitization**: class-transformer automatycznie transformuje typy

### Ochrona przed atakami

| Atak            | Mitygacja                                         |
| --------------- | ------------------------------------------------- |
| IDOR            | Sprawdzenie dostępu do trackera i autorstwa wpisu |
| SQL Injection   | Parametryzowane zapytania Supabase                |
| Mass Assignment | Whitelist pól w DTO                               |
| Rate Limiting   | @nestjs/throttler (konfiguracja globalna)         |

## 7. Obsługa błędów

### Mapowanie błędów na kody HTTP

| Błąd                             | Kod | Komunikat                                                                 |
| -------------------------------- | --- | ------------------------------------------------------------------------- |
| Brak tokena JWT                  | 401 | Unauthorized                                                              |
| Token wygasł                     | 401 | Token expired                                                             |
| Nieprawidłowy token              | 401 | Invalid token                                                             |
| Tracker nie istnieje             | 404 | Tracker not found                                                         |
| Entry nie istnieje               | 404 | Entry not found                                                           |
| Brak dostępu do trackera (read)  | 403 | Access denied to this tracker                                             |
| Brak dostępu do trackera (write) | 403 | Write access denied to this tracker                                       |
| Nie-autor próbuje edytować       | 403 | Only entry author can modify this entry                                   |
| Nie-autor próbuje usunąć         | 403 | Only entry author can delete this entry                                   |
| Nieprawidłowy UUID               | 400 | Invalid tracker ID format / Invalid entry ID format                       |
| Błąd walidacji body              | 400 | Validation failed                                                         |
| Błąd walidacji query             | 400 | Invalid query parameters                                                  |
| Niezgodność typu wartości        | 422 | Value type does not match tracker data_type '{type}'. Expected {expected} |
| Wartość poza zakresem scale      | 422 | Value must be between {min} and {max}                                     |
| Błąd bazy danych                 | 500 | Internal server error                                                     |

### Struktura odpowiedzi błędu

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  details?: ValidationErrorDetail[];
  timestamp: string;
  path: string;
}

interface ValidationErrorDetail {
  field: string;
  message: string;
}
```

### Logowanie błędów

```typescript
// Poziomy logowania
this.logger.error('Database error', { trackerId, userId, error });
this.logger.warn('Access denied', { trackerId, userId });
this.logger.log('Entry created', { entryId, trackerId, userId });
```

## 8. Rozważania dotyczące wydajności

### Indeksy bazodanowe

Wymagane indeksy w tabeli `entries` (do weryfikacji w migracji):

```sql
-- Główny indeks dla listowania wpisów
CREATE INDEX idx_entries_tracker_recorded
ON kipio.entries(tracker_id, recorded_at DESC)
WHERE deleted_at IS NULL;

-- Indeks dla filtrowania po użytkowniku
CREATE INDEX idx_entries_user
ON kipio.entries(user_id)
WHERE deleted_at IS NULL;

-- Indeks złożony dla zapytań z zakresem dat
CREATE INDEX idx_entries_tracker_date_range
ON kipio.entries(tracker_id, recorded_at)
WHERE deleted_at IS NULL;
```

### Optymalizacje zapytań

1. **Paginacja**: użycie `LIMIT` i `OFFSET` z sortowaniem po indeksowanej kolumnie
2. **Filtrowanie soft delete**: `WHERE deleted_at IS NULL` w każdym zapytaniu
3. **Zliczanie total**: osobne zapytanie `COUNT(*)` tylko gdy potrzebne dla paginacji
4. **Select only needed columns**: nie pobierać `deleted_at` w odpowiedziach

### Limity

- Maksymalnie 100 wpisów na stronę (`limit <= 100`)
- Domyślnie 50 wpisów na stronę

### Potencjalne optymalizacje przyszłościowe

- Cursor-based pagination dla dużych zbiorów danych
- Caching listy wpisów (Redis)
- Materialized view dla statystyk

## 9. Etapy wdrożenia

### Krok 1: Utworzenie struktury modułu Entries

Utworzyć strukturę katalogów:

```
apps/api/src/entries/
├── dto/
│   ├── create-entry.dto.ts
│   ├── update-entry.dto.ts
│   ├── entry-query.dto.ts
│   ├── entry-params.dto.ts
│   └── index.ts
├── entries.controller.ts
├── entries.service.ts
├── entries.module.ts
└── index.ts
```

### Krok 2: Implementacja DTO z walidacją

**entry-params.dto.ts:**

```typescript
import { IsUUID } from 'class-validator';

export class TrackerParamDto {
  @IsUUID('4', { message: 'Invalid tracker ID format' })
  trackerId: string;
}

export class EntryParamsDto extends TrackerParamDto {
  @IsUUID('4', { message: 'Invalid entry ID format' })
  entryId: string;
}
```

**entry-query.dto.ts:**

```typescript
import { IsOptional, IsInt, Min, Max, IsIn, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';

export class EntryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must not exceed 100' })
  limit?: number = 50;

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'sort_order must be asc or desc' })
  sort_order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsISO8601({}, { message: 'from must be a valid ISO8601 date' })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'to must be a valid ISO8601 date' })
  to?: string;
}
```

**create-entry.dto.ts:**

```typescript
import { IsDefined, IsOptional, IsISO8601 } from 'class-validator';

export class CreateEntryDto {
  @IsDefined({ message: 'value is required' })
  value: number | boolean | string;

  @IsOptional()
  @IsISO8601({}, { message: 'recorded_at must be a valid ISO8601 date' })
  recorded_at?: string;
}
```

**update-entry.dto.ts:**

```typescript
import { IsOptional, IsISO8601 } from 'class-validator';

export class UpdateEntryDto {
  @IsOptional()
  value?: number | boolean | string;

  @IsOptional()
  @IsISO8601({}, { message: 'recorded_at must be a valid ISO8601 date' })
  recorded_at?: string;
}
```

### Krok 3: Implementacja EntriesService

```typescript
// apps/api/src/entries/entries.service.ts

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService, Tables } from '../supabase';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { EntryQueryDto } from './dto/entry-query.dto';
import type {
  EntryResponseDto,
  EntryListResponseDto,
  EntryValue,
  DataType,
} from '@kipio/shared';

type Entry = Tables<'entries'>;
type Tracker = Tables<'trackers'>;

@Injectable()
export class EntriesService {
  private readonly logger = new Logger(EntriesService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Pobiera listę wpisów dla trackera z paginacją i filtrowaniem
   */
  async findAll(
    trackerId: string,
    userId: string,
    query: EntryQueryDto
  ): Promise<EntryListResponseDto> {
    const supabase = this.supabaseService.getAdminClient();

    // Walidacja dostępu do trackera
    const tracker = await this.validateTrackerAccess(trackerId, userId, 'read');

    const { page = 1, limit = 50, sort_order = 'desc', from, to } = query;
    const offset = (page - 1) * limit;

    // Budowanie zapytania
    let queryBuilder = supabase
      .from('entries')
      .select('*', { count: 'exact' })
      .eq('tracker_id', trackerId)
      .is('deleted_at', null)
      .order('recorded_at', { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1);

    if (from) {
      queryBuilder = queryBuilder.gte('recorded_at', from);
    }
    if (to) {
      queryBuilder = queryBuilder.lte('recorded_at', to);
    }

    const { data: entries, count, error } = await queryBuilder;

    if (error) {
      this.logger.error('Failed to fetch entries', { trackerId, error });
      throw new InternalServerErrorException('Failed to fetch entries');
    }

    const totalItems = count ?? 0;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: (entries || []).map((entry) =>
        this.toResponseDto(entry, tracker.data_type)
      ),
      pagination: {
        page,
        limit,
        total_items: totalItems,
        total_pages: totalPages,
      },
    };
  }

  /**
   * Pobiera pojedynczy wpis
   */
  async findOne(
    trackerId: string,
    entryId: string,
    userId: string
  ): Promise<EntryResponseDto> {
    const tracker = await this.validateTrackerAccess(trackerId, userId, 'read');
    const entry = await this.getEntry(trackerId, entryId);
    return this.toResponseDto(entry, tracker.data_type);
  }

  /**
   * Tworzy nowy wpis
   */
  async create(
    trackerId: string,
    userId: string,
    dto: CreateEntryDto
  ): Promise<EntryResponseDto> {
    const supabase = this.supabaseService.getAdminClient();

    const tracker = await this.validateTrackerAccess(
      trackerId,
      userId,
      'write'
    );
    this.validateValueType(dto.value, tracker.data_type, tracker.config);

    const entryData = {
      tracker_id: trackerId,
      user_id: userId,
      ...this.mapValueToColumns(dto.value, tracker.data_type),
      recorded_at: dto.recorded_at ?? new Date().toISOString(),
    };

    const { data: entry, error } = await supabase
      .from('entries')
      .insert(entryData as never)
      .select()
      .single<Entry>();

    if (error) {
      this.logger.error('Failed to create entry', { trackerId, userId, error });
      throw new InternalServerErrorException('Failed to create entry');
    }

    this.logger.log(`Entry ${entry.id} created for tracker ${trackerId}`);
    return this.toResponseDto(entry, tracker.data_type);
  }

  /**
   * Aktualizuje istniejący wpis
   */
  async update(
    trackerId: string,
    entryId: string,
    userId: string,
    dto: UpdateEntryDto
  ): Promise<EntryResponseDto> {
    const supabase = this.supabaseService.getAdminClient();

    const tracker = await this.validateTrackerAccess(trackerId, userId, 'read');
    const entry = await this.getEntry(trackerId, entryId);

    // Tylko autor może edytować wpis
    if (entry.user_id !== userId) {
      throw new ForbiddenException('Only entry author can modify this entry');
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.value !== undefined) {
      this.validateValueType(dto.value, tracker.data_type, tracker.config);
      Object.assign(
        updateData,
        this.mapValueToColumns(dto.value, tracker.data_type)
      );
    }

    if (dto.recorded_at !== undefined) {
      updateData.recorded_at = dto.recorded_at;
    }

    const { data: updatedEntry, error } = await supabase
      .from('entries')
      .update(updateData as never)
      .eq('id', entryId)
      .select()
      .single<Entry>();

    if (error) {
      this.logger.error('Failed to update entry', { entryId, error });
      throw new InternalServerErrorException('Failed to update entry');
    }

    this.logger.log(`Entry ${entryId} updated`);
    return this.toResponseDto(updatedEntry, tracker.data_type);
  }

  /**
   * Usuwa wpis (soft delete)
   */
  async remove(
    trackerId: string,
    entryId: string,
    userId: string
  ): Promise<void> {
    const supabase = this.supabaseService.getAdminClient();

    await this.validateTrackerAccess(trackerId, userId, 'read');
    const entry = await this.getEntry(trackerId, entryId);

    // Tylko autor może usunąć wpis
    if (entry.user_id !== userId) {
      throw new ForbiddenException('Only entry author can delete this entry');
    }

    const { error } = await supabase
      .from('entries')
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq('id', entryId);

    if (error) {
      this.logger.error('Failed to delete entry', { entryId, error });
      throw new InternalServerErrorException('Failed to delete entry');
    }

    this.logger.log(`Entry ${entryId} deleted (soft)`);
  }

  // ===== Metody prywatne =====

  /**
   * Waliduje dostęp użytkownika do trackera
   */
  private async validateTrackerAccess(
    trackerId: string,
    userId: string,
    permission: 'read' | 'write'
  ): Promise<Tracker> {
    const supabase = this.supabaseService.getAdminClient();

    // Pobierz tracker
    const { data: tracker, error } = await supabase
      .from('trackers')
      .select('*')
      .eq('id', trackerId)
      .is('deleted_at', null)
      .single<Tracker>();

    if (error || !tracker) {
      throw new NotFoundException('Tracker not found');
    }

    // Właściciel ma pełny dostęp
    if (tracker.user_id === userId) {
      return tracker;
    }

    // Sprawdź współdzielenie
    const { data: share } = await supabase
      .from('tracker_shares')
      .select('permission')
      .eq('tracker_id', trackerId)
      .eq('shared_with_user_id', userId)
      .single();

    if (!share) {
      throw new ForbiddenException('Access denied to this tracker');
    }

    if (permission === 'write' && share.permission !== 'write') {
      throw new ForbiddenException('Write access denied to this tracker');
    }

    return tracker;
  }

  /**
   * Pobiera wpis po ID
   */
  private async getEntry(trackerId: string, entryId: string): Promise<Entry> {
    const supabase = this.supabaseService.getAdminClient();

    const { data: entry, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', entryId)
      .eq('tracker_id', trackerId)
      .is('deleted_at', null)
      .single<Entry>();

    if (error || !entry) {
      throw new NotFoundException('Entry not found');
    }

    return entry;
  }

  /**
   * Waliduje zgodność wartości z typem danych trackera
   */
  private validateValueType(
    value: EntryValue,
    dataType: string,
    config: unknown
  ): void {
    switch (dataType) {
      case 'number':
        if (typeof value !== 'number') {
          throw new UnprocessableEntityException(
            `Value type does not match tracker data_type 'number'. Expected number`
          );
        }
        break;

      case 'scale':
        if (typeof value !== 'number') {
          throw new UnprocessableEntityException(
            `Value type does not match tracker data_type 'scale'. Expected number`
          );
        }
        const scaleConfig = config as { min?: number; max?: number } | null;
        if (scaleConfig?.min !== undefined && value < scaleConfig.min) {
          throw new UnprocessableEntityException(
            `Value must be at least ${scaleConfig.min}`
          );
        }
        if (scaleConfig?.max !== undefined && value > scaleConfig.max) {
          throw new UnprocessableEntityException(
            `Value must be at most ${scaleConfig.max}`
          );
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new UnprocessableEntityException(
            `Value type does not match tracker data_type 'boolean'. Expected boolean`
          );
        }
        break;

      case 'text':
        if (typeof value !== 'string') {
          throw new UnprocessableEntityException(
            `Value type does not match tracker data_type 'text'. Expected string`
          );
        }
        break;

      default:
        throw new UnprocessableEntityException(
          `Unknown data_type: ${dataType}`
        );
    }
  }

  /**
   * Mapuje wartość na odpowiednie kolumny bazy danych
   */
  private mapValueToColumns(
    value: EntryValue,
    dataType: string
  ): Partial<Entry> {
    const columns: Partial<Entry> = {
      value_number: null,
      value_boolean: null,
      value_text: null,
    };

    switch (dataType) {
      case 'number':
      case 'scale':
        columns.value_number = value as number;
        break;
      case 'boolean':
        columns.value_boolean = value as boolean;
        break;
      case 'text':
        columns.value_text = value as string;
        break;
    }

    return columns;
  }

  /**
   * Konwertuje encję na DTO odpowiedzi
   */
  private toResponseDto(entry: Entry, dataType: string): EntryResponseDto {
    let value: EntryValue;

    switch (dataType) {
      case 'number':
      case 'scale':
        value = entry.value_number ?? 0;
        break;
      case 'boolean':
        value = entry.value_boolean ?? false;
        break;
      case 'text':
        value = entry.value_text ?? '';
        break;
      default:
        value =
          entry.value_number ?? entry.value_boolean ?? entry.value_text ?? '';
    }

    return {
      id: entry.id,
      tracker_id: entry.tracker_id,
      user_id: entry.user_id,
      value,
      recorded_at: entry.recorded_at,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
    };
  }
}
```

### Krok 4: Implementacja EntriesController

```typescript
// apps/api/src/entries/entries.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { EntryQueryDto } from './dto/entry-query.dto';
import { TrackerParamDto, EntryParamsDto } from './dto/entry-params.dto';
import { JwtAuthGuard, CurrentUser, AuthUser } from '../auth';
import type { EntryResponseDto, EntryListResponseDto } from '@kipio/shared';

@Controller('trackers/:trackerId/entries')
@UseGuards(JwtAuthGuard)
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  /**
   * GET /api/trackers/:trackerId/entries
   * Lista wpisów z paginacją i filtrowaniem
   */
  @Get()
  async findAll(
    @Param() params: TrackerParamDto,
    @Query() query: EntryQueryDto,
    @CurrentUser() user: AuthUser
  ): Promise<EntryListResponseDto> {
    return this.entriesService.findAll(params.trackerId, user.id, query);
  }

  /**
   * GET /api/trackers/:trackerId/entries/:entryId
   * Pojedynczy wpis
   */
  @Get(':entryId')
  async findOne(
    @Param() params: EntryParamsDto,
    @CurrentUser() user: AuthUser
  ): Promise<EntryResponseDto> {
    return this.entriesService.findOne(
      params.trackerId,
      params.entryId,
      user.id
    );
  }

  /**
   * POST /api/trackers/:trackerId/entries
   * Tworzenie wpisu
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param() params: TrackerParamDto,
    @Body() createEntryDto: CreateEntryDto,
    @CurrentUser() user: AuthUser
  ): Promise<EntryResponseDto> {
    return this.entriesService.create(
      params.trackerId,
      user.id,
      createEntryDto
    );
  }

  /**
   * PATCH /api/trackers/:trackerId/entries/:entryId
   * Aktualizacja wpisu
   */
  @Patch(':entryId')
  async update(
    @Param() params: EntryParamsDto,
    @Body() updateEntryDto: UpdateEntryDto,
    @CurrentUser() user: AuthUser
  ): Promise<EntryResponseDto> {
    return this.entriesService.update(
      params.trackerId,
      params.entryId,
      user.id,
      updateEntryDto
    );
  }

  /**
   * DELETE /api/trackers/:trackerId/entries/:entryId
   * Soft delete wpisu
   */
  @Delete(':entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param() params: EntryParamsDto,
    @CurrentUser() user: AuthUser
  ): Promise<void> {
    return this.entriesService.remove(
      params.trackerId,
      params.entryId,
      user.id
    );
  }
}
```

### Krok 5: Implementacja EntriesModule

```typescript
// apps/api/src/entries/entries.module.ts

import { Module } from '@nestjs/common';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';
import { SupabaseModule } from '../supabase';

@Module({
  imports: [SupabaseModule],
  controllers: [EntriesController],
  providers: [EntriesService],
  exports: [EntriesService],
})
export class EntriesModule {}
```

### Krok 6: Rejestracja modułu w AppModule

```typescript
// apps/api/src/app.module.ts
import { EntriesModule } from './entries/entries.module';

@Module({
  imports: [
    // ... existing imports
    EntriesModule,
  ],
})
export class AppModule {}
```

### Krok 7: Utworzenie pliku index.ts dla eksportu

```typescript
// apps/api/src/entries/index.ts
export { EntriesModule } from './entries.module';
export { EntriesService } from './entries.service';
export { EntriesController } from './entries.controller';
export * from './dto';
```

### Krok 8: Testy jednostkowe

Utworzyć pliki testowe:

- `entries.service.spec.ts` - testy serwisu
- `entries.controller.spec.ts` - testy kontrolera
- `dto/*.spec.ts` - testy walidacji DTO

Scenariusze testowe:

1. **findAll**: paginacja, filtrowanie po datach, sortowanie
2. **findOne**: znalezienie wpisu, brak wpisu (404)
3. **create**: tworzenie dla każdego typu danych, walidacja wartości
4. **update**: aktualizacja przez autora, próba przez nie-autora (403)
5. **remove**: soft delete przez autora, próba przez nie-autora (403)
6. **Kontrola dostępu**: właściciel, współdzielenie read/write, brak dostępu

### Krok 9: Weryfikacja indeksów bazodanowych

Sprawdzić i w razie potrzeby dodać migrację z indeksami:

```sql
-- Sprawdzenie istniejących indeksów
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'entries';

-- Dodanie brakujących indeksów (jeśli potrzebne)
CREATE INDEX IF NOT EXISTS idx_entries_tracker_recorded
ON kipio.entries(tracker_id, recorded_at DESC)
WHERE deleted_at IS NULL;
```

### Krok 10: Dokumentacja API

Dodać dokumentację endpointów do pliku `.ai/api-plan.md` lub wygenerować OpenAPI spec przy użyciu `@nestjs/swagger`.
