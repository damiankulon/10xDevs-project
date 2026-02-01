# Testing Setup Guide

## Overview

This project uses multiple testing frameworks:

- **Jest** - Unit tests for NestJS backend
- **Vitest** - Unit tests for Astro/React frontend
- **Playwright** - End-to-end tests

## Installation

Install all dependencies:

```bash
pnpm install
```

Install Playwright browsers (only Chromium):

```bash
pnpm exec playwright install chromium
```

## Running Tests

### All Tests

```bash
pnpm test
```

### Backend Unit Tests (Jest)

```bash
# Run all backend tests
pnpm --filter @kipio/api test

# Watch mode
pnpm --filter @kipio/api test:watch

# Coverage report
pnpm --filter @kipio/api test:cov

# Debug mode
pnpm --filter @kipio/api test:debug
```

### Frontend Unit Tests (Vitest)

```bash
# Run all frontend tests
pnpm --filter @kipio/web test

# Watch mode
pnpm --filter @kipio/web test:watch

# UI mode
pnpm --filter @kipio/web test:ui

# Coverage report
pnpm --filter @kipio/web test:coverage
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
pnpm test:e2e

# UI mode
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug

# Generate tests (codegen)
pnpm test:e2e:codegen
```

## Test Structure

```
apps/
├── api/
│   ├── src/
│   │   └── **/*.spec.ts          # Unit tests
│   └── test/
│       ├── setup.ts               # Jest setup
│       ├── jest-e2e.json          # E2E config
│       └── **/*.e2e-spec.ts       # API E2E tests
│
├── web/
│   ├── src/
│   │   └── **/*.{test,spec}.tsx   # Component tests
│   └── test/
│       └── setup.ts               # Vitest setup
│
e2e/
└── **/*.spec.ts                   # Playwright E2E tests
```

## Configuration Files

- `apps/api/jest.config.ts` - Jest configuration
- `apps/api/test/setup.ts` - Jest global setup
- `apps/web/vitest.config.ts` - Vitest configuration
- `apps/web/test/setup.ts` - Vitest global setup
- `playwright.config.ts` - Playwright configuration

## Guidelines

### Jest (Backend)

- Use `@nestjs/testing` for creating test modules
- Mock external dependencies with `jest.fn()` and `jest.spyOn()`
- Use `describe` blocks for organization
- Implement `beforeEach` and `afterEach` for setup/teardown
- Use `supertest` for HTTP endpoint testing

### Vitest (Frontend)

- Use `vi` object for mocks: `vi.fn()`, `vi.spyOn()`, `vi.stubGlobal()`
- Place mock factories at top level
- Use `@testing-library/react` for component testing
- Prefer inline snapshots: `toMatchInlineSnapshot()`
- Enable jsdom environment for DOM testing
- Follow Arrange-Act-Assert pattern

### Playwright (E2E)

- Use only Chromium browser
- Implement Page Object Model pattern
- Use browser contexts for test isolation
- Leverage locators for element selection
- Use `expect(page).toHaveScreenshot()` for visual comparisons
- Use codegen tool for recording tests
- Use trace viewer for debugging

## CI/CD

Tests run automatically on:

- Pull requests
- Pushes to main branch

## Troubleshooting

### Jest Issues

- Clear cache: `pnpm --filter @kipio/api exec jest --clearCache`
- Update snapshots: `pnpm --filter @kipio/api test -- -u`

### Vitest Issues

- Clear cache: `pnpm --filter @kipio/web exec vitest --clearCache`
- Update snapshots: `pnpm --filter @kipio/web test -- -u`

### Playwright Issues

- Reinstall browsers: `pnpm exec playwright install chromium --force`
- Show report: `pnpm exec playwright show-report`
- View traces: `pnpm exec playwright show-trace <trace-file>`

## Next Steps

1. Install dependencies: `pnpm install`
2. Install Playwright browsers: `pnpm exec playwright install chromium`
3. Run tests: `pnpm test`
4. Write your first test following the examples in each directory
