# API Endpoint Implementation Plan: Trackers Management

## 1. Przegląd punktów końcowych

Moduł Trackers obsługuje zarządzanie metrykami użytkownika (trackerami) i obejmuje następujące operacje:

- **GET /api/trackers** - Lista wszystkich trackerów użytkownika z paginacją, filtrowaniem i sortowaniem
- **GET /api/trackers/:id** - Szczegóły pojedynczego trackera wraz ze statystykami
- **POST /api/trackers** - Tworzenie nowego trackera
- **PATCH /api/trackers/:id** - Aktualizacja istniejącego trackera
- **DELETE /api/trackers/:id** - Usunięcie trackera (soft delete)
- **PATCH /api/trackers/reorder** - Masowa aktualizacja kolejności wyświetlania trackerów

Wszystkie endpointy wymagają uwierzytelnienia przez JWT token z Supabase Auth.

## 2. Szczegóły żądań

### 2.1. GET /api/trackers

**Metoda HTTP:** GET  
**Struktura URL:** `/api/trackers`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parametry:**

- **Wymagane:**
  - Authorization header z JWT token

- **Opcjonalne (query parameters):**
  - `page` (integer, default: 1) - Numer strony
  - `limit` (integer, default: 20, max: 100) - Liczba elementów na stronie
  - `sort_by` (string, default: "display_order") - Pole sortowania: display_order, name, created_at, updated_at
  - `sort_order` (string, default: "asc") - Kierunek sortowania: asc, desc
  - `is_active` (boolean, default: true) - Filtr po statusie aktywności
  - `data_type` (string) - Filtr po typie danych: number, scale, boolean, text
  - `include_shared` (boolean, default: true) - Czy uwzględniać trackery współdzielone

### 2.2. GET /api/trackers/:id

**Metoda HTTP:** GET  
**Struktura URL:** `/api/trackers/:id`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parametry:**

- **Wymagane:**
  - `id` (UUID, path parameter) - ID trackera
  - Authorization header z JWT token

### 2.3. POST /api/trackers

**Metoda HTTP:** POST  
**Struktura URL:** `/api/trackers`

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Parametry:**

- **Wymagane:**
  - `name` (string, max 100 chars) - Nazwa trackera
  - `data_type` (enum: "number" | "scale" | "boolean" | "text") - Typ danych
  - Authorization header z JWT token

- **Opcjonalne:**
  - `unit` (string, max 20 chars) - Jednostka (tylko dla typu "number")
  - `config` (object) - Konfiguracja specyficzna dla typu (np. min/max dla scale)
  - `color` (string, format: #RRGGBB) - Kolor w formacie hex
  - `icon` (string, max 50 chars) - Nazwa ikony
  - `display_order` (integer, default: 0) - Kolejność wyświetlania

**Request Body:**

```json
{
  "name": "Energy Level",
  "data_type": "scale",
  "unit": null,
  "config": { "min": 1, "max": 10 },
  "color": "#4CAF50",
  "icon": "battery",
  "display_order": 2
}
```

### 2.4. PATCH /api/trackers/:id

**Metoda HTTP:** PATCH  
**Struktura URL:** `/api/trackers/:id`

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Parametry:**

- **Wymagane:**
  - `id` (UUID, path parameter) - ID trackera
  - Authorization header z JWT token

- **Opcjonalne (wszystkie pola):**
  - `name` (string, max 100 chars)
  - `unit` (string, max 20 chars)
  - `config` (object)
  - `color` (string, format: #RRGGBB)
  - `icon` (string, max 50 chars)
  - `display_order` (integer)
  - `is_active` (boolean)

**Request Body:**

```json
{
  "name": "Updated Name",
  "unit": "lbs",
  "is_active": true
}
```

**Uwaga:** Pole `data_type` nie może być zmienione po utworzeniu trackera.

### 2.5. DELETE /api/trackers/:id

**Metoda HTTP:** DELETE  
**Struktura URL:** `/api/trackers/:id`

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Parametry:**

- **Wymagane:**
  - `id` (UUID, path parameter) - ID trackera
  - Authorization header z JWT token

### 2.6. PATCH /api/trackers/reorder

**Metoda HTTP:** PATCH  
**Struktura URL:** `/api/trackers/reorder`

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Parametry:**

- **Wymagane:**
  - `order` (array) - Tablica obiektów z id i display_order
  - Authorization header z JWT token

**Request Body:**

```json
{
  "order": [
    { "id": "uuid-1", "display_order": 0 },
    { "id": "uuid-2", "display_order": 1 },
    { "id": "uuid-3", "display_order": 2 }
  ]
}
```

## 3. Wykorzystywane typy

### 3.1. Istniejące typy (z packages/shared/src/types.ts)

**Entities:**

- `TrackerEntity` - Encja trackera z bazy danych

**DTOs:**

- `TrackerListQueryDto` - Query parameters dla GET /api/trackers
- `TrackerListItemDto` - Pojedynczy tracker w liście
- `TrackerListResponseDto` - Response dla GET /api/trackers (PaginatedResponseDto<TrackerListItemDto>)
- `TrackerDetailResponseDto` - Response dla GET /api/trackers/:id
- `TrackerStatsDto` - Statystyki trackera
- `LastEntryDto` - Ostatni wpis trackera
- `PaginationDto` - Metadane paginacji
- `ErrorResponseDto` - Standardowa odpowiedź błędu
- `MessageResponseDto` - Standardowa odpowiedź z komunikatem

**Commands:**

- `CreateTrackerCommand` - Body dla POST /api/trackers
- `UpdateTrackerCommand` - Body dla PATCH /api/trackers/:id
- `ReorderTrackersCommand` - Body dla PATCH /api/trackers/reorder
- `ReorderTrackersResponseDto` - Response dla PATCH /api/trackers/reorder

**Enums:**

- `DataType` - Typ danych trackera (number, scale, boolean, text)
- `TrackerSortBy` - Pole sortowania (display_order, name, created_at, updated_at)
- `SortOrder` - Kierunek sortowania (asc, desc)

**Schemas (Zod):**

- `createTrackerSchema` - Walidacja dla CreateTrackerCommand
- `updateTrackerSchema` - Walidacja dla UpdateTrackerCommand
- `reorderTrackersSchema` - Walidacja dla ReorderTrackersCommand
- `trackerListQuerySchema` - Walidacja dla TrackerListQueryDto

### 3.2. Typy do utworzenia w NestJS

**Internal DTOs (do użycia wewnątrz service):**

```typescript
interface TrackerWithStats extends TrackerEntity {
  stats: TrackerStatsDto;
}

interface TrackerAccessInfo {
  isOwner: boolean;
  sharedPermission: SharePermission | null;
}
```

## 4. Szczegóły odpowiedzi

### 4.1. GET /api/trackers

**Success (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Weight",
      "data_type": "number",
      "unit": "kg",
      "config": {},
      "color": "#FF5733",
      "icon": "scale",
      "display_order": 1,
      "is_active": true,
      "is_owner": true,
      "shared_permission": null,
      "created_at": "2026-01-23T12:00:00Z",
      "updated_at": "2026-01-23T12:00:00Z",
      "last_entry": {
        "value": 75.5,
        "recorded_at": "2026-01-23T08:00:00Z"
      },
      "sparkline_data": [75.2, 75.4, 75.3, 75.5, 75.1, 75.3, 75.5]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 15,
    "total_pages": 1
  }
}
```

**Errors:**

- `401 Unauthorized` - Invalid or missing JWT token
- `400 Bad Request` - Invalid query parameters

### 4.2. GET /api/trackers/:id

**Success (200 OK):**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Weight",
  "data_type": "number",
  "unit": "kg",
  "config": {},
  "color": "#FF5733",
  "icon": "scale",
  "display_order": 1,
  "is_active": true,
  "is_owner": true,
  "shared_permission": null,
  "created_at": "2026-01-23T12:00:00Z",
  "updated_at": "2026-01-23T12:00:00Z",
  "stats": {
    "total_entries": 150,
    "first_entry_at": "2025-06-01T10:00:00Z",
    "last_entry_at": "2026-01-23T08:00:00Z"
  }
}
```

**Errors:**

- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User doesn't have access to this tracker
- `404 Not Found` - Tracker not found or deleted

### 4.3. POST /api/trackers

**Success (201 Created):**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Energy Level",
  "data_type": "scale",
  "unit": null,
  "config": { "min": 1, "max": 10 },
  "color": "#4CAF50",
  "icon": "battery",
  "display_order": 2,
  "is_active": true,
  "created_at": "2026-01-23T12:00:00Z",
  "updated_at": "2026-01-23T12:00:00Z"
}
```

**Errors:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - Tracker limit reached
- `422 Unprocessable Entity` - Validation errors (invalid hex color, config mismatch)

### 4.4. PATCH /api/trackers/:id

**Success (200 OK):**

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Updated Name",
  "data_type": "number",
  "unit": "lbs",
  "config": {},
  "color": "#FF5733",
  "icon": "scale",
  "display_order": 1,
  "is_active": true,
  "created_at": "2026-01-23T12:00:00Z",
  "updated_at": "2026-01-23T14:00:00Z"
}
```

**Errors:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User is not the owner of this tracker
- `404 Not Found` - Tracker not found or deleted
- `422 Unprocessable Entity` - Validation errors

### 4.5. DELETE /api/trackers/:id

**Success (204 No Content)**

**Errors:**

- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User is not the owner of this tracker
- `404 Not Found` - Tracker not found

### 4.6. PATCH /api/trackers/reorder

**Success (200 OK):**

```json
{
  "message": "Tracker order updated successfully",
  "updated_count": 3
}
```

**Errors:**

- `400 Bad Request` - Invalid request body
- `401 Unauthorized` - Invalid or missing JWT token
- `403 Forbidden` - User doesn't own one or more trackers

## 5. Przepływ danych

### 5.1. GET /api/trackers

```
1. Request → TrackersController.findAll(query, user)
2. Controller → Walidacja query przez ValidationPipe (TrackerListQueryDto)
3. Controller → TrackersService.findAll(user.id, query)
4. Service → TypeORM query builder:
   a. SELECT trackers WHERE user_id = :userId OR id IN (shared trackers)
   b. Filtrowanie: is_active, data_type
   c. Sortowanie: sort_by, sort_order
   d. Paginacja: LIMIT, OFFSET
5. Service → Dla każdego trackera:
   a. Sprawdzenie is_owner vs shared_permission
   b. Pobranie ostatniego wpisu (EntriesService.getLastEntry)
   c. Pobranie danych sparkline (EntriesService.getSparklineData)
6. Service → Zwrócenie TrackerListResponseDto
7. Controller → Response 200 z paginacją
```

### 5.2. GET /api/trackers/:id

```
1. Request → TrackersController.findOne(id, user)
2. Controller → TrackersService.findOne(id, user.id)
3. Service → TypeORM query:
   a. SELECT tracker WHERE id = :id AND deleted_at IS NULL
   b. LEFT JOIN tracker_shares dla sprawdzenia dostępu
4. Service → Sprawdzenie uprawnień:
   a. Jeśli user_id = tracker.user_id → is_owner = true
   b. Jeśli istnieje share → shared_permission = share.permission
   c. Jeśli brak dostępu → throw ForbiddenException
5. Service → Pobranie statystyk (calculateStats):
   a. COUNT entries WHERE tracker_id = :id
   b. MIN/MAX recorded_at
6. Service → Zwrócenie TrackerDetailResponseDto
7. Controller → Response 200
```

### 5.3. POST /api/trackers

```
1. Request → TrackersController.create(command, user)
2. Controller → Walidacja body przez ValidationPipe (CreateTrackerCommand)
3. Controller → TrackersService.create(user.id, command)
4. Service → Sprawdzenie limitu:
   a. SELECT COUNT(*) FROM trackers WHERE user_id = :userId AND deleted_at IS NULL
   b. SELECT trackers_limit FROM profiles WHERE id = :userId
   c. Jeśli count >= limit → throw ForbiddenException
5. Service → Walidacja biznesowa:
   a. Jeśli data_type != 'number' i unit != null → throw BadRequestException
   b. Jeśli data_type = 'scale' i brak config.min/max → throw BadRequestException
   c. Jeśli color i nie pasuje do regex → throw UnprocessableEntityException
6. Service → TypeORM insert:
   a. INSERT INTO trackers (user_id, name, data_type, ...)
   b. Automatyczne ustawienie created_at, updated_at przez trigger
7. Service → Zwrócenie TrackerEntity (bez deleted_at)
8. Controller → Response 201
```

### 5.4. PATCH /api/trackers/:id

```
1. Request → TrackersController.update(id, command, user)
2. Controller → Walidacja body przez ValidationPipe (UpdateTrackerCommand)
3. Controller → TrackersService.update(id, user.id, command)
4. Service → Pobranie trackera:
   a. SELECT * FROM trackers WHERE id = :id AND deleted_at IS NULL
   b. Jeśli nie znaleziono → throw NotFoundException
5. Service → Sprawdzenie ownership:
   a. Jeśli tracker.user_id != user.id → throw ForbiddenException
6. Service → Walidacja biznesowa (jak w POST)
7. Service → TypeORM update:
   a. UPDATE trackers SET ... WHERE id = :id
   b. Automatyczne ustawienie updated_at przez trigger
8. Service → Zwrócenie zaktualizowanego TrackerEntity
9. Controller → Response 200
```

### 5.5. DELETE /api/trackers/:id

```
1. Request → TrackersController.remove(id, user)
2. Controller → TrackersService.remove(id, user.id)
3. Service → Pobranie trackera (jak w PATCH)
4. Service → Sprawdzenie ownership (jak w PATCH)
5. Service → TypeORM soft delete:
   a. UPDATE trackers SET deleted_at = NOW() WHERE id = :id
   b. Soft delete kaskaduje na entries i tracker_shares przez RLS/triggers
6. Service → void (brak zwrotu)
7. Controller → Response 204
```

### 5.6. PATCH /api/trackers/reorder

```
1. Request → TrackersController.reorder(command, user)
2. Controller → Walidacja body przez ValidationPipe (ReorderTrackersCommand)
3. Controller → TrackersService.reorder(user.id, command)
4. Service → Pobranie wszystkich trackerów z command.order:
   a. SELECT * FROM trackers WHERE id IN (:ids) AND deleted_at IS NULL
5. Service → Sprawdzenie ownership dla każdego:
   a. Dla każdego trackera: jeśli user_id != :userId → throw ForbiddenException
6. Service → TypeORM transaction:
   a. Dla każdego elementu w command.order:
      UPDATE trackers SET display_order = :order WHERE id = :id
7. Service → Zwrócenie { message, updated_count }
8. Controller → Response 200
```

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie

- **JWT Guard:** Wszystkie endpointy zabezpieczone przez `@UseGuards(JwtAuthGuard)`
- **Token Validation:** Passport.js waliduje JWT token z Supabase Auth używając public key
- **User Extraction:** Guard wyciąga user.id z JWT payload i dodaje do request.user
- **Token Expiry:** Sprawdzenie exp claim w JWT

### 6.2. Autoryzacja

- **Ownership Check:** W każdej operacji CUD sprawdzamy czy tracker.user_id === user.id
- **Share Permissions:** W GET endpoints sprawdzamy dostęp przez tracker_shares
- **Read vs Write:** Shared trackers z permission="read" nie mogą być edytowane
- **RLS (Row Level Security):** Supabase RLS jako dodatkowa warstwa (backup)

### 6.3. Walidacja danych

- **DTO Validation:** class-validator na wszystkich DTO
- **Enum Validation:** data_type, sort_by, sort_order walidowane przez IsEnum
- **String Length:** @MaxLength() na name, unit, icon
- **Regex Validation:** color walidowany przez @Matches(/^#[0-9A-Fa-f]{6}$/)
- **Integer Validation:** @IsInt() na display_order, page, limit
- **Config Validation:** Custom validator dla zgodności config z data_type
- **UUID Validation:** @IsUUID() na wszystkich id

### 6.4. Zapobieganie atakom

- **SQL Injection:** TypeORM używa parametryzowanych queries
- **NoSQL Injection:** Walidacja JSONB config przed zapisem
- **Mass Assignment:** DTO definiują tylko dozwolone pola
- **XSS:** Sanityzacja name, unit, icon przed zapisem (opcjonalnie)
- **Rate Limiting:** @nestjs/throttler na poziomie kontrolera
- **CORS:** Konfiguracja CORS w main.ts

### 6.5. Ochrona danych

- **Soft Delete:** deleted_at zamiast fizycznego usunięcia
- **No Sensitive Data:** Nie zwracamy deleted_at w response
- **User Isolation:** Zawsze filtrowanie po user_id
- **Token Hashing:** API tokens hashowane przed zapisem (dla przyszłych webhook endpoints)

### 6.6. Limity

- **Trackers Limit:** Sprawdzenie profiles.trackers_limit przed utworzeniem
- **Pagination Limit:** Max 100 items per page
- **API Rate Limit:** profiles.api_requests_per_hour (dla przyszłości)

## 7. Obsługa błędów

### 7.1. Kody statusu i scenariusze

**400 Bad Request:**

- Invalid query parameters (np. limit > 100)
- Invalid request body structure
- Invalid enum values
- Próba ustawienia unit dla data_type != 'number'
- Brak config.min/max dla data_type = 'scale'

**401 Unauthorized:**

- Brak Authorization header
- Invalid JWT token format
- JWT token expired
- JWT signature verification failed

**403 Forbidden:**

- Tracker limit reached (na POST)
- User is not owner (na PATCH, DELETE)
- Shared tracker with read-only permission (na PATCH)
- User doesn't own all trackers (na reorder)

**404 Not Found:**

- Tracker not found by id
- Tracker soft deleted (deleted_at IS NOT NULL)
- Target user not found (w share endpoints, przyszłość)

**422 Unprocessable Entity:**

- Validation errors:
  - Invalid hex color format
  - config mismatch with data_type
  - name too long (> 100 chars)
  - unit too long (> 20 chars)
  - icon too long (> 50 chars)
  - display_order not an integer

**500 Internal Server Error:**

- Database connection error
- Unexpected TypeORM error
- Transaction rollback failure
- Trigger execution error

### 7.2. Struktura odpowiedzi błędów

Zgodnie z `ErrorResponseDto`:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-01-23T12:00:00Z",
  "path": "/api/trackers",
  "details": [
    {
      "field": "color",
      "message": "color must match /^#[0-9A-Fa-f]{6}$/ regular expression"
    }
  ]
}
```

### 7.3. Exception Filters

```typescript
// Globalne exception filters w main.ts
app.useGlobalFilters(new HttpExceptionFilter());

// HttpExceptionFilter:
// - Łapie wszystkie HttpException
// - Formatuje do ErrorResponseDto
// - Loguje błędy >= 500 jako ERROR
// - Loguje błędy < 500 jako WARN
// - Dodaje timestamp i path
```

### 7.4. Error Logging

```typescript
// W service methods:
try {
  // Business logic
} catch (error) {
  this.logger.error(`Failed to create tracker: ${error.message}`, error.stack);

  if (error instanceof QueryFailedError) {
    throw new InternalServerErrorException('Database error occurred');
  }

  throw error; // Re-throw known exceptions
}
```

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła

**Database Queries:**

- N+1 problem przy pobieraniu last_entry i sparkline_data dla każdego trackera
- Brak indeksów na kolumnach sortowania
- Brak indeksów na kolumnach filtrowania (is_active, data_type)
- Pełne skanowanie tabeli przy COUNT(\*)

**Memory:**

- Ładowanie wszystkich trackerów do pamięci przed paginacją
- Duże payloady przy include_shared=true i wielu shareach

**Network:**

- Brak kompresji odpowiedzi
- Brak cache headers

### 8.2. Strategie optymalizacji

**Indexing:**

```sql
-- Indeksy do utworzenia w migracji
CREATE INDEX idx_trackers_user_id_active ON kipio.trackers(user_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_trackers_data_type ON kipio.trackers(data_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_trackers_display_order ON kipio.trackers(display_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_tracker_shares_user ON kipio.tracker_shares(shared_with_user_id);
CREATE INDEX idx_entries_tracker_recorded ON kipio.entries(tracker_id, recorded_at DESC) WHERE deleted_at IS NULL;
```

**Query Optimization:**

```typescript
// Używanie QueryBuilder z JOIN zamiast N+1
const trackers = await this.trackersRepository
  .createQueryBuilder('tracker')
  .leftJoin('tracker.entries', 'entry')
  .addSelect('MAX(entry.recorded_at)', 'last_entry_at')
  .where('tracker.user_id = :userId', { userId })
  .andWhere('tracker.deleted_at IS NULL')
  .groupBy('tracker.id')
  .skip((page - 1) * limit)
  .take(limit)
  .getManyAndCount();

// Dla sparkline: osobne query z LIMIT 7 ORDER BY recorded_at DESC
```

**Caching:**

```typescript
// Cache dla często odpytywanych trackerów
@UseInterceptors(CacheInterceptor)
@CacheTTL(60) // 60 sekund
async findOne(id: string, userId: string) {
  // ...
}

// Cache key: `tracker:${userId}:${id}`
```

**Pagination:**

```typescript
// Cursor-based pagination dla dużych zbiorów (przyszłość)
// Zamiast OFFSET użyć WHERE id > :cursor
```

**Compression:**

```typescript
// W main.ts
app.use(compression());
```

**Lazy Loading:**

```typescript
// Nie ładować sparkline_data domyślnie, tylko na żądanie
// Dodać query param: include_sparkline=true
```

**Database Connection Pool:**

```typescript
// W ormconfig.ts
{
  type: 'postgres',
  // ...
  extra: {
    max: 20, // Max connections
    min: 5,  // Min connections
    idle: 10000 // Idle timeout
  }
}
```

**Partial Response:**

```typescript
// Dodać query param: fields=id,name,data_type
// Zwracać tylko wybrane pola
```

### 8.3. Monitoring

```typescript
// Interceptor do mierzenia czasu odpowiedzi
@UseInterceptors(LoggingInterceptor)
// LoggingInterceptor loguje:
// - Request method, URL, user_id
// - Response time
// - Response status code
// - Query count (liczba DB queries)
```

## 9. Etapy wdrożenia

### Etap 1: Przygotowanie struktury modułu (NestJS)

1. **Utworzenie modułu Trackers:**

   ```bash
   nest g module trackers
   nest g controller trackers
   nest g service trackers
   ```

2. **Utworzenie DTOs w NestJS:**
   - `src/trackers/dto/tracker-list-query.dto.ts` - extends TrackerListQueryDto from @kipio/shared
   - `src/trackers/dto/create-tracker.dto.ts` - extends CreateTrackerCommand from @kipio/shared
   - `src/trackers/dto/update-tracker.dto.ts` - extends UpdateTrackerCommand from @kipio/shared
   - `src/trackers/dto/reorder-trackers.dto.ts` - extends ReorderTrackersCommand from @kipio/shared

3. **Dodanie class-validator decorators do DTOs:**
   - Import Zod schemas z @kipio/shared
   - Użycie ZodValidationPipe lub konwersja na class-validator

4. **Utworzenie Entity dla TypeORM:**
   - `src/trackers/entities/tracker.entity.ts` - mapowanie na tabelę kipio.trackers
   - `src/trackers/entities/tracker-share.entity.ts` - mapowanie na tabelę kipio.tracker_shares

### Etap 2: Implementacja TrackersService

1. **Podstawowe metody CRUD:**

   ```typescript
   // src/trackers/trackers.service.ts

   async findAll(userId: string, query: TrackerListQueryDto): Promise<TrackerListResponseDto>
   async findOne(id: string, userId: string): Promise<TrackerDetailResponseDto>
   async create(userId: string, command: CreateTrackerCommand): Promise<TrackerEntity>
   async update(id: string, userId: string, command: UpdateTrackerCommand): Promise<TrackerEntity>
   async remove(id: string, userId: string): Promise<void>
   async reorder(userId: string, command: ReorderTrackersCommand): Promise<ReorderTrackersResponseDto>
   ```

2. **Metody pomocnicze:**

   ```typescript
   private async checkOwnership(trackerId: string, userId: string): Promise<TrackerEntity>
   private async checkTrackerLimit(userId: string): Promise<void>
   private async calculateStats(trackerId: string): Promise<TrackerStatsDto>
   private async getLastEntry(trackerId: string): Promise<LastEntryDto | null>
   private async getSparklineData(trackerId: string): Promise<number[]>
   private async checkAccess(trackerId: string, userId: string): Promise<TrackerAccessInfo>
   ```

3. **Walidacja biznesowa:**
   ```typescript
   private validateTrackerConfig(dataType: DataType, config: TrackerConfig, unit?: string): void
   private validateColorFormat(color?: string): void
   ```

### Etap 3: Implementacja TrackersController

1. **Endpoints GET:**

   ```typescript
   @Get()
   @UseGuards(JwtAuthGuard)
   async findAll(@Query() query: TrackerListQueryDto, @CurrentUser() user): Promise<TrackerListResponseDto>

   @Get(':id')
   @UseGuards(JwtAuthGuard)
   async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user): Promise<TrackerDetailResponseDto>
   ```

2. **Endpoints CUD:**

   ```typescript
   @Post()
   @UseGuards(JwtAuthGuard)
   @HttpCode(HttpStatus.CREATED)
   async create(@Body() command: CreateTrackerDto, @CurrentUser() user): Promise<TrackerEntity>

   @Patch(':id')
   @UseGuards(JwtAuthGuard)
   async update(@Param('id', ParseUUIDPipe) id: string, @Body() command: UpdateTrackerDto, @CurrentUser() user): Promise<TrackerEntity>

   @Delete(':id')
   @UseGuards(JwtAuthGuard)
   @HttpCode(HttpStatus.NO_CONTENT)
   async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user): Promise<void>
   ```

3. **Endpoint reorder:**
   ```typescript
   @Patch('reorder')
   @UseGuards(JwtAuthGuard)
   async reorder(@Body() command: ReorderTrackersDto, @CurrentUser() user): Promise<ReorderTrackersResponseDto>
   ```

### Etap 4: Konfiguracja Guards i Decorators

1. **JWT Auth Guard:**

   ```typescript
   // src/auth/guards/jwt-auth.guard.ts
   @Injectable()
   export class JwtAuthGuard extends AuthGuard('jwt') {
     handleRequest(err, user, info) {
       if (err || !user) {
         throw new UnauthorizedException('Invalid or missing JWT token');
       }
       return user;
     }
   }
   ```

2. **CurrentUser Decorator:**

   ```typescript
   // src/auth/decorators/current-user.decorator.ts
   export const CurrentUser = createParamDecorator(
     (data: unknown, ctx: ExecutionContext) => {
       const request = ctx.switchToHttp().getRequest();
       return request.user;
     }
   );
   ```

3. **JWT Strategy:**

   ```typescript
   // src/auth/strategies/jwt.strategy.ts
   @Injectable()
   export class JwtStrategy extends PassportStrategy(Strategy) {
     constructor() {
       super({
         jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
         secretOrKey: process.env.SUPABASE_JWT_SECRET,
       });
     }

     async validate(payload: any) {
       return { id: payload.sub, email: payload.email };
     }
   }
   ```

### Etap 5: TypeORM Entities i Repository

1. **Tracker Entity:**

   ```typescript
   @Entity({ schema: 'kipio', name: 'trackers' })
   export class Tracker {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     @Column({ name: 'user_id' })
     userId: string;

     @Column({ length: 100 })
     name: string;

     @Column({ name: 'data_type', type: 'text' })
     dataType: DataType;

     @Column({ nullable: true, length: 20 })
     unit?: string;

     @Column({ type: 'jsonb', default: {} })
     config: TrackerConfig;

     @Column({ nullable: true, length: 7 })
     color?: string;

     @Column({ nullable: true, length: 50 })
     icon?: string;

     @Column({ name: 'display_order', default: 0 })
     displayOrder: number;

     @Column({ name: 'is_active', default: true })
     isActive: boolean;

     @CreateDateColumn({ name: 'created_at' })
     createdAt: Date;

     @UpdateDateColumn({ name: 'updated_at' })
     updatedAt: Date;

     @Column({ name: 'deleted_at', nullable: true })
     deletedAt?: Date;

     @OneToMany(() => Entry, (entry) => entry.tracker)
     entries: Entry[];

     @OneToMany(() => TrackerShare, (share) => share.tracker)
     shares: TrackerShare[];
   }
   ```

2. **TrackerShare Entity:**

   ```typescript
   @Entity({ schema: 'kipio', name: 'tracker_shares' })
   export class TrackerShare {
     @PrimaryGeneratedColumn('uuid')
     id: string;

     @Column({ name: 'tracker_id' })
     trackerId: string;

     @ManyToOne(() => Tracker, (tracker) => tracker.shares)
     @JoinColumn({ name: 'tracker_id' })
     tracker: Tracker;

     @Column({ name: 'shared_with_user_id' })
     sharedWithUserId: string;

     @Column({ type: 'text', default: 'read' })
     permission: SharePermission;

     @CreateDateColumn({ name: 'created_at' })
     createdAt: Date;

     @Column({ name: 'created_by' })
     createdBy: string;
   }
   ```

### Etap 6: Exception Filters i Error Handling

1. **HTTP Exception Filter:**

   ```typescript
   @Catch(HttpException)
   export class HttpExceptionFilter implements ExceptionFilter {
     private readonly logger = new Logger(HttpExceptionFilter.name);

     catch(exception: HttpException, host: ArgumentsHost) {
       const ctx = host.switchToHttp();
       const response = ctx.getResponse<Response>();
       const request = ctx.getRequest<Request>();
       const status = exception.getStatus();

       const errorResponse: ErrorResponseDto = {
         statusCode: status,
         message: exception.message,
         error: exception.name,
         timestamp: new Date().toISOString(),
         path: request.url,
         details: this.extractValidationErrors(exception),
       };

       if (status >= 500) {
         this.logger.error(`${request.method} ${request.url}`, exception.stack);
       } else {
         this.logger.warn(
           `${request.method} ${request.url} - ${exception.message}`
         );
       }

       response.status(status).json(errorResponse);
     }

     private extractValidationErrors(
       exception: HttpException
     ): ValidationErrorDetailDto[] {
       const response = exception.getResponse();
       if (typeof response === 'object' && 'message' in response) {
         // Extract class-validator errors
       }
       return [];
     }
   }
   ```

2. **Rejestracja w main.ts:**
   ```typescript
   app.useGlobalFilters(new HttpExceptionFilter());
   ```

### Etap 7: Validatory i Pipes

1. **Zod Validation Pipe (opcjonalnie):**

   ```typescript
   @Injectable()
   export class ZodValidationPipe implements PipeTransform {
     constructor(private schema: ZodSchema) {}

     transform(value: any) {
       try {
         return this.schema.parse(value);
       } catch (error) {
         throw new BadRequestException('Validation failed');
       }
     }
   }
   ```

2. **Custom Config Validator:**

   ```typescript
   @ValidatorConstraint({ name: 'trackerConfig', async: false })
   export class IsValidTrackerConfig implements ValidatorConstraintInterface {
     validate(config: any, args: ValidationArguments) {
       const dataType = (args.object as any).data_type;

       if (dataType === 'scale') {
         return (
           config &&
           typeof config.min === 'number' &&
           typeof config.max === 'number'
         );
       }

       return true;
     }

     defaultMessage(args: ValidationArguments) {
       return 'Config must contain min and max for scale type';
     }
   }
   ```

### Etap 8: Testy jednostkowe

1. **TrackersService tests:**

   ```typescript
   describe('TrackersService', () => {
     let service: TrackersService;
     let repository: Repository<Tracker>;

     beforeEach(async () => {
       const module = await Test.createTestingModule({
         providers: [
           TrackersService,
           {
             provide: getRepositoryToken(Tracker),
             useClass: Repository,
           },
         ],
       }).compile();

       service = module.get<TrackersService>(TrackersService);
       repository = module.get<Repository<Tracker>>(
         getRepositoryToken(Tracker)
       );
     });

     it('should create a tracker', async () => {
       // Test implementation
     });

     it('should throw ForbiddenException when limit reached', async () => {
       // Test implementation
     });

     // More tests...
   });
   ```

2. **TrackersController tests:**

   ```typescript
   describe('TrackersController', () => {
     let controller: TrackersController;
     let service: TrackersService;

     beforeEach(async () => {
       const module = await Test.createTestingModule({
         controllers: [TrackersController],
         providers: [
           {
             provide: TrackersService,
             useValue: {
               findAll: jest.fn(),
               findOne: jest.fn(),
               create: jest.fn(),
               // ...
             },
           },
         ],
       }).compile();

       controller = module.get<TrackersController>(TrackersController);
       service = module.get<TrackersService>(TrackersService);
     });

     it('should return paginated trackers', async () => {
       // Test implementation
     });

     // More tests...
   });
   ```

### Etap 9: Testy integracyjne (E2E)

1. **Setup E2E tests:**

   ```typescript
   describe('Trackers (e2e)', () => {
     let app: INestApplication;
     let jwtToken: string;

     beforeAll(async () => {
       const moduleFixture = await Test.createTestingModule({
         imports: [AppModule],
       }).compile();

       app = moduleFixture.createNestApplication();
       await app.init();

       // Get JWT token for testing
       jwtToken = await getTestJwtToken();
     });

     it('GET /api/trackers should return 200', () => {
       return request(app.getHttpServer())
         .get('/api/trackers')
         .set('Authorization', `Bearer ${jwtToken}`)
         .expect(200)
         .expect((res) => {
           expect(res.body).toHaveProperty('data');
           expect(res.body).toHaveProperty('pagination');
         });
     });

     it('POST /api/trackers should create tracker', () => {
       return request(app.getHttpServer())
         .post('/api/trackers')
         .set('Authorization', `Bearer ${jwtToken}`)
         .send({
           name: 'Test Tracker',
           data_type: 'number',
           unit: 'kg',
         })
         .expect(201)
         .expect((res) => {
           expect(res.body).toHaveProperty('id');
           expect(res.body.name).toBe('Test Tracker');
         });
     });

     // More E2E tests...
   });
   ```

### Etap 10: Migracje bazy danych

1. **Utworzenie indeksów:**

   ```sql
   -- supabase/migrations/20260201_add_trackers_indexes.sql

   -- Index dla user_id + is_active (najczęściej używany)
   CREATE INDEX IF NOT EXISTS idx_trackers_user_id_active
   ON kipio.trackers(user_id, is_active)
   WHERE deleted_at IS NULL;

   -- Index dla data_type (filtrowanie)
   CREATE INDEX IF NOT EXISTS idx_trackers_data_type
   ON kipio.trackers(data_type)
   WHERE deleted_at IS NULL;

   -- Index dla display_order (sortowanie)
   CREATE INDEX IF NOT EXISTS idx_trackers_display_order
   ON kipio.trackers(display_order)
   WHERE deleted_at IS NULL;

   -- Index dla tracker_shares (dostęp współdzielony)
   CREATE INDEX IF NOT EXISTS idx_tracker_shares_user
   ON kipio.tracker_shares(shared_with_user_id);

   -- Composite index dla tracker_shares (unique constraint)
   CREATE UNIQUE INDEX IF NOT EXISTS idx_tracker_shares_unique
   ON kipio.tracker_shares(tracker_id, shared_with_user_id);

   -- Index dla entries (sparkline i last_entry)
   CREATE INDEX IF NOT EXISTS idx_entries_tracker_recorded
   ON kipio.entries(tracker_id, recorded_at DESC)
   WHERE deleted_at IS NULL;
   ```

2. **Funkcja count_user_trackers (już istnieje):**
   ```sql
   -- Wykorzystujemy istniejącą funkcję z 20260131_add_count_user_trackers_function.sql
   ```

### Etap 11: Dokumentacja API (Swagger)

1. **Swagger decorators na controller:**

   ```typescript
   @ApiTags('trackers')
   @ApiBearerAuth()
   @Controller('trackers')
   export class TrackersController {
     @Get()
     @ApiOperation({ summary: 'List all trackers for current user' })
     @ApiResponse({
       status: 200,
       description: 'Trackers retrieved successfully',
       type: TrackerListResponseDto,
     })
     @ApiResponse({ status: 401, description: 'Unauthorized' })
     async findAll(@Query() query: TrackerListQueryDto, @CurrentUser() user) {
       // ...
     }

     @Post()
     @ApiOperation({ summary: 'Create a new tracker' })
     @ApiResponse({ status: 201, description: 'Tracker created successfully' })
     @ApiResponse({ status: 400, description: 'Invalid request body' })
     @ApiResponse({ status: 403, description: 'Tracker limit reached' })
     async create(@Body() command: CreateTrackerDto, @CurrentUser() user) {
       // ...
     }

     // More decorators...
   }
   ```

2. **Swagger setup w main.ts:**

   ```typescript
   const config = new DocumentBuilder()
     .setTitle('Kipio API')
     .setDescription('REST API for Kipio tracker application')
     .setVersion('1.0')
     .addBearerAuth()
     .build();

   const document = SwaggerModule.createDocument(app, config);
   SwaggerModule.setup('api/docs', app, document);
   ```

### Etap 12: Rate Limiting

1. **Throttler configuration:**

   ```typescript
   // app.module.ts
   @Module({
     imports: [
       ThrottlerModule.forRoot({
         ttl: 60,
         limit: 100,
       }),
       // ...
     ],
   })
   export class AppModule {}
   ```

2. **Apply to controller:**
   ```typescript
   @UseGuards(ThrottlerGuard)
   @Controller('trackers')
   export class TrackersController {
     // ...
   }
   ```

### Etap 13: Logging i Monitoring

1. **Logger setup:**

   ```typescript
   // trackers.service.ts
   private readonly logger = new Logger(TrackersService.name);

   async create(userId: string, command: CreateTrackerCommand) {
     this.logger.log(`Creating tracker for user ${userId}: ${command.name}`);

     try {
       // Business logic
     } catch (error) {
       this.logger.error(`Failed to create tracker: ${error.message}`, error.stack);
       throw error;
     }
   }
   ```

2. **Performance logging interceptor:**

   ```typescript
   @Injectable()
   export class LoggingInterceptor implements NestInterceptor {
     private readonly logger = new Logger(LoggingInterceptor.name);

     intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
       const request = context.switchToHttp().getRequest();
       const method = request.method;
       const url = request.url;
       const now = Date.now();

       return next.handle().pipe(
         tap(() => {
           const responseTime = Date.now() - now;
           this.logger.log(`${method} ${url} - ${responseTime}ms`);
         })
       );
     }
   }
   ```

### Etap 14: Deployment i Environment Variables

1. **Environment variables:**

   ```env
   # apps/api/.env
   DATABASE_URL=postgresql://...
   SUPABASE_URL=https://...
   SUPABASE_ANON_KEY=...
   SUPABASE_JWT_SECRET=...
   PORT=3000
   NODE_ENV=production
   ```

2. **Config module:**

   ```typescript
   @Module({
     imports: [
       ConfigModule.forRoot({
         isGlobal: true,
         validationSchema: Joi.object({
           DATABASE_URL: Joi.string().required(),
           SUPABASE_JWT_SECRET: Joi.string().required(),
           PORT: Joi.number().default(3000),
         }),
       }),
     ],
   })
   export class AppModule {}
   ```

3. **Dockerfile:**

   ```dockerfile
   # apps/api/Dockerfile (już istnieje)
   FROM node:18-alpine

   WORKDIR /app

   COPY package*.json ./
   COPY pnpm-lock.yaml ./

   RUN npm install -g pnpm
   RUN pnpm install --frozen-lockfile

   COPY . .

   RUN pnpm build

   EXPOSE 3000

   CMD ["node", "dist/main"]
   ```

### Etap 15: Finalizacja i Code Review

1. **Code review checklist:**
   - [ ] Wszystkie endpointy zaimplementowane zgodnie ze specyfikacją
   - [ ] Walidacja danych wejściowych na wszystkich DTO
   - [ ] Sprawdzanie ownership i permissions
   - [ ] Proper error handling z odpowiednimi kodami statusu
   - [ ] Testy jednostkowe i integracyjne napisane
   - [ ] Dokumentacja Swagger kompletna
   - [ ] Logging na wszystkich poziomach
   - [ ] Rate limiting skonfigurowany
   - [ ] Indeksy w bazie danych utworzone
   - [ ] Environment variables skonfigurowane
   - [ ] Kod zgodny z zasadami w shared.mdc i backend.mdc

2. **Performance testing:**
   - Load testing z Artillery lub k6
   - Sprawdzenie query performance (EXPLAIN ANALYZE)
   - Memory leak testing

3. **Security audit:**
   - OWASP Top 10 checklist
   - JWT token validation
   - SQL injection prevention
   - Rate limiting effectiveness

4. **Documentation:**
   - README dla modułu trackers
   - API documentation w Swagger
   - Komentarze w kodzie dla złożonej logiki

---

## 10. Podsumowanie

Plan implementacji endpointów Trackers obejmuje:

- **6 endpointów REST** zgodnych ze specyfikacją API
- **Pełna walidacja** danych wejściowych przez class-validator i Zod schemas
- **Autoryzacja i autentykacja** przez JWT Guard i ownership checks
- **Obsługa błędów** z odpowiednimi kodami statusu i strukturą ErrorResponseDto
- **Optymalizacja wydajności** przez indeksy, query optimization, i caching
- **Testy** jednostkowe i E2E
- **Dokumentacja** Swagger i komentarze w kodzie
- **Monitoring** przez logging i performance interceptors

Implementacja powinna być wykonana w 15 etapach, od przygotowania struktury modułu do finalnego code review i deployment.
