# Schemat Bazy Danych - Kipio

## 1. Lista tabel

### 1.1. `profiles`

Rozszerzenie danych użytkownika z Supabase Auth.

| Kolumna                 | Typ           | Ograniczenia                                                                     | Opis                                 |
| ----------------------- | ------------- | -------------------------------------------------------------------------------- | ------------------------------------ |
| `id`                    | `UUID`        | `PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE`                       | ID użytkownika z auth.users          |
| `display_name`          | `TEXT`        | `NOT NULL`                                                                       | Nazwa wyświetlana                    |
| `onboarding_completed`  | `BOOLEAN`     | `NOT NULL DEFAULT FALSE`                                                         | Czy onboarding ukończony             |
| `preferred_theme`       | `TEXT`        | `NOT NULL DEFAULT 'dark' CHECK (preferred_theme IN ('light', 'dark', 'system'))` | Preferowany motyw                    |
| `trackers_limit`        | `INTEGER`     | `NOT NULL DEFAULT 50 CHECK (trackers_limit > 0)`                                 | Limit trackerów                      |
| `api_requests_per_hour` | `INTEGER`     | `NOT NULL DEFAULT 100 CHECK (api_requests_per_hour > 0)`                         | Limit zapytań API/h                  |
| `timezone`              | `TEXT`        | `NOT NULL DEFAULT 'UTC'`                                                         | Strefa czasowa (np. 'Europe/Warsaw') |
| `created_at`            | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`                                                         | Data utworzenia                      |
| `updated_at`            | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`                                                         | Data aktualizacji                    |
| `deleted_at`            | `TIMESTAMPTZ` | `NULL`                                                                           | Soft delete                          |

### 1.2. `trackers`

Definicje metryk użytkownika.

| Kolumna         | Typ           | Ograniczenia                                                           | Opis                                        |
| --------------- | ------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| `id`            | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`                                | Unikalny identyfikator                      |
| `user_id`       | `UUID`        | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`                   | Właściciel trackera                         |
| `name`          | `TEXT`        | `NOT NULL CHECK (char_length(name) <= 100)`                            | Nazwa trackera                              |
| `data_type`     | `TEXT`        | `NOT NULL CHECK (data_type IN ('number', 'scale', 'boolean', 'text'))` | Typ danych                                  |
| `unit`          | `TEXT`        | `NULL CHECK (unit IS NULL OR char_length(unit) <= 20)`                 | Jednostka (dla typu number)                 |
| `config`        | `JSONB`       | `NOT NULL DEFAULT '{}'::jsonb`                                         | Konfiguracja typu (min/max dla scale, itp.) |
| `color`         | `TEXT`        | `NULL CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')`            | Kolor w formacie HEX                        |
| `icon`          | `TEXT`        | `NULL CHECK (icon IS NULL OR char_length(icon) <= 50)`                 | Nazwa ikony                                 |
| `display_order` | `INTEGER`     | `NOT NULL DEFAULT 0`                                                   | Kolejność wyświetlania                      |
| `is_active`     | `BOOLEAN`     | `NOT NULL DEFAULT TRUE`                                                | Czy tracker aktywny                         |
| `created_at`    | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`                                               | Data utworzenia                             |
| `updated_at`    | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`                                               | Data aktualizacji                           |
| `deleted_at`    | `TIMESTAMPTZ` | `NULL`                                                                 | Soft delete                                 |

### 1.3. `tracker_shares`

Współdzielenie trackerów między użytkownikami.

| Kolumna               | Typ           | Ograniczenia                                                      | Opis                      |
| --------------------- | ------------- | ----------------------------------------------------------------- | ------------------------- |
| `id`                  | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`                           | Unikalny identyfikator    |
| `tracker_id`          | `UUID`        | `NOT NULL REFERENCES trackers(id) ON DELETE CASCADE`              | ID trackera               |
| `shared_with_user_id` | `UUID`        | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`              | ID użytkownika z dostępem |
| `permission`          | `TEXT`        | `NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write'))` | Poziom uprawnień          |
| `created_at`          | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`                                          | Data utworzenia           |
| `created_by`          | `UUID`        | `NOT NULL REFERENCES profiles(id)`                                | Kto nadał dostęp          |

**Unique constraint:** `UNIQUE(tracker_id, shared_with_user_id)`

### 1.4. `entries`

Wpisy danych (pomiary).

| Kolumna         | Typ             | Ograniczenia                                         | Opis                    |
| --------------- | --------------- | ---------------------------------------------------- | ----------------------- |
| `id`            | `UUID`          | `PRIMARY KEY DEFAULT gen_random_uuid()`              | Unikalny identyfikator  |
| `tracker_id`    | `UUID`          | `NOT NULL REFERENCES trackers(id) ON DELETE CASCADE` | ID trackera             |
| `user_id`       | `UUID`          | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` | ID autora wpisu         |
| `value_number`  | `DECIMAL(15,4)` | `NULL`                                               | Wartość liczbowa        |
| `value_boolean` | `BOOLEAN`       | `NULL`                                               | Wartość boolean         |
| `value_text`    | `TEXT`          | `NULL`                                               | Wartość tekstowa        |
| `value_json`    | `JSONB`         | `NULL`                                               | Wartość złożona (JSON)  |
| `recorded_at`   | `TIMESTAMPTZ`   | `NOT NULL DEFAULT NOW()`                             | Czas pomiaru            |
| `created_at`    | `TIMESTAMPTZ`   | `NOT NULL DEFAULT NOW()`                             | Czas utworzenia rekordu |
| `updated_at`    | `TIMESTAMPTZ`   | `NOT NULL DEFAULT NOW()`                             | Data aktualizacji       |
| `deleted_at`    | `TIMESTAMPTZ`   | `NULL`                                               | Soft delete             |

### 1.5. `api_tokens`

Tokeny API użytkowników.

| Kolumna        | Typ           | Ograniczenia                                         | Opis                              |
| -------------- | ------------- | ---------------------------------------------------- | --------------------------------- |
| `id`           | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`              | Unikalny identyfikator            |
| `user_id`      | `UUID`        | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE` | Właściciel tokena                 |
| `name`         | `TEXT`        | `NOT NULL CHECK (char_length(name) <= 50)`           | Nazwa tokena                      |
| `token_hash`   | `TEXT`        | `NOT NULL UNIQUE`                                    | Hash tokena (SHA-256)             |
| `token_prefix` | `TEXT`        | `NOT NULL CHECK (char_length(token_prefix) = 8)`     | Prefix tokena (pierwsze 8 znaków) |
| `last_used_at` | `TIMESTAMPTZ` | `NULL`                                               | Ostatnie użycie                   |
| `expires_at`   | `TIMESTAMPTZ` | `NULL`                                               | Data wygaśnięcia                  |
| `is_active`    | `BOOLEAN`     | `NOT NULL DEFAULT TRUE`                              | Czy token aktywny                 |
| `revoked_at`   | `TIMESTAMPTZ` | `NULL`                                               | Data unieważnienia                |
| `created_at`   | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`                             | Data utworzenia                   |

### 1.6. `template_packages`

Pakiety szablonów dla onboardingu.

| Kolumna         | Typ           | Ograniczenia                                                          | Opis                   |
| --------------- | ------------- | --------------------------------------------------------------------- | ---------------------- |
| `id`            | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`                               | Unikalny identyfikator |
| `name`          | `TEXT`        | `NOT NULL UNIQUE CHECK (char_length(name) <= 50)`                     | Nazwa pakietu          |
| `description`   | `TEXT`        | `NULL CHECK (description IS NULL OR char_length(description) <= 500)` | Opis pakietu           |
| `icon`          | `TEXT`        | `NULL CHECK (icon IS NULL OR char_length(icon) <= 50)`                | Ikona pakietu          |
| `display_order` | `INTEGER`     | `NOT NULL DEFAULT 0`                                                  | Kolejność wyświetlania |
| `is_active`     | `BOOLEAN`     | `NOT NULL DEFAULT TRUE`                                               | Czy pakiet aktywny     |
| `created_at`    | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`                                              | Data utworzenia        |

### 1.7. `tracker_templates`

Szablony trackerów w pakietach.

| Kolumna         | Typ           | Ograniczenia                                                           | Opis                   |
| --------------- | ------------- | ---------------------------------------------------------------------- | ---------------------- |
| `id`            | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`                                | Unikalny identyfikator |
| `package_id`    | `UUID`        | `NOT NULL REFERENCES template_packages(id) ON DELETE CASCADE`          | ID pakietu             |
| `name`          | `TEXT`        | `NOT NULL CHECK (char_length(name) <= 100)`                            | Nazwa trackera         |
| `data_type`     | `TEXT`        | `NOT NULL CHECK (data_type IN ('number', 'scale', 'boolean', 'text'))` | Typ danych             |
| `unit`          | `TEXT`        | `NULL CHECK (unit IS NULL OR char_length(unit) <= 20)`                 | Jednostka              |
| `config`        | `JSONB`       | `NOT NULL DEFAULT '{}'::jsonb`                                         | Konfiguracja typu      |
| `color`         | `TEXT`        | `NULL CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$')`            | Kolor                  |
| `icon`          | `TEXT`        | `NULL CHECK (icon IS NULL OR char_length(icon) <= 50)`                 | Ikona                  |
| `display_order` | `INTEGER`     | `NOT NULL DEFAULT 0`                                                   | Kolejność w pakiecie   |
| `created_at`    | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`                                               | Data utworzenia        |

### 1.8. `activity_log`

Log aktywności i zmian.

| Kolumna       | Typ           | Ograniczenia                                                                                    | Opis                   |
| ------------- | ------------- | ----------------------------------------------------------------------------------------------- | ---------------------- |
| `id`          | `UUID`        | `PRIMARY KEY DEFAULT gen_random_uuid()`                                                         | Unikalny identyfikator |
| `user_id`     | `UUID`        | `NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`                                            | ID użytkownika         |
| `entity_type` | `TEXT`        | `NOT NULL CHECK (entity_type IN ('tracker', 'entry', 'api_token', 'profile', 'tracker_share'))` | Typ encji              |
| `entity_id`   | `UUID`        | `NOT NULL`                                                                                      | ID encji               |
| `action`      | `TEXT`        | `NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore'))`                          | Akcja                  |
| `changes`     | `JSONB`       | `NULL`                                                                                          | Szczegóły zmian        |
| `ip_address`  | `INET`        | `NULL`                                                                                          | Adres IP               |
| `user_agent`  | `TEXT`        | `NULL`                                                                                          | User agent             |
| `created_at`  | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`                                                                        | Data zdarzenia         |

---

## 2. Relacje między tabelami

```
auth.users (Supabase Auth)
    │
    └──1:1──► profiles
                │
                ├──1:N──► trackers
                │            │
                │            ├──1:N──► entries
                │            │
                │            └──1:N──► tracker_shares
                │
                ├──1:N──► api_tokens (max 5 aktywnych)
                │
                ├──1:N──► activity_log
                │
                └──N:1◄── tracker_shares (shared_with_user_id)

template_packages
    │
    └──1:N──► tracker_templates
```

### Szczegóły relacji:

| Relacja                                   | Typ | Opis                                                           |
| ----------------------------------------- | --- | -------------------------------------------------------------- |
| `auth.users` → `profiles`                 | 1:1 | Każdy użytkownik ma dokładnie jeden profil                     |
| `profiles` → `trackers`                   | 1:N | Użytkownik może mieć wiele trackerów                           |
| `trackers` → `entries`                    | 1:N | Tracker może mieć wiele wpisów                                 |
| `trackers` → `tracker_shares`             | 1:N | Tracker może być współdzielony z wieloma użytkownikami         |
| `profiles` → `tracker_shares`             | 1:N | Użytkownik może mieć dostęp do wielu współdzielonych trackerów |
| `profiles` → `api_tokens`                 | 1:N | Użytkownik może mieć wiele tokenów API                         |
| `profiles` → `activity_log`               | 1:N | Użytkownik może mieć wiele wpisów w logu                       |
| `template_packages` → `tracker_templates` | 1:N | Pakiet zawiera wiele szablonów trackerów                       |

---

## 3. Indeksy

### Indeksy dla `profiles`

```sql
-- Domyślny PRIMARY KEY index na id
```

### Indeksy dla `trackers`

```sql
CREATE INDEX idx_trackers_user_id ON trackers(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_trackers_user_id_display_order ON trackers(user_id, display_order) WHERE deleted_at IS NULL;
```

### Indeksy dla `tracker_shares`

```sql
CREATE INDEX idx_tracker_shares_tracker_id ON tracker_shares(tracker_id);
CREATE INDEX idx_tracker_shares_shared_with_user_id ON tracker_shares(shared_with_user_id);
```

### Indeksy dla `entries`

```sql
CREATE INDEX idx_entries_tracker_id_recorded_at ON entries(tracker_id, recorded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_user_id_recorded_at ON entries(user_id, recorded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_entries_recorded_at ON entries(recorded_at DESC) WHERE deleted_at IS NULL;
```

### Indeksy dla `api_tokens`

```sql
CREATE INDEX idx_api_tokens_user_id ON api_tokens(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_api_tokens_token_hash ON api_tokens(token_hash) WHERE is_active = TRUE;
```

### Indeksy dla `activity_log`

```sql
CREATE INDEX idx_activity_log_user_id_created_at ON activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
```

### Indeksy dla `template_packages`

```sql
CREATE INDEX idx_template_packages_display_order ON template_packages(display_order) WHERE is_active = TRUE;
```

### Indeksy dla `tracker_templates`

```sql
CREATE INDEX idx_tracker_templates_package_id ON tracker_templates(package_id);
```

---

## 4. Polityki Row Level Security (RLS)

### 4.1. Włączenie RLS na tabelach

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracker_templates ENABLE ROW LEVEL SECURITY;
```

### 4.2. Polityki dla `profiles`

```sql
-- Użytkownik może widzieć i edytować tylko swój profil
CREATE POLICY profiles_select ON profiles
    FOR SELECT USING (auth.uid() = id AND deleted_at IS NULL);

CREATE POLICY profiles_update ON profiles
    FOR UPDATE USING (auth.uid() = id AND deleted_at IS NULL);

-- Brak INSERT - profil tworzony automatycznie przez trigger
-- Brak DELETE - usuwanie przez soft delete (UPDATE deleted_at)
```

### 4.3. Polityki dla `trackers`

```sql
-- Użytkownik może widzieć własne trackery oraz współdzielone z nim
CREATE POLICY trackers_select ON trackers
    FOR SELECT USING (
        deleted_at IS NULL AND (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM tracker_shares ts
                WHERE ts.tracker_id = trackers.id
                AND ts.shared_with_user_id = auth.uid()
            )
        )
    );

-- Tylko właściciel może tworzyć trackery
CREATE POLICY trackers_insert ON trackers
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Właściciel może edytować swoje trackery
CREATE POLICY trackers_update ON trackers
    FOR UPDATE USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Właściciel może usuwać (soft delete) swoje trackery
CREATE POLICY trackers_delete ON trackers
    FOR DELETE USING (user_id = auth.uid());
```

### 4.4. Polityki dla `tracker_shares`

```sql
-- Właściciel trackera i osoba z dostępem mogą widzieć share
CREATE POLICY tracker_shares_select ON tracker_shares
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trackers t
            WHERE t.id = tracker_shares.tracker_id
            AND (t.user_id = auth.uid() OR tracker_shares.shared_with_user_id = auth.uid())
        )
    );

-- Tylko właściciel trackera może tworzyć share
CREATE POLICY tracker_shares_insert ON tracker_shares
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM trackers t
            WHERE t.id = tracker_id AND t.user_id = auth.uid()
        )
    );

-- Tylko właściciel trackera może usuwać share
CREATE POLICY tracker_shares_delete ON tracker_shares
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM trackers t
            WHERE t.id = tracker_shares.tracker_id AND t.user_id = auth.uid()
        )
    );
```

### 4.5. Polityki dla `entries`

```sql
-- Użytkownik może widzieć wpisy w swoich trackerach i współdzielonych
CREATE POLICY entries_select ON entries
    FOR SELECT USING (
        deleted_at IS NULL AND
        EXISTS (
            SELECT 1 FROM trackers t
            LEFT JOIN tracker_shares ts ON ts.tracker_id = t.id
            WHERE t.id = entries.tracker_id
            AND t.deleted_at IS NULL
            AND (t.user_id = auth.uid() OR ts.shared_with_user_id = auth.uid())
        )
    );

-- Użytkownik może dodawać wpisy do swoich trackerów i współdzielonych z uprawnieniem 'write'
CREATE POLICY entries_insert ON entries
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM trackers t
            LEFT JOIN tracker_shares ts ON ts.tracker_id = t.id AND ts.permission = 'write'
            WHERE t.id = tracker_id
            AND t.deleted_at IS NULL
            AND (t.user_id = auth.uid() OR ts.shared_with_user_id = auth.uid())
        )
    );

-- Użytkownik może edytować tylko swoje wpisy
CREATE POLICY entries_update ON entries
    FOR UPDATE USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Użytkownik może usuwać tylko swoje wpisy
CREATE POLICY entries_delete ON entries
    FOR DELETE USING (user_id = auth.uid());
```

### 4.6. Polityki dla `api_tokens`

```sql
-- Użytkownik widzi tylko swoje tokeny
CREATE POLICY api_tokens_select ON api_tokens
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY api_tokens_insert ON api_tokens
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY api_tokens_update ON api_tokens
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY api_tokens_delete ON api_tokens
    FOR DELETE USING (user_id = auth.uid());
```

### 4.7. Polityki dla `activity_log`

```sql
-- Użytkownik widzi tylko swoje logi
CREATE POLICY activity_log_select ON activity_log
    FOR SELECT USING (user_id = auth.uid());

-- INSERT dozwolony dla zalogowanych użytkowników (własne logi)
CREATE POLICY activity_log_insert ON activity_log
    FOR INSERT WITH CHECK (user_id = auth.uid());
```

### 4.8. Polityki dla `template_packages` i `tracker_templates`

```sql
-- Wszyscy zalogowani użytkownicy mogą czytać aktywne pakiety i szablony
CREATE POLICY template_packages_select ON template_packages
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY tracker_templates_select ON tracker_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM template_packages tp
            WHERE tp.id = tracker_templates.package_id AND tp.is_active = TRUE
        )
    );
```

---

## 5. Funkcje i Triggery

### 5.1. Automatyczne tworzenie profilu

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'User')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 5.2. Automatyczna aktualizacja `updated_at`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trackers_updated_at
    BEFORE UPDATE ON trackers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entries_updated_at
    BEFORE UPDATE ON entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5.3. Walidacja limitu trackerów

```sql
CREATE OR REPLACE FUNCTION check_trackers_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    user_limit INTEGER;
BEGIN
    SELECT trackers_limit INTO user_limit
    FROM profiles WHERE id = NEW.user_id;

    SELECT COUNT(*) INTO current_count
    FROM trackers
    WHERE user_id = NEW.user_id AND deleted_at IS NULL;

    IF current_count >= user_limit THEN
        RAISE EXCEPTION 'Tracker limit reached (max: %)', user_limit;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_trackers_limit_trigger
    BEFORE INSERT ON trackers
    FOR EACH ROW EXECUTE FUNCTION check_trackers_limit();
```

### 5.4. Walidacja limitu aktywnych tokenów API

```sql
CREATE OR REPLACE FUNCTION check_api_tokens_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_tokens INTEGER := 5;
BEGIN
    SELECT COUNT(*) INTO current_count
    FROM api_tokens
    WHERE user_id = NEW.user_id AND is_active = TRUE;

    IF current_count >= max_tokens THEN
        RAISE EXCEPTION 'API token limit reached (max: %)', max_tokens;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_api_tokens_limit_trigger
    BEFORE INSERT ON api_tokens
    FOR EACH ROW EXECUTE FUNCTION check_api_tokens_limit();
```

### 5.5. Walidacja typu wartości w entries

```sql
CREATE OR REPLACE FUNCTION validate_entry_value()
RETURNS TRIGGER AS $$
DECLARE
    tracker_type TEXT;
    tracker_config JSONB;
    scale_min DECIMAL;
    scale_max DECIMAL;
BEGIN
    -- Pobierz typ i konfigurację trackera
    SELECT data_type, config INTO tracker_type, tracker_config
    FROM trackers WHERE id = NEW.tracker_id;

    -- Walidacja w zależności od typu
    CASE tracker_type
        WHEN 'number' THEN
            IF NEW.value_number IS NULL THEN
                RAISE EXCEPTION 'value_number is required for number type tracker';
            END IF;
            IF NEW.value_boolean IS NOT NULL OR NEW.value_text IS NOT NULL THEN
                RAISE EXCEPTION 'Only value_number should be set for number type tracker';
            END IF;

        WHEN 'scale' THEN
            IF NEW.value_number IS NULL THEN
                RAISE EXCEPTION 'value_number is required for scale type tracker';
            END IF;
            -- Walidacja zakresu skali
            scale_min := COALESCE((tracker_config->>'min')::DECIMAL, 1);
            scale_max := COALESCE((tracker_config->>'max')::DECIMAL, 10);
            IF NEW.value_number < scale_min OR NEW.value_number > scale_max THEN
                RAISE EXCEPTION 'value_number must be between % and %', scale_min, scale_max;
            END IF;
            IF NEW.value_boolean IS NOT NULL OR NEW.value_text IS NOT NULL THEN
                RAISE EXCEPTION 'Only value_number should be set for scale type tracker';
            END IF;

        WHEN 'boolean' THEN
            IF NEW.value_boolean IS NULL THEN
                RAISE EXCEPTION 'value_boolean is required for boolean type tracker';
            END IF;
            IF NEW.value_number IS NOT NULL OR NEW.value_text IS NOT NULL THEN
                RAISE EXCEPTION 'Only value_boolean should be set for boolean type tracker';
            END IF;

        WHEN 'text' THEN
            IF NEW.value_text IS NULL THEN
                RAISE EXCEPTION 'value_text is required for text type tracker';
            END IF;
            IF NEW.value_number IS NOT NULL OR NEW.value_boolean IS NOT NULL THEN
                RAISE EXCEPTION 'Only value_text should be set for text type tracker';
            END IF;

        ELSE
            RAISE EXCEPTION 'Unknown tracker type: %', tracker_type;
    END CASE;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_entry_value_trigger
    BEFORE INSERT OR UPDATE ON entries
    FOR EACH ROW EXECUTE FUNCTION validate_entry_value();
```

---

## 6. Dodatkowe uwagi i decyzje projektowe

### 6.1. Soft Delete

- Implementowany przez kolumnę `deleted_at TIMESTAMPTZ` na tabelach: `profiles`, `trackers`, `entries`
- Dla `api_tokens` używamy `is_active` + `revoked_at` (tokens nie są usuwane, tylko deaktywowane)
- Wszystkie indeksy i polityki RLS filtrują rekordy z `deleted_at IS NULL`

### 6.2. Współdzielenie trackerów

- Tabela `tracker_shares` definiuje dostęp do trackerów dla innych użytkowników
- Dwa poziomy uprawnień: `read` (tylko odczyt) i `write` (odczyt + dodawanie wpisów)
- Wpisy zawsze zapisują `user_id` autora wpisu, nie właściciela trackera
- Właściciel trackera ma pełne uprawnienia niezależnie od `tracker_shares`

### 6.3. Tokeny API

- Przechowywany jest tylko hash tokena (SHA-256), nie sam token
- `token_prefix` (8 znaków) pozwala użytkownikowi zidentyfikować token bez ujawniania pełnej wartości
- Limit 5 aktywnych tokenów na użytkownika (egzekwowany przez trigger)
- Obsługa wygasania przez `expires_at` (NULL = nigdy nie wygasa)

### 6.4. Konfiguracja trackerów (JSONB)

Przykłady konfiguracji dla różnych typów:

```json
// number
{"unit": "kg", "precision": 2}

// scale
{"min": 1, "max": 10, "step": 1, "labels": {"1": "Bardzo źle", "10": "Świetnie"}}

// text
{"max_length": 500, "placeholder": "Opisz swój nastrój..."}

// boolean (zazwyczaj puste)
{}
```

### 6.5. Activity Log

- Prosta tabela audytowa bez automatycznych triggerów (logowanie przez aplikację)
- W MVP nie implementujemy automatycznego czyszczenia
- Pole `changes` przechowuje JSON z poprzednimi i nowymi wartościami

### 6.6. Szablony onboardingowe

- Pakiety i szablony są publiczne (dostępne dla wszystkich zalogowanych)
- Po skopiowaniu szablonu do trackerów użytkownika, nie ma powiązania ze źródłowym szablonem
- Aktualizacje szablonów nie wpływają na już utworzone trackery

### 6.7. Timezone

- Przechowywany jako nazwa strefy czasowej (np. 'Europe/Warsaw') w `profiles.timezone`
- Pozwala na poprawną obsługę DST (daylight saving time)
- Wszystkie daty w bazie są przechowywane jako `TIMESTAMPTZ` (UTC)
- Konwersja na lokalny czas użytkownika odbywa się w warstwie aplikacji

### 6.8. Cascade Delete (GDPR)

- Usunięcie rekordu z `auth.users` kaskadowo usuwa profil i wszystkie powiązane dane
- Spełnia wymóg RODO dotyczący prawa do usunięcia danych

### 6.9. Rate Limiting

- Limity przechowywane w `profiles` (`api_requests_per_hour`)
- Egzekwowanie na poziomie NestJS API (nie w bazie danych)
- Pozwala na indywidualne dostosowanie limitów per użytkownik

### 6.10. Integracja z NestJS i TypeORM

- Schemat jest zgodny z konwencjami TypeORM
- UUID jako klucze główne (natywne wsparcie PostgreSQL)
- Nazwy tabel i kolumn w snake_case
- RLS wymaga ustawienia `auth.uid()` w kontekście sesji przez NestJS
