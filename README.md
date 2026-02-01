# Kipio

A Personal Data Warehouse application designed for Power Users, Bio-hackers, and Quantified Self enthusiasts. Kipio enables collecting, storing, and visualizing arbitrary historical data in one centralized place through a Progressive Web App (PWA).

[![Node.js](https://img.shields.io/badge/Node.js-24.12.0-green)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.15.1-orange)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Running with Docker](#running-with-docker)
- [Testing](#testing)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

Kipio solves the problem of data fragmentation across multiple rigid applications (health, finance, habits) and the difficulty of aggregating data from automation sources (scripts, IoT). The application emphasizes:

- **Flexible metric definitions** - Define and track any custom metric you need
- **Mobile-first data entry** - Optimized for quick manual input on mobile devices
- **Easy automation integration** - Simple API with webhook support for external data sources
- **Visual insights** - Dashboard with sparklines and detailed charts for trend analysis

### Key Features

- 🔐 **Authentication** - Social login (Google, GitHub) and email/password via Supabase Auth
- 📊 **Custom Trackers** - Support for numbers, scales, boolean, and text data types
- 📱 **PWA Support** - Installable app with mobile-optimized interface
- 🔗 **Webhook API** - Unique API tokens for automated data ingestion
- 📈 **Data Visualization** - Sparklines, line charts, and historical data views
- 📤 **Data Export** - Export all data to CSV or JSON format

## Tech Stack

### Frontend

| Technology                                      | Version | Purpose                         |
| ----------------------------------------------- | ------- | ------------------------------- |
| [Astro](https://astro.build/)                   | 5.x     | Static & hybrid pages framework |
| [React](https://react.dev/)                     | 19.x    | Interactive UI components       |
| [TypeScript](https://www.typescriptlang.org/)   | 5.x     | Static typing                   |
| [Tailwind CSS](https://tailwindcss.com/)        | 4.x     | Utility-first styling           |
| [Shadcn/ui](https://ui.shadcn.com/)             | -       | UI component library            |
| [Recharts](https://recharts.org/)               | 3.x     | Charts and sparklines           |
| [React Hook Form](https://react-hook-form.com/) | 7.x     | Form handling                   |
| [Zod](https://zod.dev/)                         | 4.x     | Schema validation               |

### Backend

| Technology                                                      | Version | Purpose                              |
| --------------------------------------------------------------- | ------- | ------------------------------------ |
| [NestJS](https://nestjs.com/)                                   | 11.x    | API framework                        |
| [TypeORM](https://typeorm.io/)                                  | 0.3.x   | Database ORM                         |
| [Supabase](https://supabase.com/)                               | -       | PostgreSQL database & authentication |
| [Passport.js](https://www.passportjs.org/)                      | -       | JWT validation                       |
| [class-validator](https://github.com/typestack/class-validator) | -       | DTO validation                       |

### Testing

| Technology                                                      | Version | Purpose                              |
| --------------------------------------------------------------- | ------- | ------------------------------------ |
| [Jest](https://jestjs.io/)                                      | 30.x    | Unit & integration testing framework |
| [@nestjs/testing](https://docs.nestjs.com/fundamentals/testing) | 11.x    | NestJS testing utilities             |
| [ts-jest](https://kulshekhar.github.io/ts-jest/)                | 29.x    | TypeScript support for Jest          |
| [Vitest](https://vitest.dev/)                                   | 4.x     | Frontend unit testing                |
| [@testing-library/react](https://testing-library.com/react)     | 16.x    | React component testing              |
| [Playwright](https://playwright.dev/)                           | 1.x     | E2E testing                          |
| [k6](https://k6.io/)                                            | -       | Performance & load testing (planned) |

### Infrastructure

| Tool                                       | Purpose               |
| ------------------------------------------ | --------------------- |
| [Turborepo](https://turbo.build/)          | Monorepo build system |
| [pnpm](https://pnpm.io/)                   | Package manager       |
| [Husky](https://typicode.github.io/husky/) | Git hooks             |
| [ESLint](https://eslint.org/)              | Code linting          |
| [Prettier](https://prettier.io/)           | Code formatting       |

### Architecture

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

## Getting Started Locally

### Prerequisites

- **Node.js** >= 24.12.0
- **pnpm** >= 9.0.0

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/damiankulon/kipio.git
   cd kipio
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure environment variables**

   ```bash
   # Copy example environment files
   cp apps/web/.env.example apps/web/.env
   cp apps/api/.env.example apps/api/.env
   ```

   Update the `.env` files with your Supabase credentials and other configuration.

4. **Set up Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Copy the project URL and API keys to your `.env` files
   - Configure Row Level Security (RLS) for tables

5. **Start development servers**

   ```bash
   pnpm dev
   ```

   - Frontend: http://localhost:4321
   - API: http://localhost:3001

## Running with Docker

Projekt można uruchomić na dwa sposoby: używając `docker compose` (zalecane) lub manualnie budując i uruchamiając każdy obraz z osobna za pomocą `docker run`.

### Uruchamianie za pomocą `docker compose`

1.  **Skonfiguruj zmienne środowiskowe**

    Utwórz plik `.env` w głównym katalogu projektu (możesz skopiować `.env.example`, jeśli istnieje) i uzupełnij go wymaganymi kluczami, np. do Supabase. `docker-compose.yml` automatycznie wczyta ten plik.

2.  **Zbuduj i uruchom**

    ```bash
    docker compose up --build
    ```

    - Frontend: http://localhost:8080
    - API: http://localhost:3000

3.  **Opcjonalnie – tylko jedna aplikacja**

    ```bash
    docker compose up --build api # tylko API
    docker compose up --build web # tylko Web
    ```

### Uruchamianie za pomocą `docker run` (manualne)

Ta metoda wymaga manualnego zbudowania każdego obrazu i przekazania zmiennych środowiskowych.

1.  **Zbuduj obrazy Docker**

    ```bash
    # Budowanie obrazu dla aplikacji API
    docker build -t dkulon/kipio-api:latest -f apps/api/Dockerfile .

    # Budowanie obrazu dla aplikacji Web
    docker build -t dkulon/kipio-web:latest -f apps/web/Dockerfile .
    ```

2.  **Uruchom kontenery**

    Zastąp `<TWOJE_ZMIENNE>` rzeczywistymi wartościami.

    ```bash
    # Uruchamianie kontenera API na porcie 3000
    docker run -d -p 3000:3000 \
      -e "PORT=3001" \
      -e "NODE_ENV=production" \
      -e "FRONTEND_URL=http://localhost:8080" \
      -e "SUPABASE_URL=<TWOJE_ZMIENNE>" \
      -e "SUPABASE_ANON_KEY=<TWOJE_ZMIENNE>" \
      -e "SUPABASE_JWT_SECRET=<TWOJE_ZMIENNE>" \
      -e "SUPABASE_SERVICE_ROLE_KEY=<TWOJE_ZMIENNE>" \
      --name kipio-api \
      dkulon/kipio-api:latest

    # Uruchamianie kontenera Web na porcie 8080
    docker run -d -p 8080:8080 \
      -e "SUPABASE_URL=<TWOJE_ZMIENNE>" \
      -e "SUPABASE_KEY=<TWOJE_ZMIENNE>" \
      -e "SUPABASE_JWT_SECRET=<TWOJE_ZMIENNE>" \
      -e "API_URL=http://localhost:3000" \
      --name kipio-web \
      dkulon/kipio-web:latest
    ```

Kontekst budowania to katalog główny repozytorium; Dockerfile dla API i Web znajdują się w `apps/api/Dockerfile` i `apps/web/Dockerfile`.

## Testing

This project uses multiple testing frameworks to ensure code quality and reliability:

- **Jest** - Unit and integration tests for NestJS backend
- **Vitest** - Unit tests for React components and frontend logic
- **Playwright** - End-to-end tests for full user workflows

### Quick Start

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Install Playwright browsers**

   ```bash
   pnpm exec playwright install chromium
   ```

3. **Run all tests**
   ```bash
   pnpm test
   ```

### Running Tests

```bash
# Backend unit tests (Jest)
pnpm --filter @kipio/api test
pnpm --filter @kipio/api test:watch
pnpm --filter @kipio/api test:cov

# Frontend unit tests (Vitest)
pnpm --filter @kipio/web test
pnpm --filter @kipio/web test:watch
pnpm --filter @kipio/web test:ui

# E2E tests (Playwright)
pnpm test:e2e
pnpm test:e2e:ui
pnpm test:e2e:debug
```

### Coverage Requirements

Both Jest and Vitest are configured with **80% coverage thresholds**:

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

### Documentation

For detailed testing guidelines, configuration, and best practices, see [TESTING.md](TESTING.md).

## Available Scripts

### Root (Monorepo)

| Script              | Description                                |
| ------------------- | ------------------------------------------ |
| `pnpm dev`          | Start all applications in development mode |
| `pnpm build`        | Build all applications                     |
| `pnpm start`        | Start all applications in production mode  |
| `pnpm lint`         | Run ESLint across all packages             |
| `pnpm format`       | Format code with Prettier                  |
| `pnpm format:check` | Check code formatting                      |
| `pnpm test`         | Run tests across all packages              |
| `pnpm test:e2e`     | Run Playwright E2E tests                   |
| `pnpm test:e2e:ui`  | Run E2E tests in UI mode                   |
| `pnpm clean`        | Clean all build outputs and node_modules   |
| `pnpm dev:web`      | Start only the web application             |
| `pnpm dev:api`      | Start only the API application             |
| `pnpm build:web`    | Build only the web application             |
| `pnpm build:api`    | Build only the API application             |

### Web Applicati | Description |

| ------------------- | ------------------------------ |
| `pnpm dev` | Start Astro dev server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:ui` | Run tests in UI mode |
| `pnpm test:coverage`| Run tests with coverage report |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run ESLint |

### API Application (`apps/api`)

| Script             | Description                |
| ------------------ | -------------------------- |
| `pnpm dev`         | Start NestJS in watch mode |
| `pnpm build`       | Build for production       |
| `pnpm start`       | Start production server    |
| `pnpm start:debug` | Starbackend E2E tests      |
| `pnpm test:debug`  | Run tests in debug mode    |
| `pnpm test`        | Run Jest tests             |
| `pnpm test:cov`    | Run tests with coverage    |
| `pnpm test:watch`  | Run tests in watch mode    |
| `pnpm test:e2e`    | Run E2E tests (planned)    |

## Project Scope

### MVP Features (In Scope)

- ✅ PWA web application (Chrome, Safari, Firefox)
- ✅ Cloud data storage (online-first approach)
- ✅ Social authentication (Google, GitHub) and email/password
- ✅ Custom tracker creation with multiple data types
- ✅ Mobile-optimized manual data entry
- ✅ Webhook API for automated data ingestion
- ✅ Dashboard with sparklines and trend visualization
- ✅ Detailed tracker views with charts and history
- ✅ Data export (CSV/JSON)
- ✅ Dark mode theme
- ✅ English language interface
- ✅ Soft limits (max 50 trackers, API rate limiting)

### Out of MVP Scope

- ❌ Native mobile applications (iOS/Android)
- ❌ Offline mode with sync
- ❌ Social features (sharing, rankings)
- ❌ AI-powered analytics and correlations
- ❌ Direct third-party API integrations (e.g., Fitbit)
- ❌ Push notifications

## Project Status

🚧 **Status: In Development**

This project is currently in active development, working towards the MVP release.

### Project Structure

```
kipio/
├── apps/
│   ├── web/                 # Astro + React frontend
│   │   ├── src/
│   │   │   ├── components/  # UI components
│   │   │   ├── layouts/     # Page layouts
│   │   │   ├── pages/       # Astro pages
│   │   │   ├── lib/         # Utilities
│   │   │   └── styles/      # Global styles
│   │   └── public/          # Static assets
│   └── api/                 # NestJS backend
│       └── src/
│           └── ...          # API modules
├── packages/
│   └── shared/              # Shared types and validators
├── .ai/                     # AI documentation
├── spec/                    # Specifications
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
