# Templates Module

Module obsługujący pakiety szablonów trackerów używanych podczas onboardingu użytkowników.

## Endpoints

### GET /api/templates/packages

Pobiera listę wszystkich aktywnych pakietów szablonów wraz z zawartymi w nich szablonami trackerów.

**Autoryzacja:** Wymagany Bearer JWT Token

**Response 200:**

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
          "config": {},
          "icon": "scale",
          "color": "#FF5733",
          "display_order": 0
        }
      ]
    }
  ]
}
```

**Errors:**

- `401 Unauthorized` - Brak lub nieprawidłowy token JWT
- `500 Internal Server Error` - Błąd zapytania do bazy danych

---

### POST /api/templates/packages/:packageId/apply

Aplikuje wybrany pakiet szablonów, tworząc nowe trackery dla zalogowanego użytkownika.

**Autoryzacja:** Wymagany Bearer JWT Token

**Path Parameters:**

- `packageId` (UUID, required) - Identyfikator pakietu szablonów

**Response 201:**

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

**Errors:**

- `400 Bad Request` - Nieprawidłowy format packageId (nie jest UUID)
- `401 Unauthorized` - Brak lub nieprawidłowy token JWT
- `403 Forbidden` - Przekroczono limit trackerów użytkownika
- `404 Not Found` - Pakiet nie został znaleziony lub jest nieaktywny
- `500 Internal Server Error` - Błąd operacji na bazie danych

---

## Logika biznesowa

### findAllPackages()

1. Pobiera wszystkie aktywne pakiety (`is_active = true`) z tabeli `template_packages`
2. Dla każdego pakietu pobiera powiązane szablony trackerów z tabeli `tracker_templates`
3. Sortuje pakiety według `display_order` (ASC)
4. Sortuje szablony trackerów według `display_order` (ASC) wewnątrz każdego pakietu
5. Mapuje dane do DTO zgodnego z typami w `@kipio/shared`

### applyPackage(packageId, userId)

1. **Walidacja pakietu:**
   - Pobiera pakiet z `template_packages` po `packageId`
   - Sprawdza czy pakiet istnieje i jest aktywny (`is_active = true`)
   - Rzuca `NotFoundException` jeśli pakiet nie istnieje lub nieaktywny

2. **Sprawdzenie limitu:**
   - Pobiera `trackers_limit` z profilu użytkownika (`profiles`)
   - Liczy istniejące trackery użytkownika (`deleted_at IS NULL`)
   - Waliduje czy: `current_count + templates_count <= trackers_limit`
   - Rzuca `ForbiddenException` jeśli limit zostanie przekroczony

3. **Tworzenie trackerów:**
   - Sortuje szablony według `display_order`
   - Dla każdego szablonu tworzy nowy tracker z:
     - `user_id` - ID zalogowanego użytkownika
     - `name`, `data_type`, `unit`, `config`, `color`, `icon` - z szablonu
     - `display_order` - `current_count + index` (zachowuje kolejność)
   - Wykonuje batch insert do tabeli `trackers`
   - Zwraca listę utworzonych trackerów

---

## Struktura plików

```
templates/
├── dto/
│   ├── index.ts                 # Eksport DTO
│   └── package-id.param.ts      # Walidacja UUID dla packageId
├── entities/                    # (puste - używamy typów Supabase)
├── index.ts                     # Eksport publiczny modułu
├── README.md                    # Ta dokumentacja
├── templates.controller.ts      # REST endpoints
├── templates.module.ts          # Konfiguracja NestJS
├── templates.service.spec.ts    # Testy jednostkowe
└── templates.service.ts         # Logika biznesowa
```

---

## Typy

Moduł używa typów z `@kipio/shared`:

- `TemplatePackageResponseDto`
- `TrackerTemplateResponseDto`
- `TemplatePackageListResponseDto`
- `ApplyPackageResponseDto`
- `CreatedTrackerSummaryDto`

Typy encji bazodanowych generowane są automatycznie przez Supabase w `apps/api/db/database.types.ts`:

- `Tables<'template_packages'>`
- `Tables<'tracker_templates'>`

---

## Testy

### Testy jednostkowe (templates.service.spec.ts)

**findAllPackages():**

- ✅ Zwraca listę aktywnych pakietów z szablonami trackerów
- ✅ Sortuje pakiety według `display_order`
- ✅ Sortuje szablony według `display_order` wewnątrz pakietów
- ✅ Obsługuje puste wyniki
- ✅ Obsługuje pola `null` w opcjonalnych polach
- ✅ Rzuca `InternalServerErrorException` przy błędzie bazy

**applyPackage():**

- ✅ Tworzy trackery z szablonów pomyślnie
- ✅ Rzuca `NotFoundException` gdy pakiet nie istnieje
- ✅ Rzuca `NotFoundException` gdy pakiet nieaktywny
- ✅ Rzuca `ForbiddenException` przy przekroczeniu limitu trackerów
- ✅ Rzuca `InternalServerErrorException` przy błędzie pobierania profilu
- ✅ Rzuca `InternalServerErrorException` przy błędzie liczenia trackerów
- ✅ Rzuca `InternalServerErrorException` przy błędzie insertu
- ✅ Ustawia poprawny `display_order` dla nowych trackerów
- ✅ Zachowuje kolejność szablonów zgodnie z `display_order`

Uruchom testy:

```bash
pnpm test templates.service.spec
```

---

## Bezpieczeństwo

### Uwierzytelnianie

- Wszystkie endpointy chronione przez `JwtAuthGuard`
- Token JWT walidowany przez klucz publiczny Supabase
- `userId` ekstrahowany z tokenu (`sub` claim)

### Autoryzacja

- **GET /packages:** Dostępny dla wszystkich zalogowanych użytkowników
- **POST /apply:** Sprawdzenie limitu trackerów przed utworzeniem

### Walidacja

- `packageId` walidowany jako UUID (class-validator)
- Sprawdzenie czy pakiet jest aktywny przed aplikowaniem
- Walidacja limitu trackerów użytkownika

---

## Wydajność

### Optymalizacje zapytań

- `findAllPackages()`: JOIN z `tracker_templates` w jednym zapytaniu
- `applyPackage()`: Batch insert dla wszystkich trackerów jednocześnie
- Filtrowanie `is_active = true` na poziomie bazy danych
- Sortowanie po `display_order` w zapytaniu SQL

### Indeksy bazodanowe (zalecane)

- `template_packages(is_active, display_order)`
- `tracker_templates(package_id, display_order)`
- `trackers(user_id, deleted_at)`

---

## Przykłady użycia

### cURL - Pobieranie pakietów

```bash
curl -X GET http://localhost:3000/api/templates/packages \
  -H "Authorization: Bearer <your_jwt_token>"
```

### cURL - Aplikowanie pakietu

```bash
curl -X POST http://localhost:3000/api/templates/packages/550e8400-e29b-41d4-a716-446655440000/apply \
  -H "Authorization: Bearer <your_jwt_token>"
```

### JavaScript/TypeScript

```typescript
import { SupabaseClient } from '@supabase/supabase-js';

// Pobieranie pakietów
async function getTemplatePackages(supabase: SupabaseClient) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch('http://localhost:3000/api/templates/packages', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  return response.json();
}

// Aplikowanie pakietu
async function applyPackage(supabase: SupabaseClient, packageId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(
    `http://localhost:3000/api/templates/packages/${packageId}/apply`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  return response.json();
}
```
