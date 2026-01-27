# API Endpoint Implementation Plan: POST /api/trackers

## 1. Przegląd punktu końcowego

Endpoint `POST /api/trackers` służy do tworzenia nowego trackera dla zalogowanego użytkownika. Tracker to definicja metryki, którą użytkownik chce śledzić (np. waga, poziom energii, nastrój). Endpoint wymaga uwierzytelnienia JWT i waliduje dane wejściowe zgodnie ze specyfikacją API oraz schematem bazy danych.

**Kluczowe funkcjonalności:**

- Tworzenie nowego trackera z wymaganymi polami (`name`, `data_type`)
- Obsługa opcjonalnych pól konfiguracyjnych (`unit`, `config`, `color`, `icon`, `display_order`)
- Walidacja typu `config` w zależności od `data_type` (np. `min`/`max` dla `scale`)
- Walidacja limitu trackerów użytkownika (`trackers_limit` z profilu)
- Walidacja formatu koloru HEX

---

## 2. Szczegóły żądania

### Metoda HTTP

`POST`

### Struktura URL

`/api/trackers`

### Nagłówki

| Nagłówek        | Wartość              | Wymagany |
| --------------- | -------------------- | -------- |
| `Authorization` | `Bearer <jwt_token>` | Tak      |
| `Content-Type`  | `application/json`   | Tak      |

### Parametry

- **Wymagane:** brak (parametry w body)
- **Opcjonalne:** brak

### Request Body

```typescript
{
  name: string;        // wymagany, max 100 znaków
  data_type: string;   // wymagany, enum: 'number' | 'scale' | 'boolean' | 'text'
  unit?: string;       // opcjonalny, max 20 znaków, tylko dla data_type='number'
  config?: object;     // opcjonalny, struktura zależy od data_type
  color?: string;      // opcjonalny, format HEX #RRGGBB
  icon?: string;       // opcjonalny, max 50 znaków
  display_order?: number; // opcjonalny, domyślnie 0
}
```

### Przykład Request Body

```json
{
  "name": "Energy Level",
  "data_type": "scale",
  "config": {
    "min": 1,
    "max": 10
  },
  "color": "#4CAF50",
  "icon": "battery",
  "display_order": 2
}
```

---

## 3. Wykorzystywane typy

### DTOs (Data Transfer Objects)

```typescript
// Request DTO - z packages/shared/src/types.ts
interface CreateTrackerCommand {
  name: string;
  data_type: DataType;
  unit?: string;
  config?: TrackerConfig;
  color?: string;
  icon?: string;
  display_order?: number;
}

// Response DTO - bazuje na TrackerEntity
interface TrackerResponseDto {
  id: string;
  user_id: string;
  name: string;
  data_type: DataType;
  unit: string | null;
  config: TrackerConfig;
  color: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Zod Schema (walidacja)

```typescript
// Z packages/shared/src/types.ts
export const createTrackerSchema = z.object({
  name: z.string().min(1).max(100),
  data_type: z.enum(['number', 'scale', 'boolean', 'text']),
  unit: z.string().max(20).optional(),
  config: trackerConfigSchema.optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  icon: z.string().max(50).optional(),
  display_order: z.number().int().optional(),
});
```

### NestJS DTO (class-validator)

```typescript
// Nowy plik: apps/api/src/trackers/dto/create-tracker.dto.ts
export class CreateTrackerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsIn(['number', 'scale', 'boolean', 'text'])
  data_type: 'number' | 'scale' | 'boolean' | 'text';

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}
```

---

## 4. Szczegóły odpowiedzi

### Sukces (201 Created)

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

### Kody odpowiedzi

| Kod                        | Opis             | Kiedy                                           |
| -------------------------- | ---------------- | ----------------------------------------------- |
| `201 Created`              | Sukces           | Tracker został pomyślnie utworzony              |
| `400 Bad Request`          | Błędne dane      | Nieprawidłowa struktura JSON lub brakujące pola |
| `401 Unauthorized`         | Brak autoryzacji | Brak lub nieprawidłowy token JWT                |
| `403 Forbidden`            | Brak uprawnień   | Przekroczony limit trackerów użytkownika        |
| `422 Unprocessable Entity` | Błąd walidacji   | Nieprawidłowy format danych (np. kolor, config) |

---

## 5. Przepływ danych

```
┌──────────────┐     ┌─────────────────┐     ┌────────────────────┐     ┌──────────────┐
│   Client     │────▶│  AuthGuard      │────▶│ TrackersController │────▶│TrackersService│
│  (Request)   │     │  (JWT verify)   │     │    (Validation)    │     │ (Business)   │
└──────────────┘     └─────────────────┘     └────────────────────┘     └──────────────┘
                                                                               │
                                                                               ▼
                     ┌─────────────────┐     ┌────────────────────┐     ┌──────────────┐
                     │   Response      │◀────│  ActivityLog       │◀────│   Supabase   │
                     │   (201/4xx)     │     │   (opcjonalnie)    │     │   (INSERT)   │
                     └─────────────────┘     └────────────────────┘     └──────────────┘
```

### Szczegółowy przepływ:

1. **Request** → Klient wysyła żądanie POST z tokenem JWT
2. **AuthGuard** → Walidacja tokena JWT przez Passport.js
3. **Controller** → Parsowanie body, wstępna walidacja (class-validator)
4. **Service**:
   - Pobranie user_id z kontekstu autoryzacji
   - Walidacja limitu trackerów (pobranie profilu i zliczenie trackerów)
   - Walidacja specyficzna dla data_type (unit tylko dla number, config dla scale)
   - Wstawienie rekordu do bazy danych
   - Opcjonalnie: zapis do activity_log
5. **Response** → Zwrócenie utworzonego trackera z kodem 201

---

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

- Wymagany prawidłowy token JWT w nagłówku `Authorization`
- Token musi być wydany przez Supabase Auth
- Walidacja przez Passport.js z publicznym kluczem Supabase

### Autoryzacja

- Użytkownik może tworzyć trackery tylko dla siebie (`user_id` z tokena)
- Sprawdzenie limitu trackerów użytkownika przed utworzeniem
- RLS w Supabase zapewnia dodatkową warstwę ochrony

### Walidacja danych wejściowych

- Walidacja długości stringów (name: 100, unit: 20, icon: 50)
- Walidacja formatu koloru HEX (`/^#[0-9A-Fa-f]{6}$/`)
- Walidacja enum `data_type`
- Walidacja spójności `unit` z `data_type` (unit tylko dla 'number')
- Walidacja struktury `config` dla typu 'scale' (wymagane min/max)

### Ochrona przed atakami

- Sanityzacja danych wejściowych (class-validator)
- Parametryzowane zapytania SQL (Supabase SDK)
- Rate limiting (NestJS Throttler)

---

## 7. Obsługa błędów

### Mapowanie błędów na kody HTTP

| Scenariusz                               | Kod HTTP | Komunikat                                                |
| ---------------------------------------- | -------- | -------------------------------------------------------- |
| Brak tokena JWT                          | 401      | "Unauthorized"                                           |
| Nieprawidłowy token JWT                  | 401      | "Invalid token"                                          |
| Token wygasł                             | 401      | "Token expired"                                          |
| Brak wymaganego pola `name`              | 400      | "name is required"                                       |
| Brak wymaganego pola `data_type`         | 400      | "data_type is required"                                  |
| Nieprawidłowy `data_type`                | 422      | "data_type must be one of: number, scale, boolean, text" |
| Nazwa dłuższa niż 100 znaków             | 422      | "name must be at most 100 characters"                    |
| Nieprawidłowy format koloru              | 422      | "color must be in hex format #RRGGBB"                    |
| Unit podany dla typu innego niż 'number' | 422      | "unit is only allowed for data_type 'number'"            |
| Brak config.min/max dla typu 'scale'     | 422      | "config must include min and max for data_type 'scale'"  |
| Przekroczony limit trackerów             | 403      | "Tracker limit reached. Maximum: {limit}"                |
| Błąd bazy danych                         | 500      | "Internal server error"                                  |

### Struktura błędu

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Validation failed",
  "details": [
    {
      "field": "color",
      "message": "color must be in hex format #RRGGBB"
    }
  ],
  "timestamp": "2026-01-24T10:00:00Z",
  "path": "/api/trackers"
}
```

---

## 8. Rozważania dotyczące wydajności

### Optymalizacje

1. **Pojedyncze zapytanie do profilu** - pobranie limitu i liczby trackerów w jednym zapytaniu (JOIN lub subquery)
2. **Indeks na `trackers.user_id`** - już istnieje w schemacie bazy danych
3. **Unikanie N+1** - brak dodatkowych zapytań po wstawieniu rekordu

### Potencjalne wąskie gardła

1. **Sprawdzanie limitu trackerów** - wymaga zliczenia istniejących trackerów
2. **Activity log** - opcjonalne, może być asynchroniczne (event/queue)

### Rekomendacje

- Cache profilu użytkownika (TTL: 5 minut) po stronie NestJS
- Rozważyć trigger bazodanowy do sprawdzania limitu zamiast logiki w kodzie
- Activity log zapisywać asynchronicznie (event emitter lub queue)

---

## 9. Etapy wdrożenia

### Krok 1: Utworzenie modułu Trackers

Utwórz strukturę katalogów i podstawowe pliki modułu:

```
apps/api/src/trackers/
├── trackers.module.ts
├── trackers.controller.ts
├── trackers.service.ts
├── dto/
│   └── create-tracker.dto.ts
└── index.ts
```

### Krok 2: Implementacja DTO (create-tracker.dto.ts)

```typescript
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  IsObject,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';

export class CreateTrackerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsIn(['number', 'scale', 'boolean', 'text'])
  data_type: 'number' | 'scale' | 'boolean' | 'text';

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be in hex format #RRGGBB',
  })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number;
}
```

### Krok 3: Implementacja serwisu (trackers.service.ts)

```typescript
@Injectable()
export class TrackersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(userId: string, dto: CreateTrackerDto): Promise<Tracker> {
    // 1. Walidacja limitu trackerów
    await this.validateTrackerLimit(userId);

    // 2. Walidacja spójności danych (unit, config)
    this.validateDataTypeConstraints(dto);

    // 3. Utworzenie trackera w bazie
    const tracker = await this.insertTracker(userId, dto);

    // 4. Opcjonalnie: activity log
    await this.logActivity(userId, tracker.id, 'create');

    return tracker;
  }

  private async validateTrackerLimit(userId: string): Promise<void> {
    // Pobranie profilu i zliczenie trackerów
  }

  private validateDataTypeConstraints(dto: CreateTrackerDto): void {
    // Walidacja unit/config w zależności od data_type
  }

  private async insertTracker(
    userId: string,
    dto: CreateTrackerDto
  ): Promise<Tracker> {
    // INSERT do tabeli trackers
  }
}
```

### Krok 4: Implementacja kontrolera (trackers.controller.ts)

```typescript
@Controller('trackers')
export class TrackersController {
  constructor(private readonly trackersService: TrackersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'))
  async create(
    @Body() createTrackerDto: CreateTrackerDto,
    @Request() req: AuthenticatedRequest
  ): Promise<TrackerResponseDto> {
    const userId = req.user.id;
    return this.trackersService.create(userId, createTrackerDto);
  }
}
```

### Krok 5: Implementacja modułu (trackers.module.ts)

```typescript
@Module({
  imports: [SupabaseModule],
  controllers: [TrackersController],
  providers: [TrackersService],
  exports: [TrackersService],
})
export class TrackersModule {}
```

### Krok 6: Rejestracja modułu w AppModule

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    ProfilesModule,
    TrackersModule, // Dodać import
  ],
})
export class AppModule {}
```

### Krok 7: Implementacja AuthGuard (jeśli nie istnieje)

Utworzenie JWT strategy dla Passport.js z walidacją przez Supabase.

### Krok 8: Obsługa błędów i exception filters

Utworzenie globalnego filtru wyjątków dla spójnych odpowiedzi błędów.

### Krok 9: Testy jednostkowe

- Test walidacji DTO
- Test sprawdzania limitu trackerów
- Test walidacji data_type constraints
- Test tworzenia trackera

### Krok 10: Testy integracyjne

- Test pełnego flow z autoryzacją
- Test odpowiedzi na błędy walidacji
- Test odpowiedzi na przekroczony limit

---

## 10. Podsumowanie zależności

### Nowe pliki do utworzenia:

1. `apps/api/src/trackers/trackers.module.ts`
2. `apps/api/src/trackers/trackers.controller.ts`
3. `apps/api/src/trackers/trackers.service.ts`
4. `apps/api/src/trackers/dto/create-tracker.dto.ts`
5. `apps/api/src/trackers/index.ts`

### Pliki do modyfikacji:

1. `apps/api/src/app.module.ts` - import TrackersModule

### Zależności zewnętrzne (już w projekcie):

- `class-validator` - walidacja DTO
- `@nestjs/passport` - autoryzacja JWT
- `@supabase/supabase-js` - dostęp do bazy danych
