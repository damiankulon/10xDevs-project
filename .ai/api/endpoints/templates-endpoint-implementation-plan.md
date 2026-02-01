# API Endpoint Implementation Plan: Template Endpoints

## 1. Przegląd punktu końcowego

Moduł Template Endpoints obsługuje dwa endpointy związane z pakietami szablonów trackerów używanych podczas onboardingu użytkowników:

1. **GET /api/templates/packages** - Pobiera listę wszystkich dostępnych pakietów szablonów wraz z zawartymi w nich szablonami trackerów
2. **POST /api/templates/packages/:packageId/apply** - Aplikuje wybrany pakiet szablonów, tworząc nowe trackery dla zalogowanego użytkownika

Endpointy te umożliwiają użytkownikom szybkie rozpoczęcie pracy z aplikacją poprzez wybór predefiniowanych zestawów trackerów.

## 2. Szczegóły żądania

### GET /api/templates/packages

| Atrybut     | Wartość                   |
| ----------- | ------------------------- |
| Metoda HTTP | GET                       |
| URL         | `/api/templates/packages` |
| Autoryzacja | Bearer JWT Token          |

**Parametry:**

- Wymagane: brak
- Opcjonalne: brak

**Headers:**

```
Authorization: Bearer <jwt_token>
```

---

### POST /api/templates/packages/:packageId/apply

| Atrybut     | Wartość                                    |
| ----------- | ------------------------------------------ |
| Metoda HTTP | POST                                       |
| URL         | `/api/templates/packages/:packageId/apply` |
| Autoryzacja | Bearer JWT Token                           |

**Parametry:**

- Wymagane:
  - `packageId` (UUID) - identyfikator pakietu szablonów w ścieżce URL
- Opcjonalne: brak

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:** brak

## 3. Wykorzystywane typy

### Istniejące typy z `packages/shared/src/types.ts`:

```typescript
// Response DTOs
interface TrackerTemplateResponseDto {
  id: string;
  name: string;
  data_type: DataType;
  unit?: string;
  icon?: string;
  color?: string;
}

interface TemplatePackageResponseDto {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  display_order: number;
  trackers: TrackerTemplateResponseDto[];
}

interface TemplatePackageListResponseDto {
  data: TemplatePackageResponseDto[];
}

interface CreatedTrackerSummaryDto {
  id: string;
  name: string;
  data_type: DataType;
}

interface ApplyPackageResponseDto extends MessageResponseDto {
  created_trackers: CreatedTrackerSummaryDto[];
}
```

### Nowe typy do utworzenia w module NestJS:

```typescript
// apps/api/src/templates/dto/package-id.param.ts
import { IsUUID } from 'class-validator';

export class PackageIdParam {
  @IsUUID()
  packageId: string;
}
```

## 4. Szczegóły odpowiedzi

### GET /api/templates/packages

**Success Response (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Health",
      "description": "Track your health metrics: weight, sleep, water intake",
      "icon": "heart",
      "display_order": 1,
      "trackers": [
        {
          "id": "uuid",
          "name": "Weight",
          "data_type": "number",
          "unit": "kg",
          "icon": "scale",
          "color": "#FF5733"
        },
        {
          "id": "uuid",
          "name": "Sleep",
          "data_type": "number",
          "unit": "hours",
          "icon": "moon",
          "color": "#3498DB"
        }
      ]
    }
  ]
}
```

**Error Responses:**
| Status | Opis |
|--------|------|
| 401 Unauthorized | Nieprawidłowy lub brakujący token JWT |

---

### POST /api/templates/packages/:packageId/apply

**Success Response (201 Created):**

```json
{
  "message": "Package applied successfully",
  "created_trackers": [
    {
      "id": "uuid",
      "name": "Weight",
      "data_type": "number"
    },
    {
      "id": "uuid",
      "name": "Sleep",
      "data_type": "number"
    }
  ]
}
```

**Error Responses:**
| Status | Opis |
|--------|------|
| 401 Unauthorized | Nieprawidłowy lub brakujący token JWT |
| 403 Forbidden | Przekroczono limit trackerów użytkownika |
| 404 Not Found | Pakiet nie został znaleziony |

## 5. Przepływ danych

### GET /api/templates/packages

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Client  │────▶│  AuthGuard   │────▶│ TemplatesCtrl   │────▶│ TemplatesService │
└──────────┘     └──────────────┘     └─────────────────┘     └──────────────────┘
                                                                       │
                                                                       ▼
┌──────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Client  │◀────│   Response   │◀────│ TemplatesCtrl   │◀────│    Supabase DB   │
└──────────┘     └──────────────┘     └─────────────────┘     └──────────────────┘
```

1. Klient wysyła żądanie GET z tokenem JWT
2. `JwtAuthGuard` waliduje token i wyciąga `userId`
3. `TemplatesController` wywołuje `TemplatesService.findAllPackages()`
4. `TemplatesService` pobiera pakiety z tabel `template_packages` i `tracker_templates`
5. Dane są mapowane na `TemplatePackageListResponseDto`
6. Odpowiedź zwracana do klienta

---

### POST /api/templates/packages/:packageId/apply

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Client  │────▶│  AuthGuard   │────▶│ TemplatesCtrl   │────▶│ TemplatesService │
└──────────┘     └──────────────┘     └─────────────────┘     └──────────────────┘
                                                                       │
                                               ┌───────────────────────┘
                                               ▼
                                      ┌──────────────────┐
                                      │  Validate Limit  │
                                      └──────────────────┘
                                               │
                                               ▼
                                      ┌──────────────────┐
                                      │  Create Trackers │
                                      └──────────────────┘
                                               │
                                               ▼
┌──────────┐     ┌──────────────┐     ┌──────────────────┐
│  Client  │◀────│   Response   │◀────│    Supabase DB   │
└──────────┘     └──────────────┘     └──────────────────┘
```

1. Klient wysyła żądanie POST z tokenem JWT i `packageId`
2. `JwtAuthGuard` waliduje token i wyciąga `userId`
3. `ValidationPipe` waliduje `packageId` jako UUID
4. `TemplatesController` wywołuje `TemplatesService.applyPackage(packageId, userId)`
5. `TemplatesService`:
   - Pobiera pakiet z `template_packages` (sprawdza czy istnieje i jest aktywny)
   - Pobiera profil użytkownika z `profiles` (sprawdza `trackers_limit`)
   - Liczy istniejące trackery użytkownika
   - Waliduje czy nowe trackery nie przekroczą limitu
   - Tworzy trackery na podstawie szablonów z `tracker_templates`
6. Odpowiedź z listą utworzonych trackerów zwracana do klienta

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

- Oba endpointy wymagają ważnego tokena JWT w nagłówku `Authorization`
- Token jest walidowany przez `JwtAuthGuard` z użyciem klucza publicznego Supabase
- `userId` jest wyciągany z tokena i przekazywany do serwisu

### Autoryzacja

- **GET /api/templates/packages**: Dostępny dla wszystkich zalogowanych użytkowników
- **POST /api/templates/packages/:packageId/apply**:
  - Sprawdzenie czy użytkownik nie przekracza limitu trackerów (`profiles.trackers_limit`)
  - Weryfikacja czy pakiet jest aktywny (`template_packages.is_active = true`)

### Walidacja danych wejściowych

- `packageId` walidowany jako UUID przez `class-validator`
- Brak body w żądaniach - minimalizacja powierzchni ataku

### Ochrona przed atakami

- SQL Injection: TypeORM z parametryzowanymi zapytaniami
- Rate limiting: `@nestjs/throttler` na poziomie kontrolera

## 7. Obsługa błędów

### GET /api/templates/packages

| Scenariusz               | Kod HTTP | Odpowiedź                                                   |
| ------------------------ | -------- | ----------------------------------------------------------- |
| Brak tokena JWT          | 401      | `{ "statusCode": 401, "message": "Unauthorized" }`          |
| Nieprawidłowy token JWT  | 401      | `{ "statusCode": 401, "message": "Unauthorized" }`          |
| Token wygasł             | 401      | `{ "statusCode": 401, "message": "Unauthorized" }`          |
| Błąd serwera/bazy danych | 500      | `{ "statusCode": 500, "message": "Internal server error" }` |

### POST /api/templates/packages/:packageId/apply

| Scenariusz                     | Kod HTTP | Odpowiedź                                                                                |
| ------------------------------ | -------- | ---------------------------------------------------------------------------------------- |
| Brak tokena JWT                | 401      | `{ "statusCode": 401, "message": "Unauthorized" }`                                       |
| Nieprawidłowy token JWT        | 401      | `{ "statusCode": 401, "message": "Unauthorized" }`                                       |
| Nieprawidłowy format packageId | 400      | `{ "statusCode": 400, "message": ["packageId must be a UUID"], "error": "Bad Request" }` |
| Pakiet nie istnieje            | 404      | `{ "statusCode": 404, "message": "Package not found" }`                                  |
| Pakiet nieaktywny              | 404      | `{ "statusCode": 404, "message": "Package not found" }`                                  |
| Przekroczono limit trackerów   | 403      | `{ "statusCode": 403, "message": "Would exceed tracker limit" }`                         |
| Błąd serwera/bazy danych       | 500      | `{ "statusCode": 500, "message": "Internal server error" }`                              |

### Implementacja błędów w serwisie

```typescript
// apps/api/src/templates/templates.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

// W metodzie applyPackage:
if (!package || !package.is_active) {
  throw new NotFoundException('Package not found');
}

if (currentTrackersCount + templatesCount > profile.trackers_limit) {
  throw new ForbiddenException('Would exceed tracker limit');
}
```

## 8. Rozważania dotyczące wydajności

### Optymalizacja zapytań

1. **GET /api/templates/packages**:
   - Użycie JOIN do pobrania pakietów z szablonami w jednym zapytaniu
   - Sortowanie po `display_order` na poziomie bazy danych
   - Filtrowanie `is_active = true` w zapytaniu

```sql
SELECT tp.*, tt.*
FROM template_packages tp
LEFT JOIN tracker_templates tt ON tt.package_id = tp.id
WHERE tp.is_active = true
ORDER BY tp.display_order, tt.display_order
```

2. **POST /api/templates/packages/:packageId/apply**:
   - Batch insert dla tworzenia wielu trackerów jednocześnie
   - Użycie transakcji dla atomowości operacji

### Cachowanie

- Rozważenie cachowania listy pakietów (rzadko się zmienia)
- Cache invalidation przy zmianach w `template_packages` lub `tracker_templates`

### Indeksy bazodanowe

Upewnij się, że istnieją indeksy:

- `template_packages(is_active, display_order)`
- `tracker_templates(package_id, display_order)`
- `trackers(user_id)` - dla szybkiego liczenia trackerów użytkownika

## 9. Etapy wdrożenia

### Krok 1: Utworzenie modułu Templates

```bash
# Struktura plików
apps/api/src/templates/
├── templates.module.ts
├── templates.controller.ts
├── templates.service.ts
├── dto/
│   └── package-id.param.ts
└── entities/
    ├── template-package.entity.ts
    └── tracker-template.entity.ts
```

### Krok 2: Definicja encji TypeORM

**template-package.entity.ts:**

```typescript
@Entity('template_packages')
export class TemplatePackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ length: 50, nullable: true })
  icon: string;

  @Column({ default: 0 })
  display_order: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => TrackerTemplate, (template) => template.package)
  trackers: TrackerTemplate[];
}
```

**tracker-template.entity.ts:**

```typescript
@Entity('tracker_templates')
export class TrackerTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  package_id: string;

  @Column({ length: 100 })
  name: string;

  @Column()
  data_type: string;

  @Column({ length: 20, nullable: true })
  unit: string;

  @Column('jsonb', { default: {} })
  config: Record<string, unknown>;

  @Column({ nullable: true })
  color: string;

  @Column({ length: 50, nullable: true })
  icon: string;

  @Column({ default: 0 })
  display_order: number;

  @ManyToOne(() => TemplatePackage, (pkg) => pkg.trackers)
  @JoinColumn({ name: 'package_id' })
  package: TemplatePackage;
}
```

### Krok 3: Implementacja DTO

**package-id.param.ts:**

```typescript
import { IsUUID } from 'class-validator';

export class PackageIdParam {
  @IsUUID('4', { message: 'packageId must be a valid UUID' })
  packageId: string;
}
```

### Krok 4: Implementacja serwisu

**templates.service.ts:**

```typescript
@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(TemplatePackage)
    private packageRepo: Repository<TemplatePackage>,
    @InjectRepository(TrackerTemplate)
    private templateRepo: Repository<TrackerTemplate>,
    @InjectRepository(Tracker)
    private trackerRepo: Repository<Tracker>,
    @InjectRepository(Profile)
    private profileRepo: Repository<Profile>
  ) {}

  async findAllPackages(): Promise<TemplatePackageListResponseDto> {
    const packages = await this.packageRepo.find({
      where: { is_active: true },
      relations: ['trackers'],
      order: { display_order: 'ASC' },
    });

    return {
      data: packages.map((pkg) => this.mapToResponseDto(pkg)),
    };
  }

  async applyPackage(
    packageId: string,
    userId: string
  ): Promise<ApplyPackageResponseDto> {
    // 1. Pobierz pakiet
    const pkg = await this.packageRepo.findOne({
      where: { id: packageId, is_active: true },
      relations: ['trackers'],
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    // 2. Sprawdź limit trackerów
    const profile = await this.profileRepo.findOne({
      where: { id: userId },
    });

    const currentCount = await this.trackerRepo.count({
      where: { user_id: userId, deleted_at: IsNull() },
    });

    if (currentCount + pkg.trackers.length > profile.trackers_limit) {
      throw new ForbiddenException('Would exceed tracker limit');
    }

    // 3. Utwórz trackery w transakcji
    const createdTrackers = await this.trackerRepo.manager.transaction(
      async (manager) => {
        const trackers = pkg.trackers.map((template, index) =>
          manager.create(Tracker, {
            user_id: userId,
            name: template.name,
            data_type: template.data_type,
            unit: template.unit,
            config: template.config,
            color: template.color,
            icon: template.icon,
            display_order: currentCount + index,
          })
        );
        return manager.save(trackers);
      }
    );

    return {
      message: 'Package applied successfully',
      created_trackers: createdTrackers.map((t) => ({
        id: t.id,
        name: t.name,
        data_type: t.data_type as DataType,
      })),
    };
  }

  private mapToResponseDto(pkg: TemplatePackage): TemplatePackageResponseDto {
    return {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      icon: pkg.icon,
      display_order: pkg.display_order,
      trackers: pkg.trackers
        .sort((a, b) => a.display_order - b.display_order)
        .map((t) => ({
          id: t.id,
          name: t.name,
          data_type: t.data_type as DataType,
          unit: t.unit,
          icon: t.icon,
          color: t.color,
        })),
    };
  }
}
```

### Krok 5: Implementacja kontrolera

**templates.controller.ts:**

```typescript
@Controller('templates')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get('packages')
  @HttpCode(HttpStatus.OK)
  async findAllPackages(): Promise<TemplatePackageListResponseDto> {
    return this.templatesService.findAllPackages();
  }

  @Post('packages/:packageId/apply')
  @HttpCode(HttpStatus.CREATED)
  async applyPackage(
    @Param() params: PackageIdParam,
    @CurrentUser() user: JwtPayload
  ): Promise<ApplyPackageResponseDto> {
    return this.templatesService.applyPackage(params.packageId, user.sub);
  }
}
```

### Krok 6: Konfiguracja modułu

**templates.module.ts:**

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      TemplatePackage,
      TrackerTemplate,
      Tracker,
      Profile,
    ]),
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
```

### Krok 7: Rejestracja modułu w AppModule

```typescript
// apps/api/src/app.module.ts
@Module({
  imports: [
    // ... inne importy
    TemplatesModule,
  ],
})
export class AppModule {}
```

### Krok 8: Testy jednostkowe

```typescript
// apps/api/src/templates/templates.service.spec.ts
describe('TemplatesService', () => {
  describe('findAllPackages', () => {
    it('should return list of active packages with trackers', async () => {
      // ...
    });

    it('should sort packages by display_order', async () => {
      // ...
    });
  });

  describe('applyPackage', () => {
    it('should create trackers from package templates', async () => {
      // ...
    });

    it('should throw NotFoundException when package not found', async () => {
      // ...
    });

    it('should throw ForbiddenException when exceeding tracker limit', async () => {
      // ...
    });
  });
});
```

### Krok 9: Testy E2E

```typescript
// apps/api/test/templates.e2e-spec.ts
describe('Templates (e2e)', () => {
  describe('GET /api/templates/packages', () => {
    it('should return 401 without auth token', () => {
      // ...
    });

    it('should return packages list with valid token', () => {
      // ...
    });
  });

  describe('POST /api/templates/packages/:packageId/apply', () => {
    it('should return 404 for non-existent package', () => {
      // ...
    });

    it('should return 403 when exceeding tracker limit', () => {
      // ...
    });

    it('should create trackers successfully', () => {
      // ...
    });
  });
});
```

### Krok 10: Dokumentacja API (Swagger)

```typescript
// Dodaj dekoratory Swagger do kontrolera
@ApiTags('templates')
@ApiBearerAuth()
@Controller('templates')
export class TemplatesController {
  @Get('packages')
  @ApiOperation({ summary: 'List all template packages' })
  @ApiResponse({ status: 200, type: TemplatePackageListResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAllPackages() {
    /* ... */
  }

  @Post('packages/:packageId/apply')
  @ApiOperation({ summary: 'Apply a template package' })
  @ApiParam({ name: 'packageId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, type: ApplyPackageResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Would exceed tracker limit' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async applyPackage() {
    /* ... */
  }
}
```

## 10. Checklist wdrożenia

- [ ] Utworzenie struktury plików modułu `templates`
- [ ] Implementacja encji TypeORM (`TemplatePackage`, `TrackerTemplate`)
- [ ] Implementacja DTO (`PackageIdParam`)
- [ ] Implementacja `TemplatesService` z metodami `findAllPackages` i `applyPackage`
- [ ] Implementacja `TemplatesController` z endpointami GET i POST
- [ ] Konfiguracja `TemplatesModule` i rejestracja w `AppModule`
- [ ] Dodanie dekoratorów Swagger dla dokumentacji API
- [ ] Napisanie testów jednostkowych dla serwisu
- [ ] Napisanie testów E2E dla kontrolera
- [ ] Weryfikacja indeksów bazodanowych
- [ ] Code review i merge do głównej gałęzi
