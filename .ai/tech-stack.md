# Tech Stack - Kipio

## Frontend

**Astro 5** - framework dla stron statycznych i hybrydowych
- Strony marketingowe (landing, pricing) jako statyczny HTML
- Zero JS domyślnie, React tylko gdzie potrzebny

**React 19** - interaktywność aplikacji
- Dashboard, formularze, wykresy
- Ładowany jako "island" w Astro (`client:only="react"`)

**TypeScript 5** - statyczne typowanie

**Tailwind CSS 4** - stylowanie

**Shadcn/ui** - komponenty UI

**Dodatkowe biblioteki:**
- React Router - routing wewnątrz aplikacji React
- Recharts - wykresy (sparklines, liniowe)
- React Hook Form + Zod - formularze z walidacją
- Workbox - PWA/Service Worker

## Backend

### Supabase (dane i auth)
- **PostgreSQL** - baza danych
- **Supabase Auth** - uwierzytelnianie (Google, GitHub, email)
- **Row Level Security** - dodatkowa warstwa autoryzacji

### NestJS (API layer)
- **NestJS 10** - framework API
- **TypeORM** - ORM (natywna integracja z NestJS, lepsze wsparcie dla RLS)
- **Passport.js** - walidacja JWT z Supabase Auth
- **class-validator** - walidacja DTO
- **@nestjs/throttler** - rate limiting

**Odpowiedzialności NestJS:**
- Endpointy REST dla trackerów i wpisów
- Webhook endpoint (POST /api/webhook)
- Rate limiting
- Logika biznesowa (eksport CSV/JSON, walidacja danych)
- Przyszłościowo: korelacje, integracje zewnętrzne

## Architektura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Astro     │────▶│   NestJS    │────▶│    Supabase     │
│  (Frontend) │     │   (API)     │     │  (DB + Auth)    │
└─────────────┘     └─────────────┘     └─────────────────┘
       │                   │                    │
       ▼                   ▼                    ▼
   Static pages      Business logic       PostgreSQL
   React SPA         Webhooks             Auth (JWT)
   PWA               Rate limiting        RLS
```

## Przepływ autentykacji

1. User loguje się przez Supabase Auth (frontend)
2. Supabase zwraca JWT token
3. Frontend wysyła JWT w header: `Authorization: Bearer <token>`
4. NestJS waliduje JWT przez Supabase public key
5. NestJS wykonuje query do Supabase DB (przez TypeORM)

## Struktura projektu (monorepo)

```
kipio/
├── apps/
│   ├── web/                 ← Astro + React
│   └── api/                 ← NestJS
├── packages/
│   └── shared/              ← Typy, walidatory (Zod schemas)
├── package.json
└── turbo.json
```

## CI/CD i Hosting

**Frontend (Astro):**
- Vercel lub Netlify

**Backend (NestJS):**
- DigitalOcean App Platform
- Docker container

**Baza danych:**
- Supabase (managed PostgreSQL)

**CI/CD:**
- GitHub Actions