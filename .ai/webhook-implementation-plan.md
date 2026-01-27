# API Endpoint Implementation Plan: Webhook Endpoints

## 1. Przegląd punktu końcowego

Webhook endpoints umożliwiają zewnętrznym systemom wysyłanie danych do aplikacji Kipio przy użyciu uwierzytelniania tokenem API. Endpoint obsługuje dwa scenariusze:

1. **POST /api/webhook** - tworzenie pojedynczego wpisu (entry) dla trackera
2. **POST /api/webhook/batch** - tworzenie wielu wpisów w jednym żądaniu (do 100 elementów)

Główne cechy:

- Uwierzytelnianie przez API token (X-API-Key header lub Authorization: Bearer)
- Rate limiting na poziomie użytkownika (zgodnie z `api_requests_per_hour` w profilu)
- Walidacja wartości względem typu danych trackera
- Obsługa częściowego sukcesu dla operacji batch (207 Multi-Status)

---

## 2. Szczegóły żądania

### 2.1. POST /api/webhook

**Metoda HTTP:** POST  
**URL:** `/api/webhook`

**Headers:**
| Header | Typ | Wymagany | Opis |
|--------|-----|----------|------|
| `X-API-Key` | string | Tak* | Token API |
| `Authorization` | string | Tak* | Bearer token API (`Bearer <api_token>`) |

\*Jeden z headerów jest wymagany

**Request Body:**

```json
{
  "tracker_id": "uuid (required)",
  "value": "number | boolean | string (required)",
  "recorded_at": "ISO8601 (optional, defaults to now)"
}
```

**Parametry:**
| Parametr | Typ | Wymagany | Ograniczenia | Opis |
|----------|-----|----------|--------------|------|
| `tracker_id` | UUID | Tak | Valid UUID format | ID trackera |
| `value` | number \| boolean \| string | Tak | string max 500 znaków | Wartość wpisu |
| `recorded_at` | string | Nie | ISO8601 datetime | Czas pomiaru (domyślnie: now) |

### 2.2. POST /api/webhook/batch

**Metoda HTTP:** POST  
**URL:** `/api/webhook/batch`

**Headers:** Identyczne jak dla pojedynczego webhook

**Request Body:**

```json
{
  "entries": [
    {
      "tracker_id": "uuid",
      "value": "number | boolean | string",
      "recorded_at": "ISO8601 (optional)"
    }
  ]
}
```

**Parametry:**
| Parametr | Typ | Wymagany | Ograniczenia | Opis |
|----------|-----|----------|--------------|------|
| `entries` | array | Tak | min: 1, max: 100 elementów | Lista wpisów |
| `entries[].tracker_id` | UUID | Tak | Valid UUID format | ID trackera |
| `entries[].value` | number \| boolean \| string | Tak | string max 500 znaków | Wartość wpisu |
| `entries[].recorded_at` | string | Nie | ISO8601 datetime | Czas pomiaru |

---

## 3. Wykorzystywane typy

### 3.1. Istniejące typy z `@kipio/shared`

```typescript
// Command Models
interface WebhookEntryCommand {
  tracker_id: string;
  value: EntryValue;
  recorded_at?: string;
}

interface WebhookBatchEntryItem {
  tracker_id: string;
  value: EntryValue;
  recorded_at?: string;
}

interface WebhookBatchCommand {
  entries: WebhookBatchEntryItem[];
}

// Response DTOs
interface WebhookEntryResponseDto {
  id: string;
  tracker_id: string;
  value: EntryValue;
  recorded_at: string;
  created_at: string;
}

interface BatchEntryResultDto {
  id?: string;
  tracker_id: string;
  status: BatchEntryStatus;
  error?: string;
}

interface WebhookBatchResponseDto {
  created: number;
  failed: number;
  entries: BatchEntryResultDto[];
}

// Supporting types
type EntryValue = number | boolean | string;
type BatchEntryStatus = 'created' | 'failed';
```

### 3.2. Zod Schemas (istniejące)

```typescript
// Walidacja pojedynczego wpisu
const webhookEntrySchema = z.object({
  tracker_id: z.string().uuid(),
  value: entryValueSchema, // z.union([z.number(), z.boolean(), z.string().max(500)])
  recorded_at: z.string().datetime().optional(),
});

// Walidacja batch
const webhookBatchSchema = z.object({
  entries: z.array(webhookBatchEntrySchema).min(1).max(100),
});
```

### 3.3. Nowe typy do utworzenia

```typescript
// apps/api/src/webhook/interfaces/api-token-user.interface.ts
export interface ApiTokenUser {
  id: string; // User ID (właściciel tokena)
  tokenId: string; // ID tokena API
  tokenName: string; // Nazwa tokena
}

// apps/api/src/webhook/dto/webhook-entry.dto.ts
import { IsUUID, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { EntryValue } from '@kipio/shared';

export class WebhookEntryDto {
  @IsUUID()
  @IsNotEmpty()
  tracker_id: string;

  @IsNotEmpty()
  value: EntryValue;

  @IsOptional()
  @IsDateString()
  recorded_at?: string;
}

// apps/api/src/webhook/dto/webhook-batch.dto.ts
import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayMaxSize, ValidateNested } from 'class-validator';

export class WebhookBatchDto {
  @ValidateNested({ each: true })
  @Type(() => WebhookBatchEntryItem)
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  entries: WebhookBatchEntryItem[];
}
```

---

## 4. Szczegóły odpowiedzi

### 4.1. POST /api/webhook

**Success Response (201 Created):**

```json
{
  "id": "uuid",
  "tracker_id": "uuid",
  "value": 75.5,
  "recorded_at": "2026-01-23T08:00:00Z",
  "created_at": "2026-01-23T08:00:00Z"
}
```

### 4.2. POST /api/webhook/batch

**Full Success Response (201 Created):**

```json
{
  "created": 2,
  "failed": 0,
  "entries": [
    { "id": "uuid", "tracker_id": "uuid", "status": "created" },
    { "id": "uuid", "tracker_id": "uuid", "status": "created" }
  ]
}
```

**Partial Success Response (207 Multi-Status):**

```json
{
  "created": 1,
  "failed": 1,
  "entries": [
    { "id": "uuid", "tracker_id": "uuid", "status": "created" },
    {
      "tracker_id": "uuid",
      "status": "failed",
      "error": "Value doesn't match tracker's data_type"
    }
  ]
}
```

### 4.3. Error Responses

| Status Code | Scenariusz                         | Response Body                                                                                                  |
| ----------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 400         | Nieprawidłowe body żądania         | `{ "statusCode": 400, "message": "Validation failed", "error": "Bad Request", "details": [...] }`              |
| 401         | Brak/nieprawidłowy token API       | `{ "statusCode": 401, "message": "Invalid or missing API token", "error": "Unauthorized" }`                    |
| 403         | Token nie ma dostępu do trackera   | `{ "statusCode": 403, "message": "Token doesn't have access to this tracker", "error": "Forbidden" }`          |
| 404         | Tracker nie znaleziony             | `{ "statusCode": 404, "message": "Tracker not found", "error": "Not Found" }`                                  |
| 422         | Wartość niezgodna z typem trackera | `{ "statusCode": 422, "message": "Value doesn't match tracker's data_type", "error": "Unprocessable Entity" }` |
| 429         | Przekroczony rate limit            | `{ "statusCode": 429, "message": "Rate limit exceeded", "error": "Too Many Requests" }`                        |

---

## 5. Przepływ danych

### 5.1. Diagram przepływu - POST /api/webhook

```
┌────────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client   │────▶│  ApiTokenGuard  │────▶│  WebhookService  │────▶│    Supabase     │
└────────────┘     └─────────────────┘     └──────────────────┘     └─────────────────┘
      │                    │                        │                       │
      │  POST /api/webhook │                        │                       │
      │  X-API-Key: token  │                        │                       │
      │  Body: {...}       │                        │                       │
      │                    │                        │                       │
      │                    │  1. Extract token      │                       │
      │                    │  2. Hash token         │                       │
      │                    │  3. Lookup in DB  ─────┼──────────────────────▶│
      │                    │                        │◀──────────────────────│
      │                    │  4. Validate token     │                       │
      │                    │  5. Check rate limit   │                       │
      │                    │                        │                       │
      │                    │         OK             │                       │
      │                    │───────────────────────▶│                       │
      │                    │                        │  6. Fetch tracker ───▶│
      │                    │                        │◀───────────────────── │
      │                    │                        │  7. Validate access   │
      │                    │                        │  8. Validate value    │
      │                    │                        │  9. Create entry ────▶│
      │                    │                        │◀───────────────────── │
      │                    │                        │ 10. Update last_used  │
      │◀───────────────────┼────────────────────────│                       │
      │     201 Created    │                        │                       │
```

### 5.2. Szczegółowy przepływ

1. **Ekstrakcja tokena** - ApiTokenGuard wyciąga token z `X-API-Key` lub `Authorization: Bearer`
2. **Hashowanie tokena** - SHA-256 hash dla porównania z `token_hash` w bazie
3. **Wyszukiwanie tokena** - Query do `api_tokens` WHERE `token_hash` = hash AND `is_active` = true
4. **Walidacja tokena**:
   - Sprawdzenie czy token istnieje
   - Sprawdzenie `is_active` = true
   - Sprawdzenie `revoked_at` IS NULL
   - Sprawdzenie `expires_at` (jeśli set) > NOW()
5. **Rate limiting** - Sprawdzenie limitu `api_requests_per_hour` z profilu użytkownika
6. **Pobranie trackera** - Query do `trackers` WHERE `id` = tracker_id AND `deleted_at` IS NULL
7. **Walidacja dostępu** - Tracker musi należeć do właściciela tokena (user_id match)
8. **Walidacja wartości** - Typ wartości musi być zgodny z `data_type` trackera
9. **Utworzenie wpisu** - INSERT do `entries`
10. **Aktualizacja tokena** - UPDATE `last_used_at` w `api_tokens`

---

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie

| Aspekt           | Implementacja                                               |
| ---------------- | ----------------------------------------------------------- |
| Token extraction | Obsługa obu formatów: `X-API-Key` i `Authorization: Bearer` |
| Token storage    | Tokeny przechowywane jako SHA-256 hash (`token_hash`)       |
| Token prefix     | `token_prefix` (8 znaków) dla identyfikacji w UI            |
| Token expiration | Sprawdzanie `expires_at` przy każdym żądaniu                |
| Token revocation | Sprawdzanie `revoked_at` IS NULL                            |

### 6.2. Autoryzacja

| Aspekt          | Implementacja                                                                 |
| --------------- | ----------------------------------------------------------------------------- |
| Ownership check | Token może tworzyć wpisy tylko dla trackerów należących do właściciela tokena |
| Shared trackers | Token NIE może tworzyć wpisów dla trackerów udostępnionych (tylko własne)     |
| Active check    | Tracker musi mieć `is_active` = true i `deleted_at` IS NULL                   |

### 6.3. Rate Limiting

```typescript
// Konfiguracja throttlera dla webhook
@Throttle({
  default: {
    limit: 100,  // domyślny limit na godzinę
    ttl: 3600000 // 1 godzina w ms
  }
})
```

- Limit pobierany z `profiles.api_requests_per_hour`
- Klucz: `webhook:${userId}`
- Storage: in-memory lub Redis dla produkcji
- Custom ThrottlerGuard dla dynamicznego limitu per user

### 6.4. Walidacja danych wejściowych

| Pole          | Walidacja                                               |
| ------------- | ------------------------------------------------------- |
| `tracker_id`  | UUID format, istnienie w bazie, ownership               |
| `value`       | Typ zgodny z `tracker.data_type`, string max 500 znaków |
| `recorded_at` | ISO8601 format, opcjonalne                              |
| `entries`     | Array 1-100 elementów                                   |

### 6.5. Potencjalne zagrożenia i mitygacje

| Zagrożenie          | Mitygacja                                  |
| ------------------- | ------------------------------------------ |
| Brute force token   | Rate limiting, hash comparison             |
| Token leakage       | Tokeny pokazywane tylko raz przy tworzeniu |
| Timing attacks      | Constant-time comparison dla hash          |
| Mass data injection | Limit 100 entries per batch, rate limiting |
| Invalid data types  | Ścisła walidacja value vs data_type        |

---

## 7. Obsługa błędów

### 7.1. Scenariusze błędów

| Scenariusz                  | Status | Message                                     | Handling                                          |
| --------------------------- | ------ | ------------------------------------------- | ------------------------------------------------- |
| Brak tokena                 | 401    | "Missing API token"                         | Guard odrzuca przed kontrolerem                   |
| Nieprawidłowy format tokena | 401    | "Invalid token format"                      | Guard odrzuca                                     |
| Token nie istnieje          | 401    | "Invalid or missing API token"              | Guard - query zwraca null                         |
| Token nieaktywny            | 401    | "API token is inactive"                     | Guard sprawdza `is_active`                        |
| Token wygasły               | 401    | "API token has expired"                     | Guard sprawdza `expires_at`                       |
| Token unieważniony          | 401    | "API token has been revoked"                | Guard sprawdza `revoked_at`                       |
| Przekroczony rate limit     | 429    | "Rate limit exceeded"                       | ThrottlerGuard                                    |
| Nieprawidłowe body          | 400    | "Validation failed"                         | ValidationPipe z details                          |
| Tracker nie istnieje        | 404    | "Tracker not found"                         | Service sprawdza query result                     |
| Tracker nieaktywny          | 404    | "Tracker not found"                         | Tracker.is_active = false traktowany jak usunięty |
| Brak dostępu do trackera    | 403    | "Token doesn't have access to this tracker" | Service sprawdza ownership                        |
| Niezgodność typu wartości   | 422    | "Value doesn't match tracker's data_type"   | Service waliduje value                            |
| Błąd bazy danych            | 500    | "Internal server error"                     | GlobalExceptionFilter                             |

### 7.2. Obsługa błędów w batch

Dla operacji batch:

- Błędy globalne (401, 429, 400 body) - zwracane natychmiast, brak przetwarzania
- Błędy per-entry (403, 404, 422) - rejestrowane w `entries[].error`, zwracany 207 jeśli są sukcesy
- Wszystkie błędy - zwracany 400 z listą błędów

```typescript
// Algorytm przetwarzania batch
const results: BatchEntryResultDto[] = [];
let created = 0;
let failed = 0;

for (const entry of command.entries) {
  try {
    const createdEntry = await this.createSingleEntry(userId, entry);
    results.push({
      id: createdEntry.id,
      tracker_id: entry.tracker_id,
      status: 'created',
    });
    created++;
  } catch (error) {
    results.push({
      tracker_id: entry.tracker_id,
      status: 'failed',
      error: error.message,
    });
    failed++;
  }
}

// Determine status code
if (failed === 0) return 201;
if (created === 0) return 400;
return 207; // Multi-Status
```

---

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła

| Obszar           | Problem                   | Rozwiązanie                         |
| ---------------- | ------------------------- | ----------------------------------- |
| Token lookup     | Query przy każdym żądaniu | Index na `token_hash`               |
| Tracker lookup   | Query przy każdym żądaniu | Index na `id`, cache dla batch      |
| Rate limit check | Operacje w pamięci/Redis  | Użycie Redis dla horizontal scaling |
| Batch processing | Sekwencyjne inserty       | Bulk insert z jedną transakcją      |

### 8.2. Indeksy bazy danych (wymagane)

```sql
-- api_tokens
CREATE INDEX idx_api_tokens_token_hash ON api_tokens(token_hash) WHERE is_active = true;
CREATE INDEX idx_api_tokens_user_id ON api_tokens(user_id);

-- trackers (prawdopodobnie już istnieje)
CREATE INDEX idx_trackers_user_id ON trackers(user_id) WHERE deleted_at IS NULL;

-- entries
CREATE INDEX idx_entries_tracker_id ON entries(tracker_id) WHERE deleted_at IS NULL;
```

### 8.3. Optymalizacje batch

```typescript
// Optymalizacja batch insert
async createBatchEntries(entries: InsertEntry[]): Promise<Entry[]> {
  const supabase = this.supabaseService.getAdminClient();

  // Single bulk insert
  const { data, error } = await supabase
    .from('entries')
    .insert(entries)
    .select();

  if (error) throw error;
  return data;
}
```

### 8.4. Cache strategy

Dla produkcji rozważyć:

- Cache profilu użytkownika (rate limit info) - TTL 5 min
- Cache trackera (data_type, ownership) - TTL 1 min
- Użycie Redis dla rate limiting state

---

## 9. Etapy wdrożenia

### Etap 1: Struktura modułu Webhook

**Pliki do utworzenia:**

```
apps/api/src/webhook/
├── webhook.module.ts
├── webhook.controller.ts
├── webhook.service.ts
├── dto/
│   ├── index.ts
│   ├── webhook-entry.dto.ts
│   └── webhook-batch.dto.ts
├── guards/
│   ├── index.ts
│   └── api-token.guard.ts
├── decorators/
│   ├── index.ts
│   └── api-token-user.decorator.ts
├── interfaces/
│   ├── index.ts
│   └── api-token-user.interface.ts
└── index.ts
```

**Zadania:**

1. Utworzenie struktury katalogów
2. Utworzenie `webhook.module.ts` z importami
3. Zarejestrowanie modułu w `app.module.ts`

### Etap 2: Implementacja ApiTokenGuard

**Plik:** `apps/api/src/webhook/guards/api-token.guard.ts`

```typescript
@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing API token');
    }

    const tokenHash = this.hashToken(token);
    const apiToken = await this.validateToken(tokenHash);

    // Attach user info to request
    request.apiTokenUser = {
      id: apiToken.user_id,
      tokenId: apiToken.id,
      tokenName: apiToken.name,
    };

    return true;
  }

  private extractToken(request: Request): string | null {
    // Check X-API-Key header first
    const apiKey = request.headers['x-api-key'];
    if (apiKey) return apiKey as string;

    // Fall back to Authorization: Bearer
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
```

**Zadania:**

1. Implementacja ekstrakcji tokena z obu headerów
2. Implementacja hashowania SHA-256
3. Implementacja walidacji tokena (query + sprawdzenia)
4. Utworzenie decorator'a `@ApiTokenUser()`

### Etap 3: Implementacja Rate Limiting

**Zadania:**

1. Konfiguracja `@nestjs/throttler` w `app.module.ts`
2. Utworzenie custom `WebhookThrottlerGuard` z dynamicznym limitem
3. Integracja z `profiles.api_requests_per_hour`

```typescript
// app.module.ts
ThrottlerModule.forRoot([
  {
    name: 'webhook',
    ttl: 3600000, // 1 hour
    limit: 100, // default, overridden per user
  },
]);

// webhook-throttler.guard.ts
@Injectable()
export class WebhookThrottlerGuard extends ThrottlerGuard {
  protected async getLimit(context: ExecutionContext): Promise<number> {
    const request = context.switchToHttp().getRequest();
    const user = request.apiTokenUser;
    // Fetch user's api_requests_per_hour from profile
    return user?.rateLimit ?? 100;
  }

  protected generateKey(context: ExecutionContext, suffix: string): string {
    const request = context.switchToHttp().getRequest();
    return `webhook:${request.apiTokenUser?.id}:${suffix}`;
  }
}
```

### Etap 4: DTOs i walidacja

**Plik:** `apps/api/src/webhook/dto/webhook-entry.dto.ts`

```typescript
import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class WebhookEntryDto {
  @IsUUID('4', { message: 'tracker_id must be a valid UUID' })
  tracker_id: string;

  @IsNotEmpty({ message: 'value is required' })
  value: number | boolean | string;

  @IsOptional()
  @IsDateString({}, { message: 'recorded_at must be a valid ISO8601 date' })
  recorded_at?: string;
}
```

**Zadania:**

1. Utworzenie `WebhookEntryDto` z class-validator
2. Utworzenie `WebhookBatchDto` z nested validation
3. Custom validator dla wartości (typ zgodny z string max 500)

### Etap 5: WebhookService

**Plik:** `apps/api/src/webhook/webhook.service.ts`

```typescript
@Injectable()
export class WebhookService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async createEntry(
    userId: string,
    tokenId: string,
    command: WebhookEntryCommand
  ): Promise<WebhookEntryResponseDto> {
    // 1. Fetch tracker
    // 2. Validate ownership
    // 3. Validate value type
    // 4. Create entry
    // 5. Update token last_used_at
    // 6. Return response
  }

  async createBatchEntries(
    userId: string,
    tokenId: string,
    command: WebhookBatchCommand
  ): Promise<WebhookBatchResponseDto> {
    // Process entries with error handling per item
  }

  private validateValueType(value: EntryValue, dataType: DataType): boolean {
    switch (dataType) {
      case 'number':
      case 'scale':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'text':
        return typeof value === 'string';
      default:
        return false;
    }
  }

  private mapValueToColumns(value: EntryValue, dataType: DataType) {
    return {
      value_number:
        dataType === 'number' || dataType === 'scale'
          ? (value as number)
          : null,
      value_boolean: dataType === 'boolean' ? (value as boolean) : null,
      value_text: dataType === 'text' ? (value as string) : null,
    };
  }
}
```

**Zadania:**

1. Implementacja `createEntry` z pełną logiką
2. Implementacja `createBatchEntries` z obsługą błędów per-item
3. Implementacja walidacji typu wartości
4. Implementacja mapowania wartości na kolumny bazy danych
5. Aktualizacja `last_used_at` tokena

### Etap 6: WebhookController

**Plik:** `apps/api/src/webhook/webhook.controller.ts`

```typescript
@Controller('webhook')
@UseGuards(ApiTokenGuard, WebhookThrottlerGuard)
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEntry(
    @ApiTokenUser() user: ApiTokenUserInterface,
    @Body() dto: WebhookEntryDto
  ): Promise<WebhookEntryResponseDto> {
    return this.webhookService.createEntry(user.id, user.tokenId, dto);
  }

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  async createBatchEntries(
    @ApiTokenUser() user: ApiTokenUserInterface,
    @Body() dto: WebhookBatchDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<WebhookBatchResponseDto> {
    const result = await this.webhookService.createBatchEntries(
      user.id,
      user.tokenId,
      dto
    );

    // Set appropriate status code
    if (result.failed > 0 && result.created > 0) {
      res.status(HttpStatus.MULTI_STATUS); // 207
    } else if (result.failed > 0) {
      res.status(HttpStatus.BAD_REQUEST); // 400
    }

    return result;
  }
}
```

**Zadania:**

1. Implementacja endpoint'a POST /api/webhook
2. Implementacja endpoint'a POST /api/webhook/batch
3. Obsługa kodów statusu 201/207/400 dla batch

### Etap 7: Testy jednostkowe

**Pliki:**

- `apps/api/src/webhook/webhook.service.spec.ts`
- `apps/api/src/webhook/guards/api-token.guard.spec.ts`

**Scenariusze testowe:**

**ApiTokenGuard:**

- ✓ Zwraca 401 gdy brak tokena
- ✓ Zwraca 401 gdy nieprawidłowy format
- ✓ Zwraca 401 gdy token nie istnieje
- ✓ Zwraca 401 gdy token nieaktywny
- ✓ Zwraca 401 gdy token wygasły
- ✓ Przepuszcza prawidłowy token z X-API-Key
- ✓ Przepuszcza prawidłowy token z Authorization Bearer

**WebhookService.createEntry:**

- ✓ Tworzy wpis dla prawidłowych danych
- ✓ Zwraca 404 gdy tracker nie istnieje
- ✓ Zwraca 403 gdy tracker nie należy do użytkownika
- ✓ Zwraca 422 dla nieprawidłowego typu wartości (number vs boolean)
- ✓ Aktualizuje last_used_at tokena
- ✓ Używa recorded_at gdy podane
- ✓ Używa NOW() gdy recorded_at nie podane

**WebhookService.createBatchEntries:**

- ✓ Tworzy wszystkie wpisy (201)
- ✓ Częściowy sukces (207)
- ✓ Wszystkie błędy (400)
- ✓ Limit 100 entries
- ✓ Poprawne liczniki created/failed

### Etap 8: Testy E2E

**Plik:** `apps/api/test/webhook.e2e-spec.ts`

**Scenariusze:**

- Full flow z prawidłowym tokenem
- Rate limiting
- Batch operations
- Error handling

### Etap 9: Dokumentacja i finalizacja

**Zadania:**

1. Aktualizacja README z informacją o webhook endpoints
2. Dodanie przykładów użycia (curl, JavaScript)
3. Code review i refaktoring
4. Weryfikacja wszystkich testów

---

## 10. Podsumowanie zależności

| Zależność           | Status           | Użycie             |
| ------------------- | ---------------- | ------------------ |
| `@nestjs/throttler` | ✅ Zainstalowane | Rate limiting      |
| `class-validator`   | ✅ Zainstalowane | DTO validation     |
| `class-transformer` | ✅ Zainstalowane | DTO transformation |
| `crypto` (Node.js)  | ✅ Built-in      | SHA-256 hashing    |
| `@kipio/shared`     | ✅ Dostępne      | Types, Zod schemas |

---

## 11. Checklist wdrożenia

- [ ] Utworzenie struktury modułu webhook
- [ ] Implementacja ApiTokenGuard
- [ ] Implementacja ApiTokenUser decorator
- [ ] Konfiguracja ThrottlerModule
- [ ] Implementacja WebhookThrottlerGuard
- [ ] Utworzenie DTOs z walidacją
- [ ] Implementacja WebhookService.createEntry
- [ ] Implementacja WebhookService.createBatchEntries
- [ ] Implementacja WebhookController
- [ ] Testy jednostkowe dla guard
- [ ] Testy jednostkowe dla service
- [ ] Testy E2E
- [ ] Rejestracja modułu w AppModule
- [ ] Dokumentacja
