# API Endpoint Implementation Plan: POST /api/trackers

## 1. Przegląd punktu końcowego

Endpoint służy do tworzenia nowego trackera (definicji metryki) dla zalogowanego użytkownika. Tracker może przechowywać różne typy danych: liczbowe (number), skale (scale), wartości boolean, lub tekst. Endpoint wymaga autoryzacji JWT i respektuje limit trackerów ustawiony w profilu użytkownika.

**Główne funkcje:**

- Tworzenie nowego trackera z konfiguracją specyficzną dla typu danych
- Walidacja limitu trackerów przypisanego do użytkownika
- Walidacja spójności między typem danych a konfiguracją
- Zwracanie pełnych danych utworzonego trackera

## 2. Szczegóły żądania

- **Metoda HTTP**: POST
- **Struktura URL**: `/api/trackers`
- **Content-Type**: `application/json`
- **Autoryzacja**: Bearer Token (JWT z Supabase Auth)

### Headers:

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Request Body:

```typescript
{
  name: string;              // Wymagane, max 100 znaków
  data_type: 'number' | 'scale' | 'boolean' | 'text';  // Wymagane
  unit?: string;             // Opcjonalne, max 20 znaków, tylko dla 'number'
  config?: {                 // Opcjonalne, zależne od data_type
    min?: number;            // Wymagane dla 'scale'
    max?: number;            // Wymagane dla 'scale'
    [key: string]: any;
  };
  color?: string;            // Opcjonalne, format HEX (#RRGGBB)
  icon?: string;             // Opcjonalne, max 50 znaków
  display_order?: number;    // Opcjonalne, domyślnie 0
}
```

### Parametry:

**Wymagane:**

- `name` - nazwa trackera, unikalna w kontekście użytkownika
- `data_type` - typ danych przechowywanych w trackerze

**Opcjonalne:**

- `unit` - jednostka miary (tylko dla typu 'number')
- `config` - konfiguracja specyficzna dla typu (np. min/max dla 'scale')
- `color` - kolor trackera w formacie HEX
- `icon` - nazwa ikony z dostępnego zestawu
- `display_order` - kolejność wyświetlania w interfejsie

## 3. Wykorzystywane typy

### DTOs (Data Transfer Objects)

**CreateTrackerDto** (`apps/api/src/trackers/dto/create-tracker.dto.ts`):

```typescript
import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
  Matches,
  IsObject,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrackerDataType } from '../enums/tracker-data-type.enum';
import { TrackerConfigDto } from './tracker-config.dto';

export class CreateTrackerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(TrackerDataType)
  data_type: TrackerDataType;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @ValidateIf((o) => o.data_type === TrackerDataType.NUMBER)
  unit?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TrackerConfigDto)
  config?: TrackerConfigDto;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'Color must be a valid HEX format (#RRGGBB)',
  })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  display_order?: number = 0;
}
```

**TrackerConfigDto** (`apps/api/src/trackers/dto/tracker-config.dto.ts`):

```typescript
import { IsNumber, IsOptional, ValidateIf } from 'class-validator';

export class TrackerConfigDto {
  @IsOptional()
  @IsNumber()
  min?: number;

  @IsOptional()
  @IsNumber()
  max?: number;

  // Dopuszczamy dodatkowe właściwości dla przyszłej rozbudowy
  [key: string]: any;
}
```

**TrackerResponseDto** (`apps/api/src/trackers/dto/tracker-response.dto.ts`):

```typescript
import { TrackerDataType } from '../enums/tracker-data-type.enum';

export class TrackerResponseDto {
  id: string;
  user_id: string;
  name: string;
  data_type: TrackerDataType;
  unit: string | null;
  config: Record<string, any>;
  color: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;

  static fromEntity(entity: TrackerEntity): TrackerResponseDto {
    return {
      id: entity.id,
      user_id: entity.user_id,
      name: entity.name,
      data_type: entity.data_type,
      unit: entity.unit,
      config: entity.config,
      color: entity.color,
      icon: entity.icon,
      display_order: entity.display_order,
      is_active: entity.is_active,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
    };
  }
}
```

### Enums

**TrackerDataType** (`apps/api/src/trackers/enums/tracker-data-type.enum.ts`):

```typescript
export enum TrackerDataType {
  NUMBER = 'number',
  SCALE = 'scale',
  BOOLEAN = 'boolean',
  TEXT = 'text',
}
```

### Entities

**TrackerEntity** (`apps/api/src/trackers/entities/tracker.entity.ts`):

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TrackerDataType } from '../enums/tracker-data-type.enum';
import { ProfileEntity } from '../../profiles/entities/profile.entity';

@Entity('trackers')
export class TrackerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: TrackerDataType,
  })
  data_type: TrackerDataType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit: string | null;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  @ManyToOne(() => ProfileEntity)
  @JoinColumn({ name: 'user_id' })
  profile: ProfileEntity;
}
```

**ProfileEntity** (fragment) (`apps/api/src/profiles/entities/profile.entity.ts`):

```typescript
@Entity('profiles')
export class ProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', default: 50 })
  trackers_limit: number;

  // ... inne pola
}
```

## 4. Szczegóły odpowiedzi

### Success Response (201 Created):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
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

### Error Responses:

**400 Bad Request** - Nieprawidłowe dane wejściowe:

```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "name must be shorter than or equal to 100 characters",
    "data_type must be one of the following values: number, scale, boolean, text"
  ],
  "error": "Bad Request"
}
```

**401 Unauthorized** - Brak lub nieprawidłowy token JWT:

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**403 Forbidden** - Przekroczony limit trackerów:

```json
{
  "statusCode": 403,
  "message": "Tracker limit reached. You have reached the maximum of 50 trackers.",
  "error": "Forbidden"
}
```

**422 Unprocessable Entity** - Błędy walidacji biznesowej:

```json
{
  "statusCode": 422,
  "message": "Unit can only be set for trackers with data_type 'number'",
  "error": "Unprocessable Entity"
}
```

lub

```json
{
  "statusCode": 422,
  "message": "Config must include 'min' and 'max' for data_type 'scale'",
  "error": "Unprocessable Entity"
}
```

**500 Internal Server Error** - Błąd serwera:

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

## 5. Przepływ danych

### Diagram przepływu:

```
1. Client → HTTP POST /api/trackers + JWT Token
              ↓
2. NestJS Middleware → CORS, Helmet, Rate Limiting
              ↓
3. JwtAuthGuard → Walidacja JWT tokena (Passport + Supabase)
              ↓
4. ValidationPipe → Walidacja CreateTrackerDto (class-validator)
              ↓
5. TrackersController.create()
              ↓
6. TrackersService.create(userId, dto)
              ↓
7. ProfilesService.getProfile(userId) → sprawdzenie trackers_limit
              ↓
8. TrackersService.countActiveTrackers(userId)
              ↓
9. Walidacja biznesowa (unit, config vs data_type)
              ↓
10. TypeORM Repository → INSERT INTO trackers
              ↓
11. Supabase PostgreSQL → Zapis do bazy
              ↓
12. TrackerResponseDto.fromEntity(tracker)
              ↓
13. Client ← 201 Created + TrackerResponseDto
```

### Szczegółowy przepływ w Service:

**TrackersService.create(userId: string, dto: CreateTrackerDto)**:

1. **Sprawdzenie limitu trackerów**:

   ```typescript
   const profile = await this.profilesService.getProfile(userId);
   const activeTrackersCount = await this.countActiveTrackers(userId);

   if (activeTrackersCount >= profile.trackers_limit) {
     throw new ForbiddenException(
       `Tracker limit reached. You have reached the maximum of ${profile.trackers_limit} trackers.`
     );
   }
   ```

2. **Walidacja unit (tylko dla 'number')**:

   ```typescript
   if (dto.unit && dto.data_type !== TrackerDataType.NUMBER) {
     throw new UnprocessableEntityException(
       "Unit can only be set for trackers with data_type 'number'"
     );
   }
   ```

3. **Walidacja config dla 'scale'**:

   ```typescript
   if (dto.data_type === TrackerDataType.SCALE) {
     if (!dto.config?.min || !dto.config?.max) {
       throw new UnprocessableEntityException(
         "Config must include 'min' and 'max' for data_type 'scale'"
       );
     }
     if (dto.config.min >= dto.config.max) {
       throw new UnprocessableEntityException(
         "Config 'min' must be less than 'max'"
       );
     }
   }
   ```

4. **Tworzenie encji i zapis**:

   ```typescript
   const tracker = this.trackersRepository.create({
     user_id: userId,
     ...dto,
     config: dto.config || {},
     is_active: true,
   });

   const savedTracker = await this.trackersRepository.save(tracker);
   ```

5. **Mapowanie do DTO i zwrot**:
   ```typescript
   return TrackerResponseDto.fromEntity(savedTracker);
   ```

### Interakcje z bazą danych:

1. **SELECT z profiles**:

   ```sql
   SELECT trackers_limit FROM profiles WHERE id = :userId;
   ```

2. **COUNT trackerów**:

   ```sql
   SELECT COUNT(*) FROM trackers
   WHERE user_id = :userId AND is_active = true AND deleted_at IS NULL;
   ```

3. **INSERT trackera**:
   ```sql
   INSERT INTO trackers (
     id, user_id, name, data_type, unit, config,
     color, icon, display_order, is_active, created_at, updated_at
   ) VALUES (
     gen_random_uuid(), :userId, :name, :dataType, :unit, :config,
     :color, :icon, :displayOrder, true, NOW(), NOW()
   ) RETURNING *;
   ```

## 6. Względy bezpieczeństwa

### Autoryzacja i uwierzytelnianie:

1. **JWT Token Validation**:
   - Użycie `@UseGuards(JwtAuthGuard)` na controllerze
   - Passport.js z strategią JWT
   - Weryfikacja tokena względem Supabase public key
   - Automatyczne wyodrębnienie `userId` z tokena

2. **User Context**:
   - `user_id` pochodzi **wyłącznie** z zwalidowanego JWT tokena
   - Nie akceptujemy `user_id` z request body (zapobieganie IDOR)
   - Request decorator: `@CurrentUser()` do uzyskania userId

### Walidacja danych wejściowych:

1. **DTO Validation (class-validator)**:
   - Automatyczna walidacja wszystkich pól
   - Whitelist: `whitelist: true` w ValidationPipe (odrzucenie nieznanych pól)
   - Transform: `transform: true` dla konwersji typów

2. **SQL Injection Protection**:
   - TypeORM używa prepared statements
   - Parametryzowane zapytania
   - Brak raw SQL queries

3. **XSS Protection**:
   - Walidacja formatu HEX dla koloru
   - MaxLength dla wszystkich stringów
   - Sanityzacja input przez class-validator

### Rate Limiting:

```typescript
// W TrackersController
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 żądań na minutę
@Post()
async create(@CurrentUser() user, @Body() dto: CreateTrackerDto) {
  // ...
}
```

### Resource Protection:

1. **Tracker Limit**:
   - Sprawdzenie przed utworzeniem
   - Limit z profilu użytkownika (`trackers_limit`)
   - Zapobieganie resource exhaustion

2. **RLS (Row Level Security)** w Supabase:
   - Dodatkowa warstwa bezpieczeństwa na poziomie bazy
   - Policy: użytkownik może tworzyć tylko swoje trackery

### Secrets Management:

- Supabase URL i klucze w zmiennych środowiskowych
- JWT secret w `.env` (nigdy w kodzie)
- Używamy Supabase Service Role Key w backendzie (dla RLS bypass w TypeORM)

### CORS Configuration:

```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
});
```

## 7. Obsługa błędów

### Hierarchia błędów:

```
1. ValidationPipe (400)
   ↓
2. JwtAuthGuard (401)
   ↓
3. Business Logic Validation (403, 422)
   ↓
4. Database Errors (500)
   ↓
5. Global Exception Filter
```

### Szczegółowe scenariusze błędów:

| Kod | Wyjątek NestJS               | Scenariusz                                        | Przykładowa wiadomość                                                 |
| --- | ---------------------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| 400 | BadRequestException          | Nieprawidłowy format DTO, brakujące wymagane pola | "name should not be empty"                                            |
| 401 | UnauthorizedException        | Brak tokenu, token wygasły, nieprawidłowy token   | "Unauthorized"                                                        |
| 403 | ForbiddenException           | Limit trackerów przekroczony                      | "Tracker limit reached. You have reached the maximum of 50 trackers." |
| 422 | UnprocessableEntityException | Unit dla nie-number typu                          | "Unit can only be set for trackers with data_type 'number'"           |
| 422 | UnprocessableEntityException | Brak min/max dla scale                            | "Config must include 'min' and 'max' for data_type 'scale'"           |
| 422 | UnprocessableEntityException | Min >= Max dla scale                              | "Config 'min' must be less than 'max'"                                |
| 500 | InternalServerErrorException | Błąd bazy danych, błąd serwera                    | "Internal server error"                                               |

### Exception Filters:

**Global Exception Filter** (`apps/api/src/common/filters/global-exception.filter.ts`):

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'object'
          ? (exceptionResponse as any).message
          : exceptionResponse;
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### Logging:

```typescript
// W TrackersService
private readonly logger = new Logger(TrackersService.name);

async create(userId: string, dto: CreateTrackerDto): Promise<TrackerResponseDto> {
  try {
    this.logger.log(`Creating tracker for user ${userId}: ${dto.name}`);

    // ... logika

    this.logger.log(`Tracker created successfully: ${savedTracker.id}`);
    return TrackerResponseDto.fromEntity(savedTracker);
  } catch (error) {
    this.logger.error(`Failed to create tracker for user ${userId}`, error.stack);
    throw error;
  }
}
```

### Rollback Strategy:

- TypeORM automatycznie wykonuje rollback w przypadku błędu
- Transakcje nie są wymagane dla pojedynczego INSERT
- W przyszłości (dla złożonych operacji): użycie `@Transaction()` i `QueryRunner`

## 8. Rozważania dotyczące wydajności

### Database Optimization:

1. **Indeksy** (w migracji):

   ```sql
   CREATE INDEX idx_trackers_user_id ON trackers(user_id);
   CREATE INDEX idx_trackers_user_id_active ON trackers(user_id, is_active)
     WHERE deleted_at IS NULL;
   CREATE INDEX idx_trackers_display_order ON trackers(user_id, display_order);
   ```

2. **Query Optimization**:
   - SELECT tylko potrzebne kolumny
   - Używanie COUNT zamiast pobierania wszystkich rekordów
   - Eager loading relacji tylko gdy potrzebne

### Caching Strategy:

1. **Profile Cache**:

   ```typescript
   // Opcjonalnie: cache profilu użytkownika
   @Injectable()
   export class ProfilesService {
     private cache = new Map<
       string,
       { profile: ProfileEntity; timestamp: number }
     >();
     private CACHE_TTL = 5 * 60 * 1000; // 5 minut

     async getProfile(userId: string): Promise<ProfileEntity> {
       const cached = this.cache.get(userId);
       if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
         return cached.profile;
       }

       const profile = await this.profilesRepository.findOne({
         where: { id: userId },
       });
       this.cache.set(userId, { profile, timestamp: Date.now() });
       return profile;
     }
   }
   ```

2. **Redis** (przyszłościowo):
   - Cache dla często pobieranych danych
   - Session storage
   - Rate limiting

### Connection Pooling:

```typescript
// TypeORM config
{
  type: 'postgres',
  host: process.env.DB_HOST,
  // ...
  extra: {
    max: 20,              // Maksymalna liczba połączeń w puli
    connectionTimeoutMillis: 2000,
    idleTimeoutMillis: 30000,
  },
}
```

### Rate Limiting:

```typescript
// ThrottlerModule config
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000,
    limit: 10, // 10 żądań na sekundę
  },
  {
    name: 'medium',
    ttl: 60000,
    limit: 100, // 100 żądań na minutę (profile limit)
  },
]);
```

### Monitoring:

1. **Metrics**:
   - Response time tracking
   - Error rate monitoring
   - Database query performance

2. **APM** (Application Performance Monitoring):
   - New Relic / Datadog / Sentry
   - Track slow queries
   - Alert na high error rate

### Potencjalne wąskie gardła:

1. **Sprawdzenie limitu trackerów**:
   - Dodatkowe query do profiles i COUNT
   - **Optymalizacja**: Cache profilu użytkownika

2. **Config validation dla scale**:
   - Synchroniczna walidacja w pamięci
   - **Brak optymalizacji potrzebnej**

3. **Database INSERT**:
   - Single INSERT jest szybki
   - **Optymalizacja**: Używanie connection pooling

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie struktury projektu

1. Utworzenie modułu `trackers`:

   ```bash
   nest g module trackers
   nest g controller trackers
   nest g service trackers
   ```

2. Struktura katalogów:
   ```
   apps/api/src/trackers/
   ├── dto/
   │   ├── create-tracker.dto.ts
   │   ├── tracker-config.dto.ts
   │   └── tracker-response.dto.ts
   ├── entities/
   │   └── tracker.entity.ts
   ├── enums/
   │   └── tracker-data-type.enum.ts
   ├── trackers.controller.ts
   ├── trackers.service.ts
   └── trackers.module.ts
   ```

### Krok 2: Implementacja Entity i Enum

1. Utworzyć `TrackerDataType` enum
2. Utworzyć `TrackerEntity` z TypeORM decorators
3. Dodać relację do `ProfileEntity`

### Krok 3: Implementacja DTOs

1. Utworzyć `CreateTrackerDto` z class-validator decorators
2. Utworzyć `TrackerConfigDto` dla walidacji config
3. Utworzyć `TrackerResponseDto` z metodą `fromEntity()`

### Krok 4: Migracja bazy danych

1. Wygenerować migrację TypeORM:

   ```bash
   npm run migration:generate -- -n CreateTrackersTable
   ```

2. Dodać indeksy w migracji:

   ```typescript
   await queryRunner.query(`
     CREATE INDEX idx_trackers_user_id ON trackers(user_id);
     CREATE INDEX idx_trackers_user_id_active ON trackers(user_id, is_active) 
       WHERE deleted_at IS NULL;
   `);
   ```

3. Uruchomić migrację:
   ```bash
   npm run migration:run
   ```

### Krok 5: Implementacja Service

1. Wstrzyknąć `Repository<TrackerEntity>` i `ProfilesService`
2. Implementować `countActiveTrackers(userId)`:

   ```typescript
   async countActiveTrackers(userId: string): Promise<number> {
     return this.trackersRepository.count({
       where: {
         user_id: userId,
         is_active: true,
         deleted_at: IsNull()
       },
     });
   }
   ```

3. Implementować `create(userId, dto)`:
   - Sprawdzić limit trackerów
   - Walidować unit vs data_type
   - Walidować config dla scale
   - Zapisać do bazy
   - Zwrócić DTO

### Krok 6: Implementacja Controller

1. Dodać `@UseGuards(JwtAuthGuard, ThrottlerGuard)`
2. Dodać `@Post()` decorator
3. Implementować endpoint:
   ```typescript
   @Post()
   @HttpCode(HttpStatus.CREATED)
   async create(
     @CurrentUser() user: JwtPayload,
     @Body() createTrackerDto: CreateTrackerDto,
   ): Promise<TrackerResponseDto> {
     return this.trackersService.create(user.sub, createTrackerDto);
   }
   ```

### Krok 7: Konfiguracja Module

1. Importować `TypeOrmModule.forFeature([TrackerEntity])`
2. Importować `ProfilesModule`
3. Exportować `TrackersService` (dla przyszłych modułów)

### Krok 8: Konfiguracja Guards i Pipes

1. Dodać `JwtAuthGuard` w `auth` module
2. Skonfigurować `ValidationPipe` globalnie:

   ```typescript
   app.useGlobalPipes(
     new ValidationPipe({
       whitelist: true,
       forbidNonWhitelisted: true,
       transform: true,
     })
   );
   ```

3. Skonfigurować `ThrottlerModule`

### Krok 9: Testy jednostkowe

1. **TrackersService unit tests**:

   ```typescript
   describe('TrackersService', () => {
     describe('create', () => {
       it('should create a tracker successfully', async () => {
         // Test happy path
       });

       it('should throw ForbiddenException when limit reached', async () => {
         // Test limit exceeded
       });

       it('should throw UnprocessableEntityException for unit on non-number type', async () => {
         // Test validation
       });

       it('should throw UnprocessableEntityException for scale without min/max', async () => {
         // Test config validation
       });
     });
   });
   ```

2. **TrackersController unit tests**:
   ```typescript
   describe('TrackersController', () => {
     describe('POST /trackers', () => {
       it('should return 201 with created tracker', async () => {
         // Test controller
       });
     });
   });
   ```

### Krok 10: Testy integracyjne

1. **E2E tests** (`apps/api/test/trackers.e2e-spec.ts`):

   ```typescript
   describe('POST /api/trackers (e2e)', () => {
     it('should create a tracker and return 201', () => {
       return request(app.getHttpServer())
         .post('/api/trackers')
         .set('Authorization', `Bearer ${validToken}`)
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

     it('should return 401 without token', () => {
       return request(app.getHttpServer())
         .post('/api/trackers')
         .send({ name: 'Test', data_type: 'number' })
         .expect(401);
     });

     it('should return 400 for invalid data', () => {
       return request(app.getHttpServer())
         .post('/api/trackers')
         .set('Authorization', `Bearer ${validToken}`)
         .send({ name: '' })
         .expect(400);
     });
   });
   ```

### Krok 11: Dokumentacja API

1. Dodać Swagger decorators:
   ```typescript
   @ApiTags('trackers')
   @ApiBearerAuth()
   @Controller('trackers')
   export class TrackersController {
     @Post()
     @ApiOperation({ summary: 'Create a new tracker' })
     @ApiResponse({ status: 201, description: 'Tracker created', type: TrackerResponseDto })
     @ApiResponse({ status: 400, description: 'Bad Request' })
     @ApiResponse({ status: 401, description: 'Unauthorized' })
     @ApiResponse({ status: 403, description: 'Tracker limit reached' })
     async create(...) { ... }
   }
   ```

### Krok 12: Logging i Monitoring

1. Dodać Logger do service
2. Logować wszystkie operacje create
3. Logować błędy ze stack trace
4. Konfiguracja Sentry (opcjonalnie)

### Krok 13: Security Review

1. Przegląd walidacji input
2. Przegląd guards i authorization
3. Sprawdzenie rate limiting
4. Test penetracyjny (opcjonalnie)

### Krok 14: Performance Testing

1. Load testing z k6 lub Artillery:

   ```javascript
   // test-load.js
   import http from 'k6/http';
   import { check } from 'k6';

   export let options = {
     vus: 50,
     duration: '30s',
   };

   export default function () {
     const payload = JSON.stringify({
       name: 'Load Test Tracker',
       data_type: 'number',
       unit: 'kg',
     });

     const res = http.post('http://localhost:3001/api/trackers', payload, {
       headers: {
         'Content-Type': 'application/json',
         Authorization: `Bearer ${__ENV.JWT_TOKEN}`,
       },
     });

     check(res, { 'status is 201': (r) => r.status === 201 });
   }
   ```

2. Analiza response time
3. Optymalizacja jeśli potrzebna

### Krok 15: Deployment

1. Update `.env` na środowisku produkcyjnym
2. Uruchomienie migracji na produkcji
3. Deployment aplikacji NestJS
4. Smoke testing na produkcji
5. Monitoring metrics

---

## 10. Checklist przed merge

- [ ] Wszystkie testy jednostkowe przechodzą
- [ ] Wszystkie testy E2E przechodzą
- [ ] Kod przechodzi linting (ESLint)
- [ ] Dokumentacja Swagger jest kompletna
- [ ] Migracja bazy danych przetestowana
- [ ] Rate limiting skonfigurowany
- [ ] Logging zaimplementowany
- [ ] Security review wykonany
- [ ] Performance testing wykonany
- [ ] Code review zatwierdzony
- [ ] README zaktualizowany (jeśli potrzebne)

---

## 11. Zasoby dodatkowe

### Dokumentacja:

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [class-validator Documentation](https://github.com/typestack/class-validator)
- [Supabase Documentation](https://supabase.com/docs)

### Przykłady kodu:

- `apps/api/src/profiles/` - przykład podobnego modułu
- NestJS example repositories

### Narzędzia:

- Postman/Insomnia - testowanie API
- k6/Artillery - load testing
- Sentry - error tracking
