# Dokument wymagań produktu (PRD) - Kipio

## 1. Przegląd produktu

Kipio to aplikacja typu "Personal Data Warehouse" działająca jako Progressive Web App (PWA). Jej głównym celem jest umożliwienie zaawansowanym użytkownikom (Power Users, Bio-hackerzy, entuzjaści Quantified Self) gromadzenia, przechowywania i wizualizacji dowolnych danych historycznych w jednym miejscu.

System rozwiązuje problem rozproszenia danych pomiędzy różnymi, sztywnymi aplikacjami (zdrowie, finanse, nawyki) oraz trudności w agregacji danych pochodzących z automatyzacji (np. skryptów, IoT). Kipio stawia na elastyczność definicji metryk, szybkość wprowadzania danych manualnych (Mobile-first) oraz łatwość integracji automatycznych poprzez proste API (Webhooks). Aplikacja jest realizowana w podejściu "Online-first" z wykorzystaniem Supabase jako backendu.

## 2. Problem użytkownika

Główne problemy, które rozwiązuje Kipio:
- Rozproszenie danych: Użytkownicy muszą przełączać się między wieloma aplikacjami, aby śledzić różne aspekty życia (waga w jednej apce, finanse w innej, nawyki w kolejnej).
- Brak elastyczności: Dedykowane aplikacje narzucają, co i jak można mierzyć. Użytkownik nie może łatwo zdefiniować nietypowej metryki (np. "poziom energii po kawie" lub "liczba stron przeczytanych w książce").
- Trudność integracji: Profesjonalne narzędzia BI (jak InfluxDB + Grafana) są zbyt skomplikowane w konfiguracji i utrzymaniu dla użytkownika indywidualnego, który nie chce zarządzać serwerami.
- Problem "Pustego Ekranu": Rozpoczynanie pracy z uniwersalnym narzędziem bywa trudne i zniechęcające bez wstępnej konfiguracji.
- Brak kontekstu: Dane w notatnikach lub arkuszach kalkulacyjnych są trudne do szybkiej wizualizacji i analizy trendów na urządzeniach mobilnych.

## 3. Wymagania funkcjonalne

### 3.1. Uwierzytelnianie i Zarządzanie Kontem
- Logowanie za pomocą dostawców tożsamości (Social Login): Google oraz GitHub (via Supabase Auth).
- Obsługa tradycyjnej rejestracji i logowania za pomocą adresu e-mail i hasła.
- Mechanizm odzyskiwania/resetowania zapomnianego hasła.
- Możliwość usunięcia konta wraz ze wszystkimi danymi (wymóg RODO/GDPR).

### 3.2. Onboarding
- Kreator startowy (Wizard) wyświetlany po pierwszym zalogowaniu.
- Możliwość wyboru gotowych pakietów trackerów (np. "Zdrowie", "Produktywność", "Mały Biznes"), które automatycznie konfigurują przestrzeń użytkownika.

### 3.3. Zarządzanie Trackerami (Definicje metryk)
- Tworzenie, edycja i usuwanie definicji trackerów.
- Obsługiwane typy danych:
  - Liczba (z opcjonalną jednostką tekstową, np. kg, ml, min).
  - Skala (wartość liczbowa z określonego przedziału, np. 1-10).
  - Tak/Nie (wartość logiczna).
  - Krótki Tekst (notatki, tagi).
- Ustawienie koloru lub ikony dla trackera (opcjonalnie, dla rozróżnienia wizualnego).

### 3.4. Wprowadzanie Danych (Input)
- Manualne (Interfejs):
  - Zoptymalizowany pod urządzenia mobilne (PWA).
  - Wykorzystanie komponentu typu "Bottom Sheet" (Dolny Arkusz) dla szybkiego dostępu.
  - Czas dodania wpisu zminimalizowany do kilku kliknięć.
- Automatyczne (API):
  - Unikalny token API dla każdego użytkownika.
  - Endpoint HTTP POST przyjmujący payload JSON.
  - Walidacja przychodzących danych pod kątem typu zdefiniowanego trackera.

### 3.5. Wizualizacja i Przegląd Danych
- Dashboard Główny:
  - Lista kafelków reprezentujących aktywne trackery.
  - Mini-wykresy (sparklines) prezentujące trend z ostatnich 7 dni dla każdego trackera.
- Widok Szczegółowy Trackera:
  - Wykres liniowy (dla danych liczbowych).
  - Heatmapa (kalendarz aktywności - dla danych boolean i częstości).
  - Lista historyczna wpisów z możliwością edycji i usuwania pojedynczych rekordów.

### 3.6. Ustawienia i Dane
- Eksport wszystkich danych użytkownika do formatu CSV lub JSON.
- Generowanie i regenerowanie klucza API.
- Przełącznik motywu (Domyślny Dark Mode).

## 4. Granice produktu

### 4.1. Co jest zawarte w MVP
- Aplikacja webowa PWA działająca w przeglądarkach nowoczesnych (Chrome, Safari, Firefox).
- Przechowywanie danych w chmurze (wymagane połączenie z internetem).
- Język interfejsu: Angielski.
- Limity techniczne ("Soft limits"): np. max 50 trackerów, limit zapytań API na godzinę (ochrona przed nadużyciami).

### 4.2. Czego NIE obejmuje MVP
- Aplikacja natywna (iOS/Android) publikowana w AppStore/Google Play.
- Tryb offline i synchronizacja po odzyskaniu połączenia (złożoność techniczna odłożona na później).
- Funkcje społecznościowe (udostępnianie wykresów, rankingi).
- Zaawansowane analizy AI i korelacje automatyczne.
- Bezpośrednie integracje z zewnętrznymi API (np. łączenie bezpośrednio z API Fitbit) - integracja tylko poprzez webhook przychodzący.
- System powiadomień Push.

## 5. Historyjki użytkowników

### Uwierzytelnianie i Bezpieczeństwo

US-001 Logowanie i Rejestracja (Social Media + Email)
Opis: Jako nowy lub powracający użytkownik, chcę mieć wybór między szybkim logowaniem przez Google/GitHub a tradycyjnym kontem e-mail, aby korzystać z metody, którą preferuję.
Kryteria akceptacji:
- Na ekranie powitalnym widoczne są przyciski "Zaloguj z Google", "Zaloguj z GitHub" oraz formularz e-mail/hasło.
- Dostępne są wyraźne opcje przełączania między widokiem logowania a rejestracji dla kont e-mail.
- Walidacja formatu adresu e-mail i siły hasła (min. 8 znaków) podczas rejestracji.
- Po udanej autoryzacji (dowolną metodą) użytkownik jest przekierowywany do Dashboardu.
- W przypadku błędu (np. błędne hasło, zajęty e-mail) wyświetlany jest czytelny komunikat.

US-012 Resetowanie hasła
Opis: Jako użytkownik logujący się e-mailem, chcę zresetować hasło, gdy je zapomnę, aby odzyskać dostęp do konta.
Kryteria akceptacji:
- Na ekranie logowania dostępny jest link "Nie pamiętam hasła".
- Po podaniu adresu e-mail system wysyła link resetujący (obsługiwane przez Supabase Auth).
- Użytkownik może ustawić nowe hasło po kliknięciu w link z maila.

US-002 Wylogowanie
Opis: Jako zalogowany użytkownik, chcę mieć możliwość wylogowania się z aplikacji na współdzielonym urządzeniu.
Kryteria akceptacji:
- Przycisk wylogowania jest dostępny w menu ustawień.
- Po kliknięciu sesja jest niszczona, a użytkownik wraca do ekranu powitalnego.

### Onboarding

US-003 Wybór szablonów startowych
Opis: Jako nowy użytkownik, chcę wybrać gotowy zestaw trackerów podczas pierwszego uruchomienia, aby nie zaczynać z pustym ekranem.
Kryteria akceptacji:
- Po pierwszym logowaniu wyświetla się kreator.
- Użytkownik widzi listę pakietów (np. Zdrowie, Praca).
- Użytkownik może zaznaczyć jeden lub więcej pakietów lub pominąć krok.
- Po zatwierdzeniu, wybrane trackery są automatycznie tworzone w bazie danych użytkownika.

### Zarządzanie Trackerami

US-004 Definiowanie nowego trackera
Opis: Jako użytkownik, chcę dodać nowy niestandardowy tracker, aby móc mierzyć specyficzną dla mnie metrykę.
Kryteria akceptacji:
- Użytkownik podaje nazwę trackera.
- Użytkownik wybiera typ danych (Liczba, Skala, Tak/Nie, Tekst).
- Dla typu Liczba opcjonalnie podaje jednostkę.
- Tracker pojawia się na liście na Dashboardzie natychmiast po utworzeniu.

US-005 Edycja i usuwanie trackera
Opis: Jako użytkownik, chcę poprawić nazwę trackera lub go usunąć, jeśli przestanę go używać.
Kryteria akceptacji:
- Dostępna opcja edycji nazwy i jednostki.
- Dostępna opcja usunięcia trackera.
- Przy usuwaniu system pyta o potwierdzenie (operacja nieodwracalna, usuwa też historię pomiarów tego trackera).

### Wprowadzanie Danych

US-006 Szybkie dodawanie danych (Mobile)
Opis: Jako użytkownik mobilny, chcę dodać nowy pomiar w mniej niż 5 sekund korzystając z telefonu, aby nie przerywać bieżącej czynności.
Kryteria akceptacji:
- Kliknięcie w tracker na Dashboardzie otwiera formularz (najlepiej Bottom Sheet).
- Pole wartości jest automatycznie aktywne (autofocus).
- Domyślna data i czas to "teraz", z możliwością zmiany.
- Przycisk "Zapisz" jest łatwo dostępny pod kciukiem.

US-007 Przesyłanie danych przez API (Webhook)
Opis: Jako Power User, chcę wysłać dane JSON na unikalny adres URL, aby automatycznie logować zdarzenia z innych systemów (np. n8n, skrypty).
Kryteria akceptacji:
- System udostępnia endpoint POST.
- Żądanie musi zawierać poprawny token API w nagłówku lub parametrze.
- Body żądania musi zawierać identyfikator trackera i wartość zgodną z jego typem.
- System zwraca kod 201 przy sukcesie lub 400/401 przy błędzie.

### Wizualizacja i Analiza

US-008 Przegląd Dashboardu
Opis: Jako użytkownik, chcę widzieć listę moich wszystkich trackerów wraz z miniaturowym wykresem (sparkline), aby szybko ocenić trendy z ostatniego tygodnia.
Kryteria akceptacji:
- Każdy tracker jest osobnym kafelkiem/wierszem.
- Wyświetlana jest nazwa i ostatnia zarejestrowana wartość.
- Obok widoczny jest uproszczony wykres liniowy z ostatnich 7 dni.

US-009 Widok szczegółowy i historia
Opis: Jako użytkownik, chcę wejść w szczegóły trackera, aby zobaczyć dokładny wykres i edytować błędne wpisy z przeszłości.
Kryteria akceptacji:
- Widok zawiera większy wykres z możliwością zmiany zakresu czasu (np. 7 dni, 30 dni).
- Poniżej wykresu znajduje się lista wpisów posortowana chronologicznie malejąco.
- Każdy wpis na liście ma opcję edycji wartości i daty oraz usunięcia.

### Ustawienia i Dane

US-010 Eksport danych
Opis: Jako użytkownik, chcę pobrać wszystkie moje dane do pliku CSV, aby móc je przeanalizować w Excelu lub zachować kopię zapasową.
Kryteria akceptacji:
- Przycisk "Eksportuj dane" w ustawieniach.
- System generuje plik CSV lub JSON zawierający wszystkie wpisy wszystkich trackerów.
- Plik jest pobierany przez przeglądarkę.

US-011 Instalacja PWA
Opis: Jako użytkownik mobilny, chcę zainstalować aplikację na ekranie głównym telefonu, aby mieć do niej szybki dostęp bez paska adresu przeglądarki.
Kryteria akceptacji:
- Aplikacja posiada poprawny manifest i Service Worker.
- Przeglądarka rozpoznaje aplikację jako instalowalną (spełnia kryteria PWA).
- Po dodaniu do ekranu głównego aplikacja uruchamia się w trybie pełnoekranowym (standalone).

## 6. Metryki sukcesu

Poniższe metryki będą monitorowane w celu oceny sukcesu MVP:

- Retencja D7 (Dzień 7): Procent użytkowników, którzy dodali jakikolwiek wpis (manualnie lub przez API) w 7. dniu po rejestracji. Cel: > 20%.
- Time-to-Value (TTV): Średni czas od zakończenia rejestracji do dodania pierwszego wpisu danych. Cel: < 60 sekund (wspierane przez Onboarding).
- Adopcja API: Procent użytkowników, którzy wygenerowali klucz API i przesłali przynajmniej jedno udane żądanie w ciągu pierwszego miesiąca. Weryfikuje to hipotezę o grupie docelowej "Power Users".
- Aktywność (Stickiness): Stosunek DAU/MAU (Daily Active Users / Monthly Active Users). Celuje w budowanie codziennych nawyków.
- Liczba aktywnych trackerów: Średnia liczba trackerów z przynajmniej jednym wpisem w tygodniu na aktywnego użytkownika.

