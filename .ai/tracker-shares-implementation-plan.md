# API Endpoint Implementation Plan: Tracker Shares

## 1. Przegląd punktu końcowego

Endpointy Tracker Shares umożliwiają współdzielenie trackerów między użytkownikami. Implementacja obejmuje trzy operacje:

1. **GET /api/trackers/:trackerId/shares** - Lista wszystkich udostępnień dla danego trackera
2. **POST /api/trackers/:trackerId/shares** - Udostępnienie trackera innemu użytkownikowi
3. **DELETE /api/trackers/:trackerId/shares/:shareId** - Usunięcie udostępnienia

Tylko właściciel trackera może zarządzać udostępnieniami. Użytkownicy są identyfikowani przez email przy tworzeniu share'a.

---

## 2. Szczegóły żądania

### GET /api/trackers/:trackerId/shares

| Element     | Wartość                           |
| ----------- | --------------------------------- |
| Metoda HTTP | GET                               |
| URL         | `/api/trackers/:trackerId/shares` |
| Autoryzacja | Bearer JWT Token                  |

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `trackerId` | UUID | Tak | ID trackera |

---

### POST /api/trackers/:trackerId/shares

| Element     | Wartość                           |
| ----------- | --------------------------------- |
| Metoda HTTP | POST                              |
| URL         | `/api/trackers/:trackerId/shares` |
| Autoryzacja | Bearer JWT Token                  |

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `trackerId` | UUID | Tak | ID trackera |

**Request Body:**

```json
{
  "shared_with_email": "string (required, email format)",
  "permission": "read | write (required)"
}
```

---

### DELETE /api/trackers/:trackerId/shares/:shareId

| Element     | Wartość                                    |
| ----------- | ------------------------------------------ |
| Metoda HTTP | DELETE                                     |
| URL         | `/api/trackers/:trackerId/shares/:shareId` |
| Autoryzacja | Bearer JWT Token                           |

**Parametry ścieżki:**
| Parametr | Typ | Wymagany | Opis |
|----------|-----|----------|------|
| `trackerId` | UUID | Tak | ID trackera |
| `shareId` | UUID | Tak | ID udostępnienia |

---

## 3. Wykorzystywane typy

### Istniejące typy z `@kipio/shared`

```typescript
// Encja z bazy danych
export interface TrackerShareEntity {
  id: string;
  tracker_id: string;
  shared_with_user_id: string;
  permission: SharePermission;
  created_at: string;
  created_by: string;
}

// Typ uprawnień
export const SharePermission = {
  READ: 'read',
  WRITE: 'write',
} as const;
export type SharePermission =
  (typeof SharePermission)[keyof typeof SharePermission];

// DTO użytkownika w udostępnieniu
export interface SharedUserDto {
  id: string;
  display_name: string;
}

// DTO odpowiedzi dla pojedynczego share'a
export interface TrackerShareResponseDto extends Omit<
  TrackerShareEntity,
  'shared_with_user_id'
> {
  shared_with_user_id: string;
  shared_with_user: SharedUserDto;
}

// DTO listy udostępnień
export interface TrackerShareListResponseDto {
  data: TrackerShareResponseDto[];
}

// Command model dla tworzenia share'a
export interface CreateTrackerShareCommand {
  shared_with_email: string;
  permission: SharePermission;
}
```

### Nowe DTOs do utworzenia (NestJS class-validator)

```typescript
// apps/api/src/trackers/dto/create-tracker-share.dto.ts
export class CreateTrackerShareDto {
  @IsEmail({}, { message: 'shared_with_email must be a valid email address' })
  @IsNotEmpty({ message: 'shared_with_email is required' })
  shared_with_email: string;

  @IsIn(['read', 'write'], {
    message: 'permission must be either read or write',
  })
  @IsNotEmpty({ message: 'permission is required' })
  permission: 'read' | 'write';
}
```

---

## 4. Szczegóły odpowiedzi

### GET /api/trackers/:trackerId/shares

**200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "tracker_id": "uuid",
      "shared_with_user_id": "uuid",
      "shared_with_user": {
        "id": "uuid",
        "display_name": "John Doe"
      },
      "permission": "read",
      "created_at": "2026-01-23T12:00:00Z",
      "created_by": "uuid"
    }
  ]
}
```

---

### POST /api/trackers/:trackerId/shares

**201 Created:**

```json
{
  "id": "uuid",
  "tracker_id": "uuid",
  "shared_with_user_id": "uuid",
  "shared_with_user": {
    "id": "uuid",
    "display_name": "John Doe"
  },
  "permission": "read",
  "created_at": "2026-01-23T12:00:00Z",
  "created_by": "uuid"
}
```

---

### DELETE /api/trackers/:trackerId/shares/:shareId

**204 No Content** - Brak body

---

## 5. Przepływ danych

### GET /api/trackers/:trackerId/shares

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Request    │────▶│  JwtAuthGuard│────▶│  Controller  │────▶│   Service    │
│  (JWT Token) │     │  (validates) │     │  (validates  │     │  (business   │
│              │     │              │     │   trackerId) │     │   logic)     │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
                                                                      ▼
                                                              ┌──────────────┐
                                                              │   Supabase   │
                                                              │  (database)  │
                                                              └──────────────┘
                                                                      │
                                          1. Check tracker exists + ownership
                                          2. Fetch shares with user data (JOIN)
                                                                      │
                                                                      ▼
                                                              ┌──────────────┐
                                                              │   Response   │
                                                              │  (200 OK)    │
                                                              └──────────────┘
```

### POST /api/trackers/:trackerId/shares

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Request    │────▶│ JwtAuthGuard │────▶│  Controller  │────▶│   Service    │
│  (JWT + Body)│     │  (validates) │     │  (validates  │     │  (business   │
│              │     │              │     │   DTO)       │     │   logic)     │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
                                                                      ▼
                                                              ┌──────────────┐
                                                              │   Supabase   │
                                                              └──────────────┘
                                                                      │
                                          1. Check tracker exists + ownership
                                          2. Find user by email (auth.users)
                                          3. Check if share already exists
                                          4. Create share record
                                          5. Fetch share with user data
                                                                      │
                                                                      ▼
                                                              ┌──────────────┐
                                                              │   Response   │
                                                              │ (201 Created)│
                                                              └──────────────┘
```

### DELETE /api/trackers/:trackerId/shares/:shareId

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Request    │────▶│ JwtAuthGuard │────▶│  Controller  │────▶│   Service    │
│  (JWT Token) │     │  (validates) │     │  (validates  │     │  (business   │
│              │     │              │     │   params)    │     │   logic)     │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
                                                                      ▼
                                                              ┌──────────────┐
                                                              │   Supabase   │
                                                              └──────────────┘
                                                                      │
                                          1. Check tracker exists + ownership
                                          2. Check share exists + belongs to tracker
                                          3. Delete share record
                                                                      │
                                                                      ▼
                                                              ┌──────────────┐
                                                              │   Response   │
                                                              │(204 No Cont.)│
                                                              └──────────────┘
```

---

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

- Wszystkie endpointy wymagają ważnego tokena JWT w nagłówku `Authorization: Bearer <token>`
- Token jest walidowany przez `JwtAuthGuard` z wykorzystaniem Supabase JWT secret
- Nieważny/wygasły token zwraca `401 Unauthorized`

### Autoryzacja

- **Tylko właściciel trackera** może zarządzać udostępnieniami
- Weryfikacja właścicielstwa: `tracker.user_id === currentUser.id`
- Brak uprawnień zwraca `403 Forbidden`

### Walidacja danych wejściowych

- UUID parametry (`trackerId`, `shareId`) muszą być walidowane jako prawidłowe UUID
- Email musi być w prawidłowym formacie (class-validator `@IsEmail`)
- Permission musi być `read` lub `write`

### Ochrona przed atakami

- **Self-sharing prevention:** użytkownik nie może udostępnić trackera samemu sobie
- **Duplicate prevention:** `UNIQUE(tracker_id, shared_with_user_id)` na poziomie bazy
- **SQL Injection:** Supabase SDK używa parametryzowanych zapytań
- **Rate limiting:** implementacja przez `@nestjs/throttler` (osobna konfiguracja)

### Prywatność danych

- Email użytkownika jest używany tylko do wyszukiwania, nie jest zwracany w odpowiedzi
- Zwracane są tylko `id` i `display_name` użytkownika

---

## 7. Obsługa błędów

### GET /api/trackers/:trackerId/shares

| Kod | Scenariusz                                | Wiadomość                                                     |
| --- | ----------------------------------------- | ------------------------------------------------------------- |
| 401 | Brak/nieważny token JWT                   | `Unauthorized`                                                |
| 403 | Użytkownik nie jest właścicielem trackera | `You don't have permission to manage shares for this tracker` |
| 404 | Tracker nie istnieje lub został usunięty  | `Tracker not found`                                           |
| 500 | Błąd bazy danych                          | `Internal server error`                                       |

### POST /api/trackers/:trackerId/shares

| Kod | Scenariusz                                | Wiadomość                                         |
| --- | ----------------------------------------- | ------------------------------------------------- |
| 400 | Nieprawidłowy format email                | `shared_with_email must be a valid email address` |
| 400 | Brak wymaganego pola                      | `<field> is required`                             |
| 400 | Nieprawidłowa wartość permission          | `permission must be either read or write`         |
| 400 | Próba udostępnienia samemu sobie          | `Cannot share tracker with yourself`              |
| 401 | Brak/nieważny token JWT                   | `Unauthorized`                                    |
| 403 | Użytkownik nie jest właścicielem trackera | `You don't have permission to share this tracker` |
| 404 | Tracker nie istnieje                      | `Tracker not found`                               |
| 404 | Użytkownik o podanym emailu nie istnieje  | `User with this email not found`                  |
| 409 | Udostępnienie już istnieje                | `Tracker is already shared with this user`        |
| 500 | Błąd bazy danych                          | `Internal server error`                           |

### DELETE /api/trackers/:trackerId/shares/:shareId

| Kod | Scenariusz                                         | Wiadomość                                                     |
| --- | -------------------------------------------------- | ------------------------------------------------------------- |
| 401 | Brak/nieważny token JWT                            | `Unauthorized`                                                |
| 403 | Użytkownik nie jest właścicielem trackera          | `You don't have permission to manage shares for this tracker` |
| 404 | Tracker nie istnieje                               | `Tracker not found`                                           |
| 404 | Share nie istnieje lub nie należy do tego trackera | `Share not found`                                             |
| 500 | Błąd bazy danych                                   | `Internal server error`                                       |

---

## 8. Rozważania dotyczące wydajności

### Zapytania do bazy danych

1. **Optymalizacja JOIN dla GET:**
   - Użycie pojedynczego zapytania z JOIN zamiast N+1 queries
   - Zapytanie: `tracker_shares` JOIN `profiles` (dla shared_with_user)

2. **Indeksy:**
   - `tracker_shares.tracker_id` - już istnieje (FK)
   - `tracker_shares.shared_with_user_id` - już istnieje (FK)
   - `UNIQUE(tracker_id, shared_with_user_id)` - zapobiega duplikatom

3. **Wyszukiwanie użytkownika po emailu:**
   - Wymaga zapytania do `auth.users` (Supabase Auth)
   - Rozważyć cache dla często wyszukiwanych emaili (przyszła optymalizacja)

### Ograniczenia

- Brak paginacji dla listy shares (założenie: mała liczba shares per tracker)
- Jeśli w przyszłości potrzebna paginacja, dodać parametry `page` i `limit`

---

## 9. Etapy wdrożenia

### Krok 1: Utworzenie DTO

Utworzyć plik `apps/api/src/trackers/dto/create-tracker-share.dto.ts`:

```typescript
import { IsEmail, IsNotEmpty, IsIn } from 'class-validator';

export class CreateTrackerShareDto {
  @IsEmail({}, { message: 'shared_with_email must be a valid email address' })
  @IsNotEmpty({ message: 'shared_with_email is required' })
  shared_with_email: string;

  @IsIn(['read', 'write'], {
    message: 'permission must be either read or write',
  })
  @IsNotEmpty({ message: 'permission is required' })
  permission: 'read' | 'write';
}
```

### Krok 2: Utworzenie TrackerSharesService

Utworzyć plik `apps/api/src/trackers/tracker-shares.service.ts` z metodami:

```typescript
@Injectable()
export class TrackerSharesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Sprawdza czy tracker istnieje i należy do użytkownika
   */
  private async validateTrackerOwnership(
    trackerId: string,
    userId: string
  ): Promise<void>;

  /**
   * Pobiera listę udostępnień dla trackera
   */
  async findAllByTracker(
    trackerId: string,
    userId: string
  ): Promise<TrackerShareListResponseDto>;

  /**
   * Tworzy nowe udostępnienie
   */
  async create(
    trackerId: string,
    userId: string,
    dto: CreateTrackerShareDto
  ): Promise<TrackerShareResponseDto>;

  /**
   * Usuwa udostępnienie
   */
  async remove(
    trackerId: string,
    shareId: string,
    userId: string
  ): Promise<void>;
}
```

### Krok 3: Implementacja metod serwisu

#### 3.1 `validateTrackerOwnership`

```typescript
private async validateTrackerOwnership(trackerId: string, userId: string): Promise<Tables<'trackers'>> {
  const supabase = this.supabaseService.getAdminClient();

  const { data: tracker, error } = await supabase
    .from('trackers')
    .select('*')
    .eq('id', trackerId)
    .is('deleted_at', null)
    .single();

  if (error || !tracker) {
    throw new NotFoundException('Tracker not found');
  }

  if (tracker.user_id !== userId) {
    throw new ForbiddenException('You don\'t have permission to manage shares for this tracker');
  }

  return tracker;
}
```

#### 3.2 `findAllByTracker`

```typescript
async findAllByTracker(trackerId: string, userId: string): Promise<TrackerShareListResponseDto> {
  await this.validateTrackerOwnership(trackerId, userId);

  const supabase = this.supabaseService.getAdminClient();

  const { data: shares, error } = await supabase
    .from('tracker_shares')
    .select(`
      id,
      tracker_id,
      shared_with_user_id,
      permission,
      created_at,
      created_by,
      profiles!tracker_shares_shared_with_user_id_fkey (
        id,
        display_name
      )
    `)
    .eq('tracker_id', trackerId);

  if (error) {
    this.logger.error(`Failed to fetch shares for tracker ${trackerId}`, error);
    throw new InternalServerErrorException('Failed to fetch tracker shares');
  }

  return {
    data: shares.map(share => ({
      id: share.id,
      tracker_id: share.tracker_id,
      shared_with_user_id: share.shared_with_user_id,
      shared_with_user: {
        id: share.profiles.id,
        display_name: share.profiles.display_name,
      },
      permission: share.permission as SharePermission,
      created_at: share.created_at,
      created_by: share.created_by,
    })),
  };
}
```

#### 3.3 `create`

```typescript
async create(
  trackerId: string,
  userId: string,
  dto: CreateTrackerShareDto
): Promise<TrackerShareResponseDto> {
  await this.validateTrackerOwnership(trackerId, userId);

  const supabase = this.supabaseService.getAdminClient();

  // 1. Find user by email in auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  const targetUser = authData?.users.find(u => u.email === dto.shared_with_email);

  if (!targetUser) {
    throw new NotFoundException('User with this email not found');
  }

  // 2. Prevent self-sharing
  if (targetUser.id === userId) {
    throw new BadRequestException('Cannot share tracker with yourself');
  }

  // 3. Check if share already exists
  const { data: existingShare } = await supabase
    .from('tracker_shares')
    .select('id')
    .eq('tracker_id', trackerId)
    .eq('shared_with_user_id', targetUser.id)
    .single();

  if (existingShare) {
    throw new ConflictException('Tracker is already shared with this user');
  }

  // 4. Create share
  const { data: share, error: insertError } = await supabase
    .from('tracker_shares')
    .insert({
      tracker_id: trackerId,
      shared_with_user_id: targetUser.id,
      permission: dto.permission,
      created_by: userId,
    })
    .select()
    .single();

  if (insertError) {
    this.logger.error(`Failed to create share for tracker ${trackerId}`, insertError);
    throw new InternalServerErrorException('Failed to create tracker share');
  }

  // 5. Fetch user display_name from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('id', targetUser.id)
    .single();

  return {
    id: share.id,
    tracker_id: share.tracker_id,
    shared_with_user_id: share.shared_with_user_id,
    shared_with_user: {
      id: profile?.id ?? targetUser.id,
      display_name: profile?.display_name ?? 'Unknown User',
    },
    permission: share.permission as SharePermission,
    created_at: share.created_at,
    created_by: share.created_by,
  };
}
```

#### 3.4 `remove`

```typescript
async remove(trackerId: string, shareId: string, userId: string): Promise<void> {
  await this.validateTrackerOwnership(trackerId, userId);

  const supabase = this.supabaseService.getAdminClient();

  // Check if share exists and belongs to this tracker
  const { data: share, error: fetchError } = await supabase
    .from('tracker_shares')
    .select('id')
    .eq('id', shareId)
    .eq('tracker_id', trackerId)
    .single();

  if (fetchError || !share) {
    throw new NotFoundException('Share not found');
  }

  // Delete share
  const { error: deleteError } = await supabase
    .from('tracker_shares')
    .delete()
    .eq('id', shareId);

  if (deleteError) {
    this.logger.error(`Failed to delete share ${shareId}`, deleteError);
    throw new InternalServerErrorException('Failed to delete tracker share');
  }

  this.logger.log(`Share ${shareId} deleted from tracker ${trackerId}`);
}
```

### Krok 4: Dodanie metod do TrackersController

Rozszerzyć `apps/api/src/trackers/trackers.controller.ts`:

```typescript
@Controller('trackers')
@UseGuards(JwtAuthGuard)
export class TrackersController {
  constructor(
    private readonly trackersService: TrackersService,
    private readonly trackerSharesService: TrackerSharesService
  ) {}

  // ... existing methods ...

  /**
   * GET /api/trackers/:trackerId/shares
   */
  @Get(':trackerId/shares')
  async getShares(
    @CurrentUser() user: AuthUser,
    @Param('trackerId', ParseUUIDPipe) trackerId: string
  ): Promise<TrackerShareListResponseDto> {
    return this.trackerSharesService.findAllByTracker(trackerId, user.id);
  }

  /**
   * POST /api/trackers/:trackerId/shares
   */
  @Post(':trackerId/shares')
  @HttpCode(HttpStatus.CREATED)
  async createShare(
    @CurrentUser() user: AuthUser,
    @Param('trackerId', ParseUUIDPipe) trackerId: string,
    @Body() createShareDto: CreateTrackerShareDto
  ): Promise<TrackerShareResponseDto> {
    return this.trackerSharesService.create(trackerId, user.id, createShareDto);
  }

  /**
   * DELETE /api/trackers/:trackerId/shares/:shareId
   */
  @Delete(':trackerId/shares/:shareId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteShare(
    @CurrentUser() user: AuthUser,
    @Param('trackerId', ParseUUIDPipe) trackerId: string,
    @Param('shareId', ParseUUIDPipe) shareId: string
  ): Promise<void> {
    return this.trackerSharesService.remove(trackerId, shareId, user.id);
  }
}
```

### Krok 5: Aktualizacja TrackersModule

Zaktualizować `apps/api/src/trackers/trackers.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TrackersService } from './trackers.service';
import { TrackerSharesService } from './tracker-shares.service';
import { TrackersController } from './trackers.controller';
import { SupabaseModule } from '../supabase';
import { AuthModule } from '../auth';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [TrackersController],
  providers: [TrackersService, TrackerSharesService],
  exports: [TrackersService, TrackerSharesService],
})
export class TrackersModule {}
```

### Krok 6: Eksport z index.ts

Zaktualizować `apps/api/src/trackers/index.ts`:

```typescript
export { TrackersModule } from './trackers.module';
export { TrackersService } from './trackers.service';
export { TrackerSharesService } from './tracker-shares.service';
```

### Krok 7: Napisanie testów jednostkowych

Utworzyć `apps/api/src/trackers/tracker-shares.service.spec.ts`:

```typescript
describe('TrackerSharesService', () => {
  describe('findAllByTracker', () => {
    it('should return shares for tracker owner', async () => {
      /* ... */
    });
    it('should throw ForbiddenException for non-owner', async () => {
      /* ... */
    });
    it('should throw NotFoundException for non-existent tracker', async () => {
      /* ... */
    });
  });

  describe('create', () => {
    it('should create share successfully', async () => {
      /* ... */
    });
    it('should throw NotFoundException for non-existent user email', async () => {
      /* ... */
    });
    it('should throw BadRequestException for self-sharing', async () => {
      /* ... */
    });
    it('should throw ConflictException for duplicate share', async () => {
      /* ... */
    });
  });

  describe('remove', () => {
    it('should delete share successfully', async () => {
      /* ... */
    });
    it('should throw NotFoundException for non-existent share', async () => {
      /* ... */
    });
  });
});
```

### Krok 8: Testowanie manualne

1. **GET /api/trackers/:trackerId/shares**
   - [ ] Sprawdzić czy zwraca listę shares dla właściciela
   - [ ] Sprawdzić 403 dla nie-właściciela
   - [ ] Sprawdzić 404 dla nieistniejącego trackera
   - [ ] Sprawdzić 401 bez tokena

2. **POST /api/trackers/:trackerId/shares**
   - [ ] Sprawdzić pomyślne utworzenie share'a
   - [ ] Sprawdzić 400 dla nieprawidłowego emaila
   - [ ] Sprawdzić 400 dla self-sharing
   - [ ] Sprawdzić 404 dla nieistniejącego użytkownika
   - [ ] Sprawdzić 409 dla duplikatu

3. **DELETE /api/trackers/:trackerId/shares/:shareId**
   - [ ] Sprawdzić pomyślne usunięcie
   - [ ] Sprawdzić 404 dla nieistniejącego share'a
   - [ ] Sprawdzić 403 dla nie-właściciela

---

## 10. Struktura plików po implementacji

```
apps/api/src/trackers/
├── dto/
│   ├── create-tracker.dto.ts
│   ├── create-tracker.dto.spec.ts
│   └── create-tracker-share.dto.ts          # NOWY
├── index.ts                                  # ZAKTUALIZOWANY
├── trackers.controller.ts                    # ZAKTUALIZOWANY
├── trackers.module.ts                        # ZAKTUALIZOWANY
├── trackers.service.ts
├── trackers.service.spec.ts
├── tracker-shares.service.ts                 # NOWY
└── tracker-shares.service.spec.ts            # NOWY
```
