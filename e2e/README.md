# E2E Tests

This directory contains end-to-end tests using Playwright.

## Running Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run tests in UI mode
pnpm test:e2e:ui

# Run tests in debug mode
pnpm test:e2e:debug

# Generate tests using codegen
pnpm test:e2e:codegen
```

## Writing Tests

Follow the Page Object Model pattern for maintainable tests.

Example structure:

```
e2e/
├── example.spec.ts          # Test file
├── fixtures/                # Test data and fixtures
└── pages/                   # Page Object Models
    ├── home.page.ts
    └── dashboard.page.ts
```

## Guidelines

- Use only Chromium/Desktop Chrome browser (per project requirements)
- Implement Page Object Model for reusable page logic
- Use browser contexts for test isolation
- Leverage locators for resilient element selection
- Use expect assertions with specific matchers
- Implement visual comparisons with `expect(page).toHaveScreenshot()`
- Use trace viewer for debugging failures
