# API Endpoint Implementation Plan: API Token Management

## 1. Przegląd punktu końcowego

Moduł zarządzania tokenami API umożliwia użytkownikom tworzenie, listowanie, usuwanie i regenerowanie tokenów służących do autentykacji w webhookach. Tokeny są bezpiecznie hashowane (SHA-256) przed zapisem do bazy danych, a pełny token jest zwracany tylko raz podczas tworzenia lub regeneracji.

### Endpoints:

- `GET /api/tokens` - Lista wszystkich tokenów użytkownika
- `POST /api/tokens` - Tworzenie nowego tokena
- `DELETE /api/tokens/:id` - Unieważnienie (revoke) tokena
- `POST /api/tokens/:id/regenerate` - Regeneracja istniejącego tokena

---

## 2. Szczegóły żądania

### 2.1 GET /api/tokens

| Parametr | Typ | Wymagany | Opis            |
| -------- | --- | -------- | --------------- |
| -        | -   | -        | Brak parametrów |

**Headers:**

```
Authorization: Bearer <jwt_token>
```

---

### 2.2 POST /api/tokens

| Parametr     | Typ     | Wymagany | Opis                            |
| ------------ | ------- | -------- | ------------------------------- |
| `name`       | string  | Tak      | Nazwa tokena (max 50 znaków)    |
| `expires_at` | ISO8601 | Nie      | Data wygaśnięcia (null = nigdy) |

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "name": "string (required, max 50 chars)",
  "expires_at": "ISO8601 (optional)"
}
```

---

### 2.3 DELETE /api/tokens/:id

| Parametr | Typ         | Wymagany | Opis                   |
| -------- | ----------- | -------- | ---------------------- |
| `id`     | UUID (path) | Tak      | ID tokena do usunięcia |

**Headers:**

```
Authorization: Bearer <jwt_token>
```

---

### 2.4 POST /api/tokens/:id/regenerate

| Parametr | Typ         | Wymagany | Opis                     |
| -------- | ----------- | -------- | ------------------------ |
| `id`     | UUID (path) | Tak      | ID tokena do regeneracji |

**Headers:**

```
Authorization: Bearer <jwt_token>
```

---

## 3. Wykorzystywane typy

### 3.1 Istniejące typy (z `@kipio/shared`)

```typescript
// Entity
export interface ApiTokenEntity {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  token_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  revoked_at: string | null;
  created_at: string;
}

// Response DTOs
export interface ApiTokenResponseDto {
  id: string;
  name: string;
  token_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiTokenListResponseDto {
  data: ApiTokenResponseDto[];
}

export interface ApiTokenCreatedResponseDto extends ApiTokenResponseDto {
  token: string; // Pełny token - tylko przy tworzeniu/regeneracji
}

// Command Model
export interface CreateApiTokenCommand {
  name: string;
  expires_at?: string;
}

// Zod Schema
export const createApiTokenSchema = z.object({
  name: z.string().min(1).max(50),
  expires_at: z.string().datetime().optional(),
});

export type CreateApiTokenDto = z.infer<typeof createApiTokenSchema>;
```

### 3.2 Nowe typy do utworzenia (NestJS DTOs)

```typescript
// apps/api/src/api-tokens/dto/create-api-token.dto.ts
export class CreateApiTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsISO8601()
  expires_at?: string;
}
```

---

## 4. Szczegóły odpowiedzi

### 4.1 GET /api/tokens

**200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "n8n Integration",
      "token_prefix": "kip_abcd",
      "last_used_at": "2026-01-23T12:00:00Z",
      "expires_at": null,
      "is_active": true,
      "created_at": "2026-01-01T12:00:00Z"
    }
  ]
}
```

### 4.2 POST /api/tokens

**201 Created:**

```json
{
  "id": "uuid",
  "name": "n8n Integration",
  "token": "kip_abcdefgh1234567890...",
  "token_prefix": "kip_abcd",
  "expires_at": null,
  "is_active": true,
  "created_at": "2026-01-23T12:00:00Z"
}
```

### 4.3 DELETE /api/tokens/:id

**204 No Content** - Brak body

### 4.4 POST /api/tokens/:id/regenerate

**200 OK:**

```json
{
  "id": "uuid",
  "name": "n8n Integration",
  "token": "kip_newtoken1234567890...",
  "token_prefix": "kip_newt",
  "expires_at": null,
  "is_active": true,
  "created_at": "2026-01-23T12:00:00Z"
}
```

---

## 5. Przepływ danych

### 5.1 Diagram przepływu - Tworzenie tokena

```
┌─────────┐     ┌───────────────┐     ┌─────────────────┐     ┌──────────┐
│ Client  │────▶│ TokensController │──▶│ TokensService   │────▶│ Supabase │
└─────────┘     └───────────────┘     └─────────────────┘     └──────────┘
     │                  │                      │                    │
     │ POST /api/tokens │                      │                    │
     │ + JWT + Body     │                      │                    │
     │─────────────────▶│                      │                    │
     │                  │ JwtAuthGuard         │                    │
     │                  │ validates token      │                    │
     │                  │──────────────────────│                    │
     │                  │                      │                    │
     │                  │ ValidationPipe       │                    │
     │                  │ validates body       │                    │
     │                  │──────────────────────│                    │
     │                  │                      │                    │
     │                  │ create(userId, dto)  │                    │
     │                  │─────────────────────▶│                    │
     │                  │                      │                    │
     │                  │                      │ 1. Generate token  │
     │                  │                      │ 2. Hash token      │
     │                  │                      │ 3. Extract prefix  │
     │                  │                      │                    │
     │                  │                      │ INSERT api_tokens  │
     │                  │                      │───────────────────▶│
     │                  │                      │                    │
     │                  │                      │◀───────────────────│
     │                  │                      │    Created row     │
     │                  │◀─────────────────────│                    │
     │                  │  ApiTokenCreatedDto  │                    │
     │◀─────────────────│  (with full token)   │                    │
     │   201 Created    │                      │                    │
```

### 5.2 Generowanie tokena

1. **Generowanie losowego tokena:**
   - Format: `kip_` + 32 bajty losowe (hex) = `kip_` + 64 znaki
   - Przykład: `kip_a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12`

2. **Tworzenie prefiksu:**
   - Pierwsze 8 znaków pełnego tokena: `kip_a1b2`

3. **Hashowanie:**
   - SHA-256 hash pełnego tokena
   - Przechowywany w `token_hash`

### 5.3 Walidacja tokena przy użyciu (webhook)

```
Incoming token → SHA-256 hash → Compare with token_hash in DB
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja i autoryzacja

| Aspekt       | Implementacja                                   |
| ------------ | ----------------------------------------------- |
| Autentykacja | JWT Bearer token (Supabase Auth)                |
| Autoryzacja  | Użytkownik może zarządzać tylko swoimi tokenami |
| Guard        | `JwtAuthGuard` na wszystkich endpointach        |

### 6.2 Bezpieczeństwo tokenów

| Aspekt         | Implementacja                                             |
| -------------- | --------------------------------------------------------- |
| Przechowywanie | Tylko hash SHA-256 w bazie danych                         |
| Transmisja     | Pełny token zwracany tylko raz przy tworzeniu/regeneracji |
| Format         | Prefix `kip_` dla łatwej identyfikacji                    |
| Entropia       | 32 bajty losowe (256 bitów)                               |

### 6.3 Walidacja danych wejściowych

| Pole         | Walidacja                                  |
| ------------ | ------------------------------------------ |
| `name`       | Required, string, min 1 char, max 50 chars |
| `expires_at` | Optional, valid ISO8601 datetime           |
| `id` (path)  | Valid UUID format                          |

### 6.4 Ochrona przed atakami

- **Timing attacks:** Używanie stałoczasowego porównywania hashów
- **Brute force:** Rate limiting na poziomie API (100 req/h per user)
- **Token leaks:** Token hashowany, prefix pozwala na identyfikację bez pełnego tokena

---

## 7. Obsługa błędów

### 7.1 Kody statusu

| Kod | Scenariusz                                    |
| --- | --------------------------------------------- |
| 200 | Pomyślna operacja (GET list, POST regenerate) |
| 201 | Pomyślne utworzenie tokena                    |
| 204 | Pomyślne usunięcie tokena                     |
| 400 | Nieprawidłowe dane wejściowe (walidacja body) |
| 401 | Brak lub nieprawidłowy JWT token              |
| 403 | Token nie należy do użytkownika               |
| 404 | Token nie znaleziony                          |
| 422 | Błędy walidacji semantycznej                  |
| 500 | Wewnętrzny błąd serwera                       |

### 7.2 Szczegółowe scenariusze błędów

| Endpoint                        | Błąd                               | Kod | Wiadomość                                 |
| ------------------------------- | ---------------------------------- | --- | ----------------------------------------- |
| GET /api/tokens                 | Brak tokena JWT                    | 401 | "Unauthorized"                            |
| POST /api/tokens                | Brak pola `name`                   | 400 | "name is required"                        |
| POST /api/tokens                | Nazwa za długa                     | 400 | "name must be at most 50 characters"      |
| POST /api/tokens                | Nieprawidłowy format `expires_at`  | 400 | "expires_at must be a valid ISO8601 date" |
| DELETE /api/tokens/:id          | Token nie istnieje                 | 404 | "Token not found"                         |
| DELETE /api/tokens/:id          | Token należy do innego użytkownika | 403 | "Access denied"                           |
| POST /api/tokens/:id/regenerate | Token nie istnieje                 | 404 | "Token not found"                         |
| POST /api/tokens/:id/regenerate | Token jest nieaktywny              | 400 | "Cannot regenerate inactive token"        |

### 7.3 Format odpowiedzi błędu

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "name",
      "message": "name must be at most 50 characters"
    }
  ],
  "timestamp": "2026-01-27T12:00:00Z",
  "path": "/api/tokens"
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Indeksy bazodanowe

Tabela `api_tokens` powinna mieć następujące indeksy:

```sql
-- Szybkie wyszukiwanie tokenów użytkownika
CREATE INDEX idx_api_tokens_user_id ON kipio.api_tokens(user_id);

-- Szybka walidacja tokena po hashu
CREATE UNIQUE INDEX idx_api_tokens_token_hash ON kipio.api_tokens(token_hash);

-- Filtrowanie aktywnych tokenów
CREATE INDEX idx_api_tokens_is_active ON kipio.api_tokens(user_id, is_active);
```

### 8.2 Optymalizacje

| Aspekt             | Strategia                                      |
| ------------------ | ---------------------------------------------- |
| Hashowanie         | SHA-256 jest szybki i bezpieczny               |
| Generowanie tokena | Crypto.randomBytes - sprzętowy RNG             |
| Zapytania          | Selektywne pobieranie tylko potrzebnych kolumn |
| Cache              | Rozważyć cache dla walidacji tokenów webhook   |

### 8.3 Limity

| Limit                      | Wartość   | Uzasadnienie            |
| -------------------------- | --------- | ----------------------- |
| Max tokenów na użytkownika | 10        | Zapobieganie nadużyciom |
| Rate limit API             | 100 req/h | Z profilu użytkownika   |
| Długość nazwy              | 50 znaków | Ograniczenie DB         |

---

## 9. Etapy wdrożenia

### Krok 1: Utworzenie struktury modułu

Utworzyć strukturę folderów dla modułu `api-tokens`:

```
apps/api/src/api-tokens/
├── api-tokens.module.ts
├── api-tokens.controller.ts
├── api-tokens.service.ts
├── dto/
│   └── create-api-token.dto.ts
├── utils/
│   └── token-generator.util.ts
└── index.ts
```

---

### Krok 2: Implementacja utility do generowania tokenów

**Plik:** `apps/api/src/api-tokens/utils/token-generator.util.ts`

```typescript
import { randomBytes, createHash } from 'crypto';

const TOKEN_PREFIX = 'kip_';
const TOKEN_BYTES = 32; // 256 bits of entropy
const PREFIX_LENGTH = 8; // kip_xxxx

export interface GeneratedToken {
  token: string; // Full token to return to user
  tokenHash: string; // SHA-256 hash to store in DB
  tokenPrefix: string; // First 8 chars for identification
}

export function generateApiToken(): GeneratedToken {
  const randomPart = randomBytes(TOKEN_BYTES).toString('hex');
  const token = `${TOKEN_PREFIX}${randomPart}`;

  const tokenHash = createHash('sha256').update(token).digest('hex');

  const tokenPrefix = token.substring(0, PREFIX_LENGTH);

  return {
    token,
    tokenHash,
    tokenPrefix,
  };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
```

---

### Krok 3: Implementacja DTO

**Plik:** `apps/api/src/api-tokens/dto/create-api-token.dto.ts`

```typescript
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsISO8601,
} from 'class-validator';

export class CreateApiTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(50, { message: 'name must be at most 50 characters' })
  name: string;

  @IsOptional()
  @IsISO8601({}, { message: 'expires_at must be a valid ISO8601 date' })
  expires_at?: string;
}
```

---

### Krok 4: Implementacja serwisu

**Plik:** `apps/api/src/api-tokens/api-tokens.service.ts`

Implementacja metod:

1. **`findAllByUser(userId: string): Promise<ApiTokenResponseDto[]>`**
   - Pobiera wszystkie aktywne tokeny użytkownika
   - Filtruje: `user_id = userId`, `revoked_at IS NULL`
   - Sortuje: `created_at DESC`

2. **`create(userId: string, dto: CreateApiTokenDto): Promise<ApiTokenCreatedResponseDto>`**
   - Sprawdza limit tokenów (max 10)
   - Generuje nowy token
   - Zapisuje hash do bazy
   - Zwraca pełny token (jednorazowo)

3. **`revoke(userId: string, tokenId: string): Promise<void>`**
   - Sprawdza czy token należy do użytkownika
   - Ustawia `is_active = false`, `revoked_at = NOW()`
   - Nie usuwa fizycznie (soft delete)

4. **`regenerate(userId: string, tokenId: string): Promise<ApiTokenCreatedResponseDto>`**
   - Sprawdza czy token należy do użytkownika i jest aktywny
   - Generuje nowy token
   - Aktualizuje `token_hash`, `token_prefix`
   - Zwraca nowy pełny token

---

### Krok 5: Implementacja kontrolera

**Plik:** `apps/api/src/api-tokens/api-tokens.controller.ts`

```typescript
@Controller('tokens')
@UseGuards(JwtAuthGuard)
export class ApiTokensController {
  constructor(private readonly apiTokensService: ApiTokensService) {}

  @Get()
  async findAll(@CurrentUser() user: AuthUser): Promise<ApiTokenListResponseDto>

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateApiTokenDto
  ): Promise<ApiTokenCreatedResponseDto>

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<void>

  @Post(':id/regenerate')
  async regenerate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<ApiTokenCreatedResponseDto>
}
```

---

### Krok 6: Implementacja modułu

**Plik:** `apps/api/src/api-tokens/api-tokens.module.ts`

```typescript
@Module({
  imports: [SupabaseModule],
  controllers: [ApiTokensController],
  providers: [ApiTokensService],
  exports: [ApiTokensService],
})
export class ApiTokensModule {}
```

---

### Krok 7: Rejestracja modułu w AppModule

**Plik:** `apps/api/src/app.module.ts`

```typescript
import { ApiTokensModule } from './api-tokens';

@Module({
  imports: [
    // ... existing imports
    ApiTokensModule,
  ],
})
export class AppModule {}
```

---

### Krok 8: Implementacja Activity Log (opcjonalnie)

Dodanie logowania akcji na tokenach do `activity_log`:

```typescript
// W ApiTokensService
private async logActivity(
  userId: string,
  tokenId: string,
  action: 'create' | 'update' | 'delete',
  changes?: Record<string, unknown>
): Promise<void> {
  const supabase = this.supabaseService.getAdminClient();

  await supabase.from('activity_log').insert({
    user_id: userId,
    entity_type: 'api_token',
    entity_id: tokenId,
    action,
    changes,
  });
}
```

---

### Krok 9: Testy jednostkowe

**Plik:** `apps/api/src/api-tokens/api-tokens.service.spec.ts`

Scenariusze testowe:

1. **findAllByUser:**
   - Zwraca puste dane gdy brak tokenów
   - Zwraca tokeny tylko dla danego użytkownika
   - Nie zwraca unieważnionych tokenów

2. **create:**
   - Tworzy token z prawidłowymi danymi
   - Zwraca pełny token tylko raz
   - Rzuca błąd gdy przekroczono limit tokenów
   - Waliduje format `expires_at`

3. **revoke:**
   - Unieważnia token użytkownika
   - Rzuca 404 gdy token nie istnieje
   - Rzuca 403 gdy token należy do innego użytkownika

4. **regenerate:**
   - Generuje nowy token
   - Zachowuje nazwę i `expires_at`
   - Rzuca błąd dla nieaktywnego tokena
   - Rzuca 404 gdy token nie istnieje

---

### Krok 10: Testy E2E

**Plik:** `apps/api/test/api-tokens.e2e-spec.ts`

Scenariusze:

1. **GET /api/tokens:**
   - 401 bez JWT
   - 200 z pustą listą dla nowego użytkownika
   - 200 z listą tokenów

2. **POST /api/tokens:**
   - 401 bez JWT
   - 400 z pustym body
   - 400 z za długą nazwą
   - 201 tworzy token
   - Token w odpowiedzi ma poprawny format

3. **DELETE /api/tokens/:id:**
   - 401 bez JWT
   - 404 nieistniejący token
   - 403 token innego użytkownika
   - 204 pomyślne usunięcie

4. **POST /api/tokens/:id/regenerate:**
   - 401 bez JWT
   - 404 nieistniejący token
   - 403 token innego użytkownika
   - 200 pomyślna regeneracja
   - Nowy token różni się od starego

---

## 10. Checklist implementacji

- [ ] Utworzenie struktury folderów modułu `api-tokens`
- [ ] Implementacja `token-generator.util.ts`
- [ ] Implementacja `create-api-token.dto.ts`
- [ ] Implementacja `api-tokens.service.ts`
  - [ ] Metoda `findAllByUser`
  - [ ] Metoda `create`
  - [ ] Metoda `revoke`
  - [ ] Metoda `regenerate`
- [ ] Implementacja `api-tokens.controller.ts`
- [ ] Implementacja `api-tokens.module.ts`
- [ ] Eksport z `index.ts`
- [ ] Rejestracja w `AppModule`
- [ ] Testy jednostkowe serwisu
- [ ] Testy E2E endpointów
- [ ] Dokumentacja API (OpenAPI/Swagger)
- [ ] Logowanie activity (opcjonalnie)
