# Trackers Module

Moduł zarządzania trackerami użytkownika - metryki do śledzenia różnych aspektów życia.

## 📋 Przegląd

Moduł Trackers obsługuje CRUD operacje na trackerach oraz zaawansowane funkcje jak:

- Paginacja, filtrowanie i sortowanie
- Trackery współdzielone z innymi użytkownikami
- Statystyki i wykresy
- Soft delete
- Masowa zmiana kolejności wyświetlania

## 🔌 Endpointy API

### GET /api/trackers

Lista wszystkich trackerów użytkownika z paginacją.

**Query Parameters:**

- `page` (number, default: 1) - Numer strony
- `limit` (number, default: 20, max: 100) - Liczba elementów na stronie
- `sort_by` (string, default: "display_order") - Pole sortowania
- `sort_order` (string, default: "asc") - Kierunek sortowania (asc/desc)
- `is_active` (boolean, default: true) - Filtr po statusie aktywności
- `data_type` (string) - Filtr po typie danych (number/scale/boolean/text)
- `include_shared` (boolean, default: true) - Czy uwzględniać trackery współdzielone

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Weight",
      "data_type": "number",
      "unit": "kg",
      "is_owner": true,
      "shared_permission": null,
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

### GET /api/trackers/:id

Szczegóły pojedynczego trackera wraz ze statystykami.

**Response:** `200 OK`

```json
{
  "id": "uuid",
  "name": "Weight",
  "data_type": "number",
  "unit": "kg",
  "is_owner": true,
  "shared_permission": null,
  "stats": {
    "total_entries": 150,
    "first_entry_at": "2025-06-01T10:00:00Z",
    "last_entry_at": "2026-01-23T08:00:00Z"
  }
}
```

### POST /api/trackers

Tworzenie nowego trackera.

**Request Body:**

```json
{
  "name": "Energy Level",
  "data_type": "scale",
  "config": { "min": 1, "max": 10 },
  "color": "#4CAF50",
  "icon": "battery",
  "display_order": 2
}
```

**Response:** `201 Created`

### PATCH /api/trackers/:id

Aktualizacja istniejącego trackera.

**Request Body:** (wszystkie pola opcjonalne)

```json
{
  "name": "Updated Name",
  "unit": "lbs",
  "is_active": true
}
```

**Response:** `200 OK`

⚠️ **Uwaga:** Pole `data_type` nie może być zmienione po utworzeniu trackera.

### DELETE /api/trackers/:id

Usunięcie trackera (soft delete).

**Response:** `204 No Content`

### PATCH /api/trackers/reorder

Masowa aktualizacja kolejności wyświetlania trackerów.

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

**Response:** `200 OK`

```json
{
  "message": "Tracker order updated successfully",
  "updated_count": 3
}
```

### GET /api/trackers/:trackerId/stats

Szczegółowe statystyki dla trackera.

**Query Parameters:**

- `period` (string, default: "7d") - Okres: 7d, 30d, 90d, 1y, all

**Response:** `200 OK`

```json
{
  "tracker_id": "uuid",
  "period": "7d",
  "data_type": "number",
  "stats": {
    "count": 7,
    "average": 75,
    "min": 70,
    "max": 80,
    "median": 75,
    "std_dev": 2.5
  },
  "chart_data": {
    "labels": ["2026-01-26", "2026-01-27"],
    "values": [75, 76]
  },
  "heatmap_data": [{ "date": "2026-01-26", "count": 1, "value": 75 }]
}
```

## 🔒 Bezpieczeństwo

### Uwierzytelnianie

Wszystkie endpointy wymagają JWT token w nagłówku:

```
Authorization: Bearer <jwt_token>
```

### Autoryzacja

- **Ownership:** Tylko właściciel może edytować/usuwać tracker
- **Share Permissions:** Trackery współdzielone z `permission="read"` są tylko do odczytu
- **RLS (Row Level Security):** Supabase RLS jako dodatkowa warstwa zabezpieczeń

### Walidacja

- **DTO Validation:** class-validator na wszystkich DTO
- **Enum Validation:** data_type, sort_by, sort_order
- **String Length:** Limity dla name (100), unit (20), icon (50)
- **Regex Validation:** color w formacie `#RRGGBB`
- **Config Validation:** Zgodność config z data_type

## 📊 Typy danych

### DataType

- `number` - Liczby (np. waga, dystans)
- `scale` - Skala (np. 1-10, wymaga config.min i config.max)
- `boolean` - Tak/Nie (np. czy ćwiczyłem?)
- `text` - Tekst (np. notatki)

### Przykłady trackerów

**Number:**

```json
{
  "name": "Weight",
  "data_type": "number",
  "unit": "kg"
}
```

**Scale:**

```json
{
  "name": "Energy Level",
  "data_type": "scale",
  "config": { "min": 1, "max": 10 }
}
```

**Boolean:**

```json
{
  "name": "Exercise",
  "data_type": "boolean"
}
```

## 🎨 Personalizacja

Każdy tracker może mieć:

- `color` - Kolor w formacie hex (#RRGGBB)
- `icon` - Nazwa ikony (max 50 znaków)
- `display_order` - Kolejność wyświetlania (integer)

## 📈 Wydajność

### Indeksy bazy danych

Migracja `20260201_add_trackers_indexes.sql` dodaje indeksy:

- `idx_trackers_user_id_active` - Zapytania z filtrem is_active
- `idx_trackers_data_type` - Filtrowanie po typie danych
- `idx_trackers_display_order` - Sortowanie po kolejności
- `idx_entries_tracker_recorded` - Ostatni wpis i sparkline

### Optymalizacje

- Query builder z JOIN zamiast N+1
- Paginacja z LIMIT/OFFSET
- Partial index (WHERE deleted_at IS NULL)
- Logging interceptor do monitorowania czasu odpowiedzi

## 🧪 Testy

```bash
# Testy jednostkowe
npm run test trackers.service.spec.ts
npm run test trackers.controller.spec.ts

# Testy integracyjne (E2E)
npm run test:e2e trackers.e2e-spec.ts
```

### Coverage

Testy obejmują:

- Wszystkie metody CRUD
- Walidację biznesową
- Sprawdzanie limitów
- Obsługę błędów
- Edge cases

## 🔄 Integracje

### Supabase

Bezpośrednie zapytania do Supabase (bez TypeORM):

- Admin client dla operacji serwera
- RLS jako backup security layer
- Real-time subscriptions (w przyszłości)

### Shared Types

Typy z `@kipio/shared`:

- `TrackerEntity`
- `TrackerListResponseDto`
- `TrackerDetailResponseDto`
- `CreateTrackerCommand`
- `UpdateTrackerCommand`

## 📝 Notatki dla developerów

### Limity

- Tracker limit per user: `profiles.trackers_limit` (default: 50)
- Max pagination limit: 100 items per page
- API Rate Limit: profiles.api_requests_per_hour (dla przyszłości)

### Soft Delete

Wszystkie usunięcia to soft delete (`deleted_at IS NOT NULL`):

- Nie zwracamy `deleted_at` w response
- Indeksy używają `WHERE deleted_at IS NULL`
- Kaskada na entries i tracker_shares przez triggers

### Error Handling

Standard error response zgodnie z `ErrorResponseDto`:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-01-23T12:00:00Z",
  "path": "/api/trackers"
}
```

## 🚀 Następne kroki

- [ ] Swagger/OpenAPI documentation
- [ ] Rate limiting z @nestjs/throttler
- [ ] Caching z Redis
- [ ] Webhooks dla integracji zewnętrznych
- [ ] Eksport danych (JSON, CSV)
- [ ] Real-time updates przez Supabase subscriptions
