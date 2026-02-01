# Architektura UI dla Kipio

## 1. Przegląd struktury UI

Kipio to Progressive Web App (PWA) działająca w modelu "online-first", zaprojektowana z myślą o szybkości i mobilności. Architektura UI składa się z trzech głównych warstw:

### 1.1. Warstwa Uwierzytelniania

- Ekran Powitalny (Landing Page)
- Ekran Logowania/Rejestracji
- Resetowanie Hasła

### 1.2. Warstwa Onboardingu

- Kreator Startowy z wyborem pakietów szablonów

### 1.3. Warstwa Aplikacji (Chroniona)

- Dashboard główny
- Widok szczegółowy trackera
- Tworzenie/edycja trackerów
- Ustawienia użytkownika
- Zarządzanie kluczami API
- Eksport danych

Aplikacja wykorzystuje podejście Mobile-First z naciskiem na szybkość wprowadzania danych (<5 sekund) poprzez komponenty Bottom Sheet oraz uproszczone formularze.

### Główne założenia architektoniczne

- **Sekcja publiczna**: Statyczne strony Astro (landing, auth) z SSG dla optymalnej wydajności
- **Sekcja aplikacyjna**: React SPA z `client:only="react"` i React Router dla płynnej nawigacji
- **Nawigacja między sekcjami**: View Transitions API dla płynnych przejść
- **Motyw**: Dark Mode jako domyślny (z możliwością wyboru Light/System w ustawieniach)
- **Tryb pracy**: Online-first z graceful degradation (informacja o braku połączenia)

### Podział odpowiedzialności

| Warstwa          | Technologia           | Odpowiedzialność                   |
| ---------------- | --------------------- | ---------------------------------- |
| Strony statyczne | Astro                 | Landing, Auth, SEO                 |
| Aplikacja SPA    | React + React Router  | Dashboard, Trackery, Ustawienia    |
| Stan serwerowy   | TanStack Query        | Cache, synchronizacja z API        |
| Stan UI          | Zustand/Context       | Bottom Sheet, tryb edycji, offline |
| Formularze       | React Hook Form + Zod | Walidacja, obsługa błędów 422      |
| Komponenty UI    | Shadcn/ui + Tailwind  | Spójny design system               |

---

## 2. Lista widoków

### 2.1. Strony publiczne (Astro)

#### 2.1.1. Landing Page

- **Ścieżka**: `/`
- **Główny cel**: Prezentacja wartości produktu i zachęcenie do rejestracji
- **Kluczowe informacje**:
  - Value proposition (Personal Data Warehouse)
  - Kluczowe funkcje (elastyczne trackery, szybkie wprowadzanie, API webhooks)
  - Social proof (jeśli dostępne)
  - CTA do rejestracji
- **Kluczowe komponenty**:
  - Hero section z CTA
  - Feature cards (3-4 główne funkcje)
  - Footer z linkami
- **UX/Dostępność/Bezpieczeństwo**:
  - Semantyczny HTML z proper headings hierarchy
  - Optymalizacja LCP (Largest Contentful Paint)
  - Brak wrażliwych danych

#### 2.1.2. Ekran logowania

- **Ścieżka**: `/login`
- **Główny cel**: Uwierzytelnienie istniejących użytkowników
- **Kluczowe informacje**:
  - Formularz email/hasło
  - Przyciski Social Login (Google, GitHub)
  - Link do rejestracji
  - Link "Nie pamiętam hasła"
- **Kluczowe komponenty**:
  - AuthForm (email, password inputs)
  - SocialLoginButtons (Google, GitHub)
  - Link do `/register`
  - Link do `/reset-password`
- **UX/Dostępność/Bezpieczeństwo**:
  - Autofocus na polu email
  - Walidacja on blur
  - Czytelne komunikaty błędów (401, 422)
  - ARIA labels dla wszystkich pól
  - Rate limiting komunikat (429)

#### 2.1.3. Ekran rejestracji

- **Ścieżka**: `/register`
- **Główny cel**: Utworzenie nowego konta użytkownika
- **Kluczowe informacje**:
  - Formularz email/hasło
  - Przyciski Social Login
  - Link do logowania
  - Wymagania dotyczące hasła
- **Kluczowe komponenty**:
  - AuthForm (email, password, confirm password)
  - PasswordStrengthIndicator
  - SocialLoginButtons
  - Link do `/login`
- **UX/Dostępność/Bezpieczeństwo**:
  - Walidacja siły hasła (min. 8 znaków) w czasie rzeczywistym
  - Potwierdzenie zgodności haseł
  - Clear error messages dla zajętego emaila (409)

#### 2.1.4. Reset hasła

- **Ścieżka**: `/reset-password`
- **Główny cel**: Odzyskanie dostępu do konta
- **Kluczowe informacje**:
  - Formularz z polem email
  - Potwierdzenie wysłania linku
- **Kluczowe komponenty**:
  - EmailInput
  - SuccessMessage (po wysłaniu)
  - BackToLogin link
- **UX/Dostępność/Bezpieczeństwo**:
  - Nie ujawniaj czy email istnieje w systemie
  - Komunikat sukcesu niezależnie od wyniku

---

### 2.2. Część aplikacyjna (React SPA)

#### 2.2.1. Onboarding Wizard

- **Ścieżka**: `/app/onboarding`
- **Główny cel**: Wprowadzenie nowego użytkownika i utworzenie startowych trackerów
- **Kluczowe informacje**:
  - Krok 1: Powitanie i wyjaśnienie koncepcji
  - Krok 2: Wybór pakietów szablonów (Zdrowie, Produktywność, Mały Biznes)
  - Krok 3: Podsumowanie wybranych trackerów
- **Kluczowe komponenty**:
  - WizardStepper (wskaźnik postępu)
  - WelcomeStep
  - PackageSelector (checkboxy pakietów z opisami)
  - SummaryStep (lista trackerów do utworzenia)
  - SkipButton
  - NextButton / FinishButton
- **Powiązane API**:
  - `GET /api/templates/packages` - pobranie dostępnych pakietów
  - `POST /api/profiles/me/complete-onboarding` - zakończenie onboardingu
- **UX/Dostępność/Bezpieczeństwo**:
  - Możliwość pominięcia na każdym kroku
  - Progress indicator (1/3, 2/3, 3/3)
  - Focus trap w wizardzie
  - Keyboard navigation między krokami

#### 2.2.2. Dashboard

- **Ścieżka**: `/app` lub `/app/dashboard`
- **Główny cel**: Przegląd wszystkich trackerów z szybkim dostępem do dodawania wpisów
- **Kluczowe informacje**:
  - Lista kafelków trackerów
  - Sparkline (trend 7 dni) dla każdego trackera
  - Ostatnia wartość i czas wpisu
  - Oznaczenie udostępnionych trackerów
  - Licznik trackerów (X/50)
- **Kluczowe komponenty**:
  - TrackerGrid/TrackerList (responsywny)
  - TrackerCard (nazwa, sparkline, ostatnia wartość, badge shared)
  - TrackerCounterBadge (X/50 z ostrzeżeniem przy 45+)
  - FAB (Floating Action Button) do Bottom Sheet
  - FilterBar (własne/udostępnione/wszystkie)
  - EmptyState (gdy brak trackerów)
  - EditLayoutToggle (włączenie drag-and-drop)
  - RefreshButton (manualne odświeżenie)
- **Powiązane API**:
  - `GET /api/trackers` - lista trackerów
  - `GET /api/dashboard` - dane sparklines
  - `PATCH /api/trackers/reorder` - zmiana kolejności
- **UX/Dostępność/Bezpieczeństwo**:
  - Lista wertykalna na mobile, grid 2-4 kolumny na tablet/desktop
  - Sparklines nieinteraktywne na mobile, tooltips na desktop
  - Drag-and-drop jako opcjonalny tryb "Edytuj układ"
  - ARIA live region dla aktualizacji
  - Skeleton loading state

#### 2.2.3. Widok szczegółowy trackera

- **Ścieżka**: `/app/trackers/:trackerId`
- **Główny cel**: Szczegółowa wizualizacja i zarządzanie danymi trackera
- **Kluczowe informacje**:
  - Nazwa i typ trackera
  - Wykres/Heatmapa (zależnie od typu danych)
  - Lista wpisów z infinite scroll
  - Statystyki (średnia, min, max, trend)
- **Kluczowe komponenty**:
  - TrackerHeader (nazwa, kolor, przycisk edycji)
  - ChartSection:
    - LineChart (dla number/scale)
    - CalendarHeatmap (dla boolean)
    - TextEntryList (dla text z wyszukiwaniem)
  - TimeRangeSelector (7d, 30d, 90d, 1y, all)
  - StatsSummary (avg, min, max, total entries)
  - EntryList (infinite scroll)
  - EntryItem (wartość, data, inline edit/delete)
  - AddEntryFAB
- **Powiązane API**:
  - `GET /api/trackers/:id` - szczegóły trackera
  - `GET /api/trackers/:trackerId/entries` - wpisy z paginacją
  - `GET /api/trackers/:trackerId/stats` - statystyki
  - `PATCH /api/trackers/:trackerId/entries/:entryId` - edycja wpisu
  - `DELETE /api/trackers/:trackerId/entries/:entryId` - usunięcie wpisu
- **UX/Dostępność/Bezpieczeństwo**:
  - Infinite scroll dla wpisów (lazy loading)
  - Inline editing dla szybkiej korekty
  - Potwierdzenie przed usunięciem
  - Skeleton loading dla wykresu i listy
  - Responsywny wykres (ResponsiveContainer)

#### 2.2.4. Tworzenie trackera

- **Ścieżka**: `/app/trackers/new` lub Modal
- **Główny cel**: Definiowanie nowego trackera
- **Kluczowe informacje**:
  - Nazwa trackera
  - Typ danych (number, scale, boolean, text)
  - Jednostka (dla number)
  - Konfiguracja (min/max dla scale)
  - Kolor (opcjonalnie)
- **Kluczowe komponenty**:
  - TrackerForm:
    - NameInput (max 100 znaków)
    - DataTypeSelector (radio/select)
    - UnitInput (warunkowo dla number)
    - ScaleConfigInputs (warunkowo dla scale)
    - ColorPicker (opcjonalnie)
  - CreateButton
  - CancelButton
  - LimitWarning (jeśli blisko 50)
- **Powiązane API**:
  - `POST /api/trackers` - utworzenie trackera
- **UX/Dostępność/Bezpieczeństwo**:
  - Dynamiczne pokazywanie pól zależnie od typu
  - Walidacja on blur (React Hook Form)
  - Wyłączony przycisk przy 50 trackerach
  - Focus trap w modalu

#### 2.2.5. Edycja trackera

- **Ścieżka**: Modal na `/app/trackers/:trackerId`
- **Główny cel**: Modyfikacja istniejącego trackera
- **Kluczowe informacje**:
  - Aktualne dane trackera
  - Pola do edycji (nazwa, jednostka, kolor, is_active)
  - Uwaga: typ danych nie może być zmieniony
- **Kluczowe komponenty**:
  - TrackerEditForm (podobny do create, bez DataTypeSelector)
  - SaveButton
  - DeleteTrackerButton
  - CancelButton
- **Powiązane API**:
  - `GET /api/trackers/:id` - pobranie aktualnych danych
  - `PATCH /api/trackers/:id` - aktualizacja
  - `DELETE /api/trackers/:id` - usunięcie (soft delete)
- **UX/Dostępność/Bezpieczeństwo**:
  - Disabled data_type field z wyjaśnieniem
  - Potwierdzenie przed usunięciem (modal w modalu lub inline)
  - Optimistic update

#### 2.2.6. Ustawienia - Profil

- **Ścieżka**: `/app/settings` lub `/app/settings/profile`
- **Główny cel**: Zarządzanie danymi profilu użytkownika
- **Kluczowe informacje**:
  - Display name
  - Timezone
  - Preferred theme (disabled - tylko dark mode w MVP)
- **Kluczowe komponenty**:
  - ProfileForm:
    - DisplayNameInput
    - TimezoneSelector
    - ThemeToggle (disabled z info "Dark Mode only w MVP")
  - SaveButton
  - AccountSection:
    - DeleteAccountButton (z potwierdzeniem)
- **Powiązane API**:
  - `GET /api/profiles/me` - pobranie profilu
  - `PATCH /api/profiles/me` - aktualizacja
  - `DELETE /api/profiles/me` - usunięcie konta
- **UX/Dostępność/Bezpieczeństwo**:
  - Multi-step confirmation dla usunięcia konta (GDPR)
  - Timezone autocomplete
  - Wylogowanie po usunięciu konta

#### 2.2.7. Ustawienia - Tokeny API

- **Ścieżka**: `/app/settings/tokens`
- **Główny cel**: Zarządzanie tokenami do integracji webhook
- **Kluczowe informacje**:
  - Lista tokenów (nazwa, masked preview, data utworzenia, data wygaśnięcia)
  - Możliwość tworzenia, regeneracji i usuwania
- **Kluczowe komponenty**:
  - TokenList:
    - TokenItem (nazwa, masked token `kip_****...****`, created_at, expires_at)
    - CopyButton (jeśli właśnie utworzony)
    - RegenerateButton
    - DeleteButton
  - CreateTokenButton
  - CreateTokenModal:
    - NameInput
    - ExpirationSelector (never, 30d, 90d, 1y)
    - FullTokenDisplay (tylko raz!)
    - CopyToClipboardButton
    - WarningBanner ("Token pokazany tylko raz")
- **Powiązane API**:
  - `GET /api/tokens` - lista tokenów
  - `POST /api/tokens` - utworzenie (zwraca pełny token)
  - `DELETE /api/tokens/:id` - usunięcie
  - `POST /api/tokens/:id/regenerate` - regeneracja
- **UX/Dostępność/Bezpieczeństwo**:
  - Pełny token widoczny TYLKO przy tworzeniu/regeneracji
  - Ostrzeżenie o jednorazowym wyświetleniu
  - Potwierdzenie przed usunięciem/regeneracją
  - Masked preview na liście

#### 2.2.8. Ustawienia - Eksport danych

- **Ścieżka**: `/app/settings/export`
- **Główny cel**: Eksport danych użytkownika (GDPR, backup)
- **Kluczowe informacje**:
  - Wybór formatu (JSON, CSV)
  - Opcjonalny filtr trackerów i dat
- **Kluczowe komponenty**:
  - FormatSelector (JSON/CSV)
  - TrackerMultiSelect (opcjonalnie)
  - DateRangePicker (from/to)
  - ExportButton
  - LoadingState
  - DownloadLink (po wygenerowaniu)
- **Powiązane API**:
  - `GET /api/export` - eksport danych
- **UX/Dostępność/Bezpieczeństwo**:
  - Loading indicator podczas generowania
  - Synchroniczny dla MVP (małe zbiory danych)
  - Automatyczne pobieranie pliku

#### 2.2.9. Ustawienia - Instalacja PWA

- **Ścieżka**: `/app/settings/install` lub sekcja w Settings
- **Główny cel**: Zachęcenie do instalacji aplikacji PWA
- **Kluczowe informacje**:
  - Status instalacji
  - Instrukcje dla różnych platform
  - Przycisk instalacji (jeśli dostępny)
- **Kluczowe komponenty**:
  - InstallStatus (zainstalowana/nie)
  - InstallButton (jeśli beforeinstallprompt dostępne)
  - PlatformInstructions (iOS Safari, Android Chrome)
- **UX/Dostępność/Bezpieczeństwo**:
  - Wykrywanie platformy
  - Dyskretny banner po 3 wizytach (na Dashboardzie)

---

### 2.3. Komponenty globalne

#### 2.3.1. Bottom Sheet (Szybkie dodawanie wpisu)

- **Dostępność**: Globalnie w części aplikacyjnej (z wyjątkiem onboardingu)
- **Główny cel**: Szybkie dodanie wpisu w < 5 sekund
- **Kluczowe informacje**:
  - Lista aktywnych trackerów
  - Formularz wartości dla wybranego trackera
  - Domyślna data/czas "teraz"
- **Kluczowe komponenty**:
  - BottomSheetContainer (animowany panel od dołu)
  - TrackerQuickSelector (lista/grid trackerów)
  - ValueInput (dynamiczny zależnie od typu):
    - NumberInput (z jednostką)
    - ScaleSlider
    - BooleanToggle
    - TextInput
  - DateTimePicker (domyślnie "teraz")
  - SaveButton
  - CloseButton
- **Powiązane API**:
  - `POST /api/trackers/:trackerId/entries` - utworzenie wpisu
- **UX/Dostępność/Bezpieczeństwo**:
  - Autofocus na polu wartości
  - Swipe down to close
  - Keyboard accessibility
  - Focus trap
  - Optimistic update
  - Toast po zapisaniu

#### 2.3.2. Offline Banner

- **Dostępność**: Globalnie gdy brak połączenia
- **Główny cel**: Informacja o trybie offline
- **Kluczowe komponenty**:
  - OfflineBanner (sticky top)
  - Toast przy próbie mutacji
- **UX/Dostępność/Bezpieczeństwo**:
  - Read-only cache w trybie offline
  - Clear messaging

---

## 3. Mapa podróży użytkownika

### 3.1. Nowy użytkownik (Rejestracja → Pierwszy wpis)

```
Landing (/)
    │
    ▼ [Klik "Zarejestruj się"]
Register (/register)
    │
    ▼ [Wypełnienie formularza / Social Login]
Onboarding (/app/onboarding)
    │
    ├─ Krok 1: Powitanie
    │     ▼ [Next]
    ├─ Krok 2: Wybór pakietów
    │     ▼ [Wybór lub Skip]
    └─ Krok 3: Podsumowanie
          ▼ [Zakończ]
Dashboard (/app)
    │
    ▼ [Klik FAB]
Bottom Sheet
    │
    ├─ Wybór trackera
    │     ▼
    ├─ Wprowadzenie wartości
    │     ▼
    └─ Zapisz
          ▼
Dashboard (zaktualizowany)
```

**Czas docelowy**: < 60 sekund od dashboardu do pierwszego wpisu

### 3.2. Powracający użytkownik (Logowanie → Przegląd → Wpis)

```
Landing lub Login (/login)
    │
    ▼ [Logowanie]
Dashboard (/app)
    │
    ├─ [Klik FAB] ──► Bottom Sheet ──► Szybki wpis
    │
    └─ [Klik kafelek trackera]
          ▼
    Tracker Detail (/app/trackers/:id)
          │
          ├─ Przegląd wykresu
          ├─ Zmiana zakresu czasu
          ├─ Infinite scroll wpisów
          └─ Inline edit/delete wpisu
```

### 3.3. Power User (Integracja API)

```
Dashboard (/app)
    │
    ▼ [Menu → Ustawienia]
Settings (/app/settings)
    │
    ▼ [Tokeny API]
API Tokens (/app/settings/tokens)
    │
    ├─ [Utwórz token]
    │     ▼
    │   Modal z pełnym tokenem
    │     │
    │     ▼ [Kopiuj]
    │   Token skopiowany do clipboard
    │
    └─ [Zewnętrzna integracja]
          │
          ▼
    POST /api/webhook (z tokenem)
          │
          ▼
    Dashboard (automatycznie zaktualizowany)
```

### 3.4. Zarządzanie trackerami

```
Dashboard (/app)
    │
    ├─ [+ Nowy tracker] ──► Create Tracker ──► Dashboard
    │
    ├─ [Edytuj układ] ──► Drag-and-drop ──► Zapisz kolejność
    │
    └─ [Klik tracker → Edytuj]
          ▼
    Edit Tracker Modal
          │
          ├─ Zmiana nazwy/jednostki/koloru
          └─ Usunięcie trackera (z potwierdzeniem)
```

### 3.5. Obsługa błędów - przepływy

| Błąd             | Przepływ                                                   |
| ---------------- | ---------------------------------------------------------- |
| 401 Unauthorized | Dowolny widok → Automatyczne przekierowanie → Login        |
| 403 Forbidden    | Akcja → Toast "Brak uprawnień" → Pozostanie na widoku      |
| 404 Not Found    | Tracker/Entry → Widok "Nie znaleziono" → Link do Dashboard |
| 422 Validation   | Formularz → Inline error messages → Korekta                |
| 429 Rate Limit   | Akcja → Toast "Zbyt wiele żądań" → Retry later             |
| 5xx Server Error | Dowolna akcja → Error Boundary → Retry button              |
| Offline          | Dowolna mutacja → Toast "Brak połączenia" → Read-only      |

---

## 4. Układ i struktura nawigacji

### 4.1. Struktura układu

#### Strony publiczne (Astro)

```
┌─────────────────────────────────┐
│         Header (sticky)         │
│  [Logo]              [Login]    │
├─────────────────────────────────┤
│                                 │
│         Main Content            │
│                                 │
├─────────────────────────────────┤
│            Footer               │
└─────────────────────────────────┘
```

#### Część aplikacyjna (React SPA)

```
┌─────────────────────────────────┐
│       App Header (sticky)       │
│  [Logo]    [Search?]   [Menu]   │
├─────────────────────────────────┤
│                                 │
│         Main Content            │
│      (React Router Outlet)      │
│                                 │
│                                 │
│                           [FAB] │
├─────────────────────────────────┤
│      Bottom Navigation          │
│  [Dashboard]        [Settings]  │
└─────────────────────────────────┘
```

#### Bottom Sheet (overlay)

```
┌─────────────────────────────────┐
│         (dimmed backdrop)       │
│                                 │
├─────────────────────────────────┤
│  ═══════ (drag handle) ═══════  │
│                                 │
│      Tracker Quick Select       │
│                                 │
│      Value Input                │
│                                 │
│      DateTime Picker            │
│                                 │
│         [Save Button]           │
└─────────────────────────────────┘
```

### 4.2. Nawigacja

#### Główna nawigacja (Bottom Navigation)

| Ikona | Label      | Ścieżka         | Opis                    |
| ----- | ---------- | --------------- | ----------------------- |
| 📊    | Dashboard  | `/app`          | Lista trackerów         |
| ⚙️    | Ustawienia | `/app/settings` | Profil, tokeny, eksport |

#### FAB (Floating Action Button)

- Pozycja: Prawy dolny róg, nad bottom navigation
- Akcja: Otwiera Bottom Sheet
- Widoczność: Wszystkie ekrany aplikacji oprócz Onboarding i Settings

#### Nawigacja w Settings

| Element        | Ścieżka                 |
| -------------- | ----------------------- |
| Profil         | `/app/settings/profile` |
| Tokeny API     | `/app/settings/tokens`  |
| Eksport danych | `/app/settings/export`  |
| Instalacja PWA | `/app/settings/install` |
| Wyloguj        | (akcja)                 |

#### Breadcrumbs (desktop)

- Dashboard > Tracker Name (na widoku szczegółowym)
- Settings > Sekcja (w ustawieniach)

### 4.3. Przejścia między widokami

| Z                          | Do                      | Typ przejścia |
| -------------------------- | ----------------------- | ------------- |
| Public → App               | View Transition (slide) |
| Dashboard → Tracker Detail | Push navigation         |
| Dashboard → Bottom Sheet   | Slide up overlay        |
| Any → Settings             | Tab switch              |
| Settings sections          | Tab switch              |
| Create/Edit Tracker        | Modal overlay           |

---

## 5. Kluczowe komponenty

### 5.1. Komponenty nawigacji

| Komponent   | Opis                                  | Użycie                        |
| ----------- | ------------------------------------- | ----------------------------- |
| AppHeader   | Nagłówek z logo i menu                | Wszystkie widoki aplikacji    |
| BottomNav   | Dolna nawigacja (Dashboard, Settings) | Wszystkie widoki aplikacji    |
| FAB         | Floating Action Button                | Dashboard, Tracker Detail     |
| Breadcrumbs | Ścieżka nawigacji                     | Desktop - widoki zagnieżdżone |

### 5.2. Komponenty danych

| Komponent       | Opis                           | Użycie                        |
| --------------- | ------------------------------ | ----------------------------- |
| TrackerCard     | Kafelek trackera ze sparkline  | Dashboard                     |
| TrackerGrid     | Responsywna siatka trackerów   | Dashboard                     |
| Sparkline       | Mini wykres 7-dniowy           | TrackerCard                   |
| LineChart       | Wykres liniowy                 | Tracker Detail (number/scale) |
| CalendarHeatmap | Heatmapa kalendarzowa          | Tracker Detail (boolean)      |
| EntryList       | Lista wpisów z infinite scroll | Tracker Detail                |
| EntryItem       | Pojedynczy wpis z inline edit  | EntryList                     |
| StatsSummary    | Podsumowanie statystyk         | Tracker Detail                |

### 5.3. Komponenty formularzy

| Komponent            | Opis                                | Użycie                   |
| -------------------- | ----------------------------------- | ------------------------ |
| BottomSheet          | Panel szybkiego dodawania           | Globalny                 |
| TrackerQuickSelector | Wybór trackera w Bottom Sheet       | BottomSheet              |
| DynamicValueInput    | Input zależny od typu danych        | BottomSheet, Inline Edit |
| TrackerForm          | Formularz tworzenia/edycji trackera | Create/Edit Tracker      |
| DateTimePicker       | Wybór daty i czasu                  | BottomSheet, Entry edit  |
| TimeRangeSelector    | Wybór zakresu czasu wykresu         | Tracker Detail           |

### 5.4. Komponenty informacyjne

| Komponent           | Opis                               | Użycie               |
| ------------------- | ---------------------------------- | -------------------- |
| TrackerCounterBadge | Licznik X/50 z ostrzeżeniem        | Dashboard            |
| SharedBadge         | Oznaczenie udostępnionego trackera | TrackerCard          |
| EmptyState          | Stan pustej listy                  | Dashboard, EntryList |
| LoadingSkeleton     | Placeholder ładowania              | Wszystkie listy      |
| ErrorBoundary       | Obsługa błędów krytycznych         | Wrapper aplikacji    |
| OfflineBanner       | Informacja o braku połączenia      | Globalny             |

### 5.5. Komponenty modalne

| Komponent        | Opis                   | Użycie                         |
| ---------------- | ---------------------- | ------------------------------ |
| Modal            | Generyczny modal       | Edit Tracker, Create Token     |
| ConfirmDialog    | Dialog potwierdzenia   | Delete Tracker, Delete Account |
| Toast            | Powiadomienia          | Sukces/błąd operacji           |
| TokenRevealModal | Modal z pełnym tokenem | Create/Regenerate Token        |

### 5.6. Komponenty ustawień

| Komponent        | Opis                  | Użycie                   |
| ---------------- | --------------------- | ------------------------ |
| ProfileForm      | Formularz profilu     | Settings/Profile         |
| TokenList        | Lista tokenów API     | Settings/Tokens          |
| TokenItem        | Element listy tokenów | TokenList                |
| ExportForm       | Formularz eksportu    | Settings/Export          |
| PWAInstallPrompt | Prompt instalacji PWA | Settings/Install, Banner |

---

## 6. Mapowanie User Stories na UI

| User Story               | Widok/Komponent    | Elementy UI                             |
| ------------------------ | ------------------ | --------------------------------------- |
| US-001 Logowanie         | Login, Register    | AuthForm, SocialLoginButtons            |
| US-002 Wylogowanie       | Settings           | LogoutButton w menu                     |
| US-003 Onboarding        | Onboarding Wizard  | WizardStepper, PackageSelector          |
| US-004 Nowy tracker      | Create Tracker     | TrackerForm                             |
| US-005 Edycja/usuwanie   | Edit Tracker Modal | TrackerForm, DeleteButton               |
| US-006 Szybkie dodawanie | Bottom Sheet       | FAB, BottomSheet, DynamicValueInput     |
| US-007 API Webhook       | API Tokens         | TokenList, CreateTokenModal             |
| US-008 Dashboard         | Dashboard          | TrackerGrid, TrackerCard, Sparkline     |
| US-009 Widok szczegółowy | Tracker Detail     | LineChart, EntryList, TimeRangeSelector |
| US-010 Eksport           | Settings/Export    | ExportForm                              |
| US-011 PWA               | Settings/Install   | PWAInstallPrompt                        |
| US-012 Reset hasła       | Reset Password     | EmailInput, SuccessMessage              |

---

## 7. Stany i walidacja

### 7.1. Stany ładowania

| Kontekst           | Komponent      | Zachowanie                |
| ------------------ | -------------- | ------------------------- |
| Lista trackerów    | TrackerGrid    | Skeleton cards (3-6)      |
| Szczegóły trackera | Tracker Detail | Skeleton chart + list     |
| Infinite scroll    | EntryList      | Spinner na dole           |
| Akcja mutacji      | Buttons        | Loading spinner, disabled |
| Eksport            | ExportForm     | Progress indicator        |

### 7.2. Stany błędów

| Błąd                 | Obsługa UI                              |
| -------------------- | --------------------------------------- |
| Walidacja formularza | Inline error pod polem (czerwony tekst) |
| 422 z API            | Mapowanie na pola formularza            |
| 404                  | Dedykowany widok "Nie znaleziono"       |
| 5xx                  | Error Boundary z przyciskiem retry      |
| Offline              | Banner + toast przy mutacji             |

### 7.3. Walidacja formularzy (Zod schemas)

| Formularz | Pola                          | Reguły                                     |
| --------- | ----------------------------- | ------------------------------------------ |
| Login     | email, password               | email format, min 8 chars                  |
| Register  | email, password, confirm      | jak login + password match                 |
| Tracker   | name, data_type, unit, config | name max 100, unit max 20, config per type |
| Entry     | value, recorded_at            | value per tracker type, valid ISO8601      |
| Token     | name, expires_at              | name max 50, valid date or null            |
| Profile   | display_name, timezone        | name max 100, valid timezone               |

---

## 8. Responsywność

### 8.1. Breakpoints

| Breakpoint | Szerokość  | Układ                                  |
| ---------- | ---------- | -------------------------------------- |
| Mobile     | < 768px    | Single column, Bottom Sheet full width |
| Tablet     | 768-1024px | 2 kolumny grid, modals centered        |
| Desktop    | > 1024px   | 3-4 kolumny grid, sidebars możliwe     |

### 8.2. Adaptacje komponentów

| Komponent    | Mobile           | Tablet/Desktop                              |
| ------------ | ---------------- | ------------------------------------------- |
| TrackerGrid  | Lista wertykalna | CSS Grid 2-4 kolumny                        |
| Sparkline    | Nieinteraktywny  | Tooltips on hover                           |
| Bottom Sheet | Full width       | Max-width 480px, centered                   |
| Navigation   | Bottom nav       | Bottom nav (opcjonalnie sidebar na desktop) |
| Charts       | Touch-friendly   | Mouse interactions                          |

---

## 9. Dostępność (a11y)

### 9.1. Wymagania WCAG AA

- Kontrast kolorów minimum 4.5:1 (tekst), 3:1 (duży tekst)
- Focus visible dla wszystkich interaktywnych elementów
- Skip links do głównej treści
- ARIA landmarks (main, nav, aside)

### 9.2. Komponenty z focus management

| Komponent    | Wymaganie                         |
| ------------ | --------------------------------- |
| Modal        | Focus trap, return focus on close |
| Bottom Sheet | Focus trap, escape to close       |
| Dropdown     | Arrow key navigation              |
| Form         | Tab order, error announcement     |

### 9.3. Screen reader support

- ARIA labels dla ikon bez tekstu
- ARIA live regions dla dynamicznych aktualizacji
- Poprawna hierarchia nagłówków (h1 → h2 → h3)
- Alt text dla wykresów (summary)

---

## 10. Bezpieczeństwo UI

### 10.1. Autentykacja

- JWT w pamięci (nie localStorage dla XSS protection)
- Automatyczne wylogowanie przy 401
- Secure cookie dla refresh token (if applicable)

### 10.2. Wrażliwe dane

- Tokeny API: masked preview, pełny token tylko raz
- Hasła: nigdy nie wyświetlane, input type="password"
- Potwierdzenie dla destrukcyjnych akcji (delete account, delete tracker)

### 10.3. Rate limiting feedback

- Toast przy 429 z informacją o czasie oczekiwania
- Disabled buttons podczas cooldown
