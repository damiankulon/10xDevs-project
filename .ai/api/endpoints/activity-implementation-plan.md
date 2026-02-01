# API Endpoint Implementation Plan: GET /api/activity

## 1. Przegląd punktu końcowego

Endpoint `GET /api/activity` służy do pobierania logu aktywności użytkownika. Zwraca paginowaną listę zdarzeń związanych z operacjami użytkownika na różnych encjach systemu (trackery, wpisy, tokeny API, profil, współdzielenia trackerów). Endpoint umożliwia filtrowanie wyników według typu encji, rodzaju akcji oraz zakresu dat.

**Główne funkcjonalności:**

- Pobieranie historii zmian i akcji wykonanych przez użytkownika
- Filtrowanie po typie encji (`tracker`, `entry`, `api_token`, `profile`, `tracker_share`)
- Filtrowanie po rodzaju akcji (`create`, `update`, `delete`, `restore`)
- Filtrowanie po zakresie dat (`from`, `to`)
- Paginacja wyników

## 2. Szczegóły żądania

### Metoda HTTP

`GET`

### Struktura URL

`/api/activity`

### Nagłówki

| Nagłówek        | Typ    | Wymagany | Opis                                      |
| --------------- | ------ | -------- | ----------------------------------------- |
| `Authorization` | string | Tak      | JWT token w formacie `Bearer <jwt_token>` |

### Parametry zapytania

| Parametr      | Typ              | Domyślna wartość | Wymagany | Opis                                                                          |
| ------------- | ---------------- | ---------------- | -------- | ----------------------------------------------------------------------------- |
| `page`        | integer          | 1                | Nie      | Numer strony (min: 1)                                                         |
| `limit`       | integer          | 50               | Nie      | Liczba elementów na stronie (min: 1, max: 100)                                |
| `entity_type` | string           | -                | Nie      | Filtr typu encji: `tracker`, `entry`, `api_token`, `profile`, `tracker_share` |
| `action`      | string           | -                | Nie      | Filtr akcji: `create`, `update`, `delete`, `restore`                          |
| `from`        | string (ISO8601) | -                | Nie      | Data początkowa filtrowania                                                   |
| `to`          | string (ISO8601) | -                | Nie      | Data końcowa filtrowania                                                      |

## 3. Wykorzystywane typy

### Istniejące typy z `packages/shared/src/types.ts`

```typescript
// Enum types
export const EntityType = {
  TRACKER: 'tracker',
  ENTRY: 'entry',
  API_TOKEN: 'api_token',
  PROFILE: 'profile',
  TRACKER_SHARE: 'tracker_share',
} as const;
export type EntityType = (typeof EntityType)[keyof typeof EntityType];

export const ActionType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  RESTORE: 'restore',
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

// DTOs (już zdefiniowane)
export interface ActivityChangesDto {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface ActivityLogEntryDto {
  id: string;
  user_id: string;
  entity_type: EntityType;
  entity_id: string;
  action: ActionType;
  changes: ActivityChangesDto | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type ActivityLogListResponseDto =
  PaginatedResponseDto<ActivityLogEntryDto>;

export interface ActivityLogQueryDto {
  page?: number;
  limit?: number;
  entity_type?: EntityType;
  action?: ActionType;
  from?: string;
  to?: string;
}
```

### Nowe typy DTO do utworzenia w NestJS (`apps/api/src/activity/dto/`)

```typescript
// activity-query.dto.ts
import { IsOptional, IsInt, Min, Max, IsIn, IsISO8601 } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ActivityQueryDto {
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
  @IsIn(['tracker', 'entry', 'api_token', 'profile', 'tracker_share'])
  entity_type?: string;

  @IsOptional()
  @IsIn(['create', 'update', 'delete', 'restore'])
  action?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
```

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "entity_type": "tracker",
      "entity_id": "uuid",
      "action": "create",
      "changes": {
        "after": {
          "name": "Weight",
          "data_type": "number"
        }
      },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2026-01-23T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_items": 100,
    "total_pages": 2
  }
}
```

### Kody odpowiedzi

| Kod | Opis                                          |
| --- | --------------------------------------------- |
| 200 | Pomyślne pobranie logu aktywności             |
| 400 | Nieprawidłowe parametry zapytania (walidacja) |
| 401 | Brak lub nieprawidłowy token JWT              |
| 500 | Błąd wewnętrzny serwera                       |

## 5. Przepływ danych

```
┌─────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Client    │────▶│ ActivityController  │────▶│  ActivityService    │
│             │     │  (JWT Guard)        │     │                     │
└─────────────┘     └─────────────────────┘     └─────────────────────┘
                              │                          │
                              ▼                          ▼
                    ┌─────────────────────┐     ┌─────────────────────┐
                    │  ValidationPipe     │     │  SupabaseService    │
                    │  (Query DTO)        │     │  (Admin Client)     │
                    └─────────────────────┘     └─────────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────────┐
                                                │   activity_log      │
                                                │   (PostgreSQL)      │
                                                └─────────────────────┘
```

### Szczegółowy przepływ:

1. **Żądanie przychodzi** do `ActivityController`
2. **JwtAuthGuard** weryfikuje token JWT i wyodrębnia `AuthUser`
3. **ValidationPipe** waliduje parametry zapytania (`ActivityQueryDto`)
4. **ActivityController** przekazuje żądanie do `ActivityService`
5. **ActivityService**:
   - Buduje zapytanie do tabeli `activity_log` z filtrami
   - Wykonuje zapytanie przez `SupabaseService`
   - Oblicza paginację
   - Mapuje wyniki na `ActivityLogEntryDto`
6. **Odpowiedź** jest zwracana do klienta

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

- **JWT Token**: Wymagany w nagłówku `Authorization: Bearer <token>`
- **Walidacja**: Token weryfikowany przez `JwtAuthGuard` z użyciem klucza publicznego Supabase
- **Wygaśnięcie**: Tokeny z wygasłym `exp` są odrzucane

### Autoryzacja

- **Izolacja danych**: Użytkownik widzi tylko własne logi aktywności
- **Filtrowanie**: Zapytanie do bazy zawsze zawiera `user_id` z JWT
- **RLS**: Dodatkowa warstwa ochrony na poziomie bazy danych

### Walidacja danych wejściowych

- **Parametry zapytania**: Walidowane przez `class-validator`
- **Sanityzacja**: `class-transformer` zapewnia poprawne typy
- **Ograniczenia**:
  - `limit` max 100 (ochrona przed nadmiernym obciążeniem)
  - `page` min 1
  - `entity_type` i `action` - dozwolone tylko zdefiniowane wartości
  - `from`, `to` - muszą być poprawnymi datami ISO8601

### Ochrona przed atakami

- **SQL Injection**: Używamy Supabase SDK z parametryzowanymi zapytaniami
- **Rate Limiting**: Zastosować `@Throttle()` (100 req/h domyślnie)

## 7. Obsługa błędów

### Scenariusze błędów

| Scenariusz                                | Kod HTTP | Odpowiedź                                                                                                             |
| ----------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| Brak nagłówka Authorization               | 401      | `{ "statusCode": 401, "message": "Unauthorized" }`                                                                    |
| Nieprawidłowy/wygasły token JWT           | 401      | `{ "statusCode": 401, "message": "Token expired" }` lub `{ "statusCode": 401, "message": "Invalid token" }`           |
| Nieprawidłowa wartość `page` (np. 0, -1)  | 400      | `{ "statusCode": 400, "message": ["page must not be less than 1"] }`                                                  |
| Nieprawidłowa wartość `limit` (np. 101)   | 400      | `{ "statusCode": 400, "message": ["limit must not be greater than 100"] }`                                            |
| Nieprawidłowa wartość `entity_type`       | 400      | `{ "statusCode": 400, "message": ["entity_type must be one of: tracker, entry, api_token, profile, tracker_share"] }` |
| Nieprawidłowa wartość `action`            | 400      | `{ "statusCode": 400, "message": ["action must be one of: create, update, delete, restore"] }`                        |
| Nieprawidłowy format daty `from` lub `to` | 400      | `{ "statusCode": 400, "message": ["from must be a valid ISO 8601 date string"] }`                                     |
| Błąd bazy danych                          | 500      | `{ "statusCode": 500, "message": "Internal server error" }`                                                           |

### Logowanie błędów

- Używać `Logger` z NestJS do logowania błędów
- Logować szczegóły błędów bazy danych (bez wrażliwych danych)
- Nie ujawniać wewnętrznych szczegółów błędów użytkownikowi

## 8. Rozważania dotyczące wydajności

### Indeksy bazy danych

Upewnić się, że istnieją następujące indeksy na tabeli `activity_log`:

```sql
-- Indeks złożony dla głównych zapytań
CREATE INDEX idx_activity_log_user_created
ON activity_log(user_id, created_at DESC);

-- Indeks dla filtrowania po entity_type
CREATE INDEX idx_activity_log_user_entity_type
ON activity_log(user_id, entity_type, created_at DESC);

-- Indeks dla filtrowania po action
CREATE INDEX idx_activity_log_user_action
ON activity_log(user_id, action, created_at DESC);
```

### Optymalizacje zapytań

- **Paginacja**: Używać `OFFSET` i `LIMIT` (dla małych zbiorów danych akceptowalne)
- **Sortowanie**: Zawsze sortować po `created_at DESC` (wykorzystanie indeksu)
- **Zliczanie**: Używać `count: 'exact'` tylko gdy potrzebna jest całkowita liczba

### Limity

- **Max limit**: 100 elementów na stronę
- **Rate limiting**: 100 żądań/godzinę na użytkownika

### Cache (opcjonalnie, przyszła optymalizacja)

- Rozważyć cache dla częstych zapytań (np. ostatnia strona logu)
- TTL: krótki (30-60 sekund) ze względu na dynamiczność danych

## 9. Etapy wdrożenia

### Krok 1: Utworzenie struktury modułu Activity

Utworzyć nowy moduł `activity` w `apps/api/src/`:

```
apps/api/src/activity/
├── activity.module.ts
├── activity.controller.ts
├── activity.service.ts
├── activity.service.spec.ts
├── dto/
│   ├── activity-query.dto.ts
│   └── index.ts
└── index.ts
```

### Krok 2: Implementacja DTO (`activity-query.dto.ts`)

```typescript
import { IsOptional, IsInt, Min, Max, IsIn, IsISO8601 } from 'class-validator';
import { Type } from 'class-transformer';

export class ActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must not be less than 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must not be less than 1' })
  @Max(100, { message: 'limit must not be greater than 100' })
  limit?: number = 50;

  @IsOptional()
  @IsIn(['tracker', 'entry', 'api_token', 'profile', 'tracker_share'], {
    message:
      'entity_type must be one of: tracker, entry, api_token, profile, tracker_share',
  })
  entity_type?: 'tracker' | 'entry' | 'api_token' | 'profile' | 'tracker_share';

  @IsOptional()
  @IsIn(['create', 'update', 'delete', 'restore'], {
    message: 'action must be one of: create, update, delete, restore',
  })
  action?: 'create' | 'update' | 'delete' | 'restore';

  @IsOptional()
  @IsISO8601({}, { message: 'from must be a valid ISO 8601 date string' })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'to must be a valid ISO 8601 date string' })
  to?: string;
}
```

### Krok 3: Implementacja Service (`activity.service.ts`)

```typescript
import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService, Tables } from '../supabase';
import { ActivityQueryDto } from './dto/activity-query.dto';

export type ActivityLog = Tables<'activity_log'>;

export interface ActivityLogEntryResponseDto {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface PaginationDto {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

export interface ActivityLogListResponseDto {
  data: ActivityLogEntryResponseDto[];
  pagination: PaginationDto;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(
    userId: string,
    query: ActivityQueryDto
  ): Promise<ActivityLogListResponseDto> {
    const supabase = this.supabaseService.getAdminClient();
    const { page = 1, limit = 50, entity_type, action, from, to } = query;

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build query
    let queryBuilder = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (entity_type) {
      queryBuilder = queryBuilder.eq('entity_type', entity_type);
    }

    if (action) {
      queryBuilder = queryBuilder.eq('action', action);
    }

    if (from) {
      queryBuilder = queryBuilder.gte('created_at', from);
    }

    if (to) {
      queryBuilder = queryBuilder.lte('created_at', to);
    }

    // Apply pagination
    queryBuilder = queryBuilder.range(offset, offset + limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      this.logger.error(
        `Failed to fetch activity log for user ${userId}`,
        error
      );
      throw new InternalServerErrorException('Failed to fetch activity log');
    }

    const totalItems = count ?? 0;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: (data ?? []).map((item) => this.mapToResponseDto(item)),
      pagination: {
        page,
        limit,
        total_items: totalItems,
        total_pages: totalPages,
      },
    };
  }

  private mapToResponseDto(item: ActivityLog): ActivityLogEntryResponseDto {
    return {
      id: item.id,
      user_id: item.user_id,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      action: item.action,
      changes: item.changes as Record<string, unknown> | null,
      ip_address: item.ip_address,
      user_agent: item.user_agent,
      created_at: item.created_at,
    };
  }
}
```

### Krok 4: Implementacja Controller (`activity.controller.ts`)

```typescript
import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ActivityService,
  ActivityLogListResponseDto,
} from './activity.service';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { JwtAuthGuard, CurrentUser, AuthUser } from '../auth';

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * GET /api/activity
   * Returns paginated activity log for the authenticated user
   *
   * @param user - Authenticated user from JWT token
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated list of activity log entries
   * @throws UnauthorizedException if token is missing or invalid
   * @throws BadRequestException if query parameters are invalid
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ActivityQueryDto
  ): Promise<ActivityLogListResponseDto> {
    return this.activityService.findAll(user.id, query);
  }
}
```

### Krok 5: Implementacja Module (`activity.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { SupabaseModule } from '../supabase';

@Module({
  imports: [SupabaseModule],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
```

### Krok 6: Utworzenie pliku eksportującego (`index.ts`)

```typescript
export { ActivityModule } from './activity.module';
export {
  ActivityService,
  ActivityLogListResponseDto,
  ActivityLogEntryResponseDto,
} from './activity.service';
export { ActivityQueryDto } from './dto/activity-query.dto';
```

### Krok 7: Rejestracja modułu w `AppModule`

Dodać import `ActivityModule` do `apps/api/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase';
import { ProfilesModule } from './profiles';
import { TrackersModule } from './trackers';
import { AuthModule } from './auth';
import { ActivityModule } from './activity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SupabaseModule,
    AuthModule,
    ProfilesModule,
    TrackersModule,
    ActivityModule,
  ],
})
export class AppModule {}
```

### Krok 8: Weryfikacja indeksów bazy danych

Sprawdzić/dodać indeksy w migracji Supabase:

```sql
-- Dodać do migracji jeśli nie istnieją
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created
ON kipio.activity_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_entity_type
ON kipio.activity_log(user_id, entity_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_action
ON kipio.activity_log(user_id, action, created_at DESC);
```

### Krok 9: Testy jednostkowe (`activity.service.spec.ts`)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { SupabaseService } from '../supabase';
import { InternalServerErrorException } from '@nestjs/common';

describe('ActivityService', () => {
  let service: ActivityService;
  let supabaseService: jest.Mocked<SupabaseService>;

  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: SupabaseService,
          useValue: {
            getAdminClient: jest.fn().mockReturnValue(mockSupabaseClient),
          },
        },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    supabaseService = module.get(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const userId = 'test-user-id';
    const mockActivityLog = [
      {
        id: 'log-1',
        user_id: userId,
        entity_type: 'tracker',
        entity_id: 'tracker-1',
        action: 'create',
        changes: { after: { name: 'Test' } },
        ip_address: '127.0.0.1',
        user_agent: 'Test Agent',
        created_at: '2026-01-27T10:00:00Z',
      },
    ];

    it('should return paginated activity log', async () => {
      mockSupabaseClient.range.mockResolvedValueOnce({
        data: mockActivityLog,
        error: null,
        count: 1,
      });

      const result = await service.findAll(userId, { page: 1, limit: 50 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total_items: 1,
        total_pages: 1,
      });
    });

    it('should apply entity_type filter', async () => {
      mockSupabaseClient.range.mockResolvedValueOnce({
        data: mockActivityLog,
        error: null,
        count: 1,
      });

      await service.findAll(userId, { entity_type: 'tracker' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith(
        'entity_type',
        'tracker'
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockSupabaseClient.range.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
        count: null,
      });

      await expect(service.findAll(userId, {})).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });
});
```

### Krok 10: Testowanie manualne i walidacja

1. **Uruchomić serwer API**: `pnpm --filter api dev`
2. **Przetestować endpoint** za pomocą curl lub Postman:

   ```bash
   # Pobranie logu aktywności
   curl -X GET "http://localhost:3000/api/activity" \
     -H "Authorization: Bearer <jwt_token>"

   # Z filtrami
   curl -X GET "http://localhost:3000/api/activity?entity_type=tracker&action=create&limit=10" \
     -H "Authorization: Bearer <jwt_token>"

   # Z zakresem dat
   curl -X GET "http://localhost:3000/api/activity?from=2026-01-01T00:00:00Z&to=2026-01-31T23:59:59Z" \
     -H "Authorization: Bearer <jwt_token>"
   ```

3. **Zweryfikować odpowiedzi błędów** (brak tokena, nieprawidłowe parametry)
4. **Sprawdzić logi** pod kątem prawidłowego logowania błędów

### Krok 11: Dokumentacja API (opcjonalnie)

Rozważyć dodanie dekoratorów Swagger/OpenAPI do kontrolera dla automatycznej dokumentacji:

```typescript
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('Activity')
@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  @Get()
  @ApiOperation({ summary: 'Get activity log for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'entity_type', required: false, enum: ['tracker', 'entry', 'api_token', 'profile', 'tracker_share'] })
  @ApiQuery({ name: 'action', required: false, enum: ['create', 'update', 'delete', 'restore'] })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Activity log retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(...) { ... }
}
```
