### Specyfikacja Techniczna: Moduł Autentykacji Kipio

Poniższy dokument opisuje architekturę i plan wdrożenia modułu uwierzytelniania i zarządzania kontem użytkownika w aplikacji Kipio, zgodnie z dokumentami `prd.md` (historyjki US-001, US-002, US-012) oraz `tech-stack.md`.

---

### 1. Architektura Interfejsu Użytkownika (Frontend)

Warstwa frontendowa zostanie zrealizowana w `apps/web` przy użyciu Astro dla struktury i stron statycznych oraz React dla komponentów interaktywnych.

#### 1.1. Nowe Strony (Astro)

- **`/login`**: Strona logowania. Będzie zawierać interaktywny komponent React `LoginForm`.
- **`/register`**: Strona rejestracji. Będzie zawierać interaktywny komponent React `RegisterForm`.
- **`/password-reset`**: Strona do inicjowania procesu resetowania hasła. Będzie zawierać komponent React `PasswordResetForm`.
- **`/update-password`**: Strona, na którą użytkownik jest przekierowywany z linku w mailu w celu ustawienia nowego hasła. Będzie zawierać komponent React `UpdatePasswordForm`.

#### 1.2. Nowe Komponenty (React)

Komponenty te będą renderowane po stronie klienta (`client:load`) wewnątrz odpowiednich stron Astro.

- **`AuthForm.tsx` (`src/components/auth/`)**:
  - **Opis**: Centralny, interaktywny komponent React obsługujący logikę formularzy logowania, rejestracji i resetowania hasła. Będzie renderował różne warianty w zależności od przekazanych `props`.
  - **Odpowiedzialność**:
    - Zarządzanie stanem formularza (e-mail, hasło).
    - Walidacja po stronie klienta (np. format e-mail, siła hasła) przy użyciu `react-hook-form` i `zod`.
    - Komunikacja z endpointami API Astro (`/api/auth/...`) w celu wykonania operacji autentykacji.
    - Obsługa logowania przez dostawców OAuth (Google, GitHub) poprzez wywołanie odpowiedniej metody z klienta Supabase.
    - Wyświetlanie komunikatów o błędach (np. "Nieprawidłowe hasło", "Użytkownik już istnieje") oraz sukcesie.
  - **Integracja**: Komponent będzie osadzony na stronach `/login`, `/register` i `/password-reset`.

- **`UserMenu.tsx` (`src/components/layout/`)**:
  - **Opis**: Komponent wyświetlany w nagłówku aplikacji po zalogowaniu.
  - **Odpowiedzialność**:
    - Wyświetlanie avatara/nazwy użytkownika.
    - Udostępnienie menu kontekstowego z opcjami "Ustawienia" i "Wyloguj".
    - Wywołanie endpointu `/api/auth/logout` po kliknięciu "Wyloguj".

#### 1.3. Modyfikacja Layoutów i Komponentów

- **`src/layouts/Layout.astro`**:
  - Główny layout aplikacji zostanie zmodyfikowany, aby warunkowo renderować komponenty w zależności od stanu autentykacji użytkownika.
  - W sekcji `<head>` zostanie dodany skrypt, który odczyta token JWT z `localStorage` i umieści go w `Astro.locals`, aby był dostępny po stronie serwera.
  - W nagłówku, zamiast statycznych linków, pojawi się logika warunkowa:
    - Jeśli użytkownik jest zalogowany: wyświetl komponent `UserMenu`.
    - Jeśli użytkownik nie jest zalogowany: wyświetl przyciski "Zaloguj" i "Zarejestruj", kierujące do odpowiednich stron.

#### 1.4. Scenariusze i Walidacja

- **Logowanie**: Użytkownik podaje e-mail i hasło. Formularz waliduje dane i wysyła je do API. W przypadku błędu (np. nieprawidłowe dane) wyświetlany jest komunikat. Po sukcesie następuje przekierowanie na stronę główną (`/`).
- **Rejestracja**: Użytkownik podaje e-mail i hasło. Formularz waliduje siłę hasła (min. 8 znaków) i format e-maila. Po wysłaniu danych, Supabase wysyła e-mail weryfikacyjny. Użytkownik jest informowany o konieczności potwierdzenia adresu e-mail.
- **Logowanie OAuth**: Użytkownik klika przycisk "Zaloguj z Google/GitHub". Wywoływana jest metoda Supabase, która przekierowuje na stronę dostawcy tożsamości. Po pomyślnej autentykacji użytkownik wraca do aplikacji, jest zalogowany i przekierowany na stronę główną.
- **Resetowanie hasła**: Użytkownik podaje swój adres e-mail. Po wysłaniu formularza otrzymuje informację, że link do resetu hasła został wysłany.

---

### 2. Logika Backendowa (Astro API Endpoints)

Logika backendowa zostanie zaimplementowana jako Server Endpoints w Astro (`src/pages/api/`), co jest zgodne z architekturą i eliminuje potrzebę oddzielnego serwera dla prostych operacji na koncie.

#### 2.1. Struktura Endpointów API

- **`POST /api/auth/login`**:
  - **Odpowiedzialność**: Logowanie użytkownika za pomocą e-maila i hasła.
  - **Logika**:
    1. Odbiera `email` i `password` z ciała żądania.
    2. Waliduje dane wejściowe przy użyciu `zod`.
    3. Wywołuje `supabase.auth.signInWithPassword()`.
    4. W przypadku sukcesu, zwraca sesję użytkownika i ustawia odpowiednie ciasteczka.
    5. W przypadku błędu, zwraca status 401 lub 400 z komunikatem błędu.

- **`POST /api/auth/register`**:
  - **Odpowiedzialność**: Rejestracja nowego użytkownika.
  - **Logika**:
    1. Odbiera `email` i `password`.
    2. Waliduje dane (format e-mail, siła hasła).
    3. Wywołuje `supabase.auth.signUp()`. Supabase automatycznie obsłuży wysyłkę e-maila weryfikacyjnego.
    4. Zwraca status 201 z informacją o konieczności weryfikacji.

- **`POST /api/auth/logout`**:
  - **Odpowiedzialność**: Wylogowanie użytkownika.
  - **Logika**:
    1. Wywołuje `supabase.auth.signOut()`.
    2. Czyści ciasteczka sesji.
    3. Zwraca status 200 i przekierowuje na stronę główną.

- **`POST /api/auth/password-reset`**:
  - **Odpowiedzialność**: Inicjowanie procesu resetowania hasła.
  - **Logika**:
    1. Odbiera `email`.
    2. Wywołuje `supabase.auth.resetPasswordForEmail()`.
    3. Zwraca status 200 z komunikatem o wysłaniu instrukcji.

- **`POST /api/auth/update-password`**:
  - **Odpowiedzialność**: Aktualizacja hasła użytkownika.
  - **Logika**:
    1. Odbiera `password` i token sesji (który Astro automatycznie pobiera z ciasteczek).
    2. Wywołuje `supabase.auth.updateUser()` do ustawienia nowego hasła.
    3. Zwraca sukces i przekierowuje na stronę logowania.

#### 2.2. Middleware (`src/middleware/index.ts`)

- **Odpowiedzialność**: Ochrona tras i zarządzanie sesją.
- **Logika**:
  1. Middleware będzie uruchamiany dla każdego żądania.
  2. Sprawdzi obecność i ważność tokenu JWT w ciasteczkach przy użyciu `supabase.auth.getUser()`.
  3. Jeśli użytkownik jest zalogowany, jego dane zostaną umieszczone w `context.locals.user`, dzięki czemu będą dostępne w komponentach Astro i endpointach API.
  4. Zabezpieczy trasy wymagające autentykacji (np. `/dashboard`, `/settings`). Jeśli niezalogowany użytkownik spróbuje uzyskać do nich dostęp, zostanie przekierowany na stronę `/login`.
  5. Strony publiczne (`/login`, `/register`, `/`) będą dostępne dla wszystkich.

---

### 3. System Autentykacji (Integracja z Supabase)

- **Klient Supabase**: Zostanie utworzony centralny klient Supabase (`src/db/supabase.ts`), który będzie reużywany w całej aplikacji – zarówno w endpointach API, jak i potencjalnie po stronie klienta.
- **Zmienne środowiskowe**: Klucze Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) będą przechowywane w pliku `.env` i dostępne w Astro poprzez `import.meta.env`.
- **Obsługa sesji**: Astro, w połączeniu z biblioteką `@supabase/ssr`, będzie zarządzać sesją użytkownika za pomocą ciasteczek HTTP-only, co jest bezpieczniejsze niż przechowywanie tokenów w `localStorage` po stronie klienta. Middleware będzie odświeżać tokeny automatycznie.
- **Dostawcy OAuth**: Konfiguracja dostawców Google i GitHub zostanie wykonana w panelu Supabase. Logika po stronie klienta (w komponencie React) będzie jedynie wywoływać `supabase.auth.signInWithOAuth()` z odpowiednim `provider`.
