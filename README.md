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
| `pnpm clean`        | Clean all build outputs and node_modules   |
| `pnpm dev:web`      | Start only the web application             |
| `pnpm dev:api`      | Start only the API application             |
| `pnpm build:web`    | Build only the web application             |
| `pnpm build:api`    | Build only the API application             |

### Web Application (`apps/web`)

| Script         | Description              |
| -------------- | ------------------------ |
| `pnpm dev`     | Start Astro dev server   |
| `pnpm build`   | Build for production     |
| `pnpm preview` | Preview production build |
| `pnpm lint`    | Run ESLint               |

### API Application (`apps/api`)

| Script             | Description                |
| ------------------ | -------------------------- |
| `pnpm dev`         | Start NestJS in watch mode |
| `pnpm build`       | Build for production       |
| `pnpm start`       | Start production server    |
| `pnpm start:debug` | Start with debugging       |
| `pnpm test`        | Run Jest tests             |
| `pnpm test:cov`    | Run tests with coverage    |

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
