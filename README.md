# 🧪 QA Test Generator

A CLI tool for scaffolding production-grade **Cypress test projects** with Page Object Model, BDD/Cucumber, Allure reporting, and CI/CD — in seconds.

```bash
npx qa new my-qa-project
```

## Features

- **Scaffold a complete Cypress project** in one command — locators, pages, tests, scripts, config, CI/CD
- **Page Object Model (POM)** — clean separation of locators, pages, and tests
- **BDD / Cucumber** — optional Gherkin `.feature` files with step definitions
- **Allure Reporting** — optional HTML reports with historical trends
- **Sample frontend app** — a login page + dashboard with an HTTP API (Node.js), ready for your tests
- **CI/CD** — Azure Pipelines YAML included
- **TypeScript first** — full type declarations, path aliases (`@fixtures/`, `@support/`)

## Quick Start

```bash
# Create a new project
npx qa new my-e2e-project --typescript --bdd true --allure true

cd my-e2e-project

# Install dependencies
npm install

# Terminal 1: Start the sample frontend
npm run frontend

# Terminal 2: Run smoke tests
npm run cy:smoke:all
```

## Generated Structure

```
my-e2e-project/
├── frontend/                  # Sample app (login + dashboard)
│   ├── server.js              # HTTP API (port 3000)
│   ├── index.html             # Login page
│   └── dashboard.html         # Post-login dashboard
├── cypress/
│   ├── e2e/
│   │   ├── locators/          # data-cy selectors
│   │   ├── pages/             # Page Object classes
│   │   ├── features/          # .feature files (BDD)
│   │   ├── step-definitions/  # Step implementations
│   │   └── test/
│   │       ├── smoke/         # Fast sanity checks
│   │       └── regression/    # Full regression suite
│   ├── fixtures/
│   │   └── users.json         # Test user data
│   ├── support/
│   │   ├── commands.ts        # Custom Cypress commands
│   │   ├── index.d.ts         # Type declarations
│   │   └── types/             # Shared interfaces
│   └── utils/
│       └── dataGenerator.ts   # Test data helpers
├── scripts/                   # Allure, serve, orchestration
│   ├── allure/
│   ├── serve/
│   ├── run-all.js
│   └── start-frontend.js
├── cypress.config.ts
├── tsconfig.json
├── azure-pipelines.yml
└── package.json
```

## CLI Usage

```bash
qa new [options] <project-name>

Options:
  --typescript, --no-typescript   Use TypeScript (default: true)
  --bdd <bool>                    Include BDD/Cucumber (default: true)
  --allure <bool>                 Include Allure reporting (default: true)
  --baseUrl <url>                 Base URL for tests (default: http://localhost:3000)
  --skip-install                  Skip npm install after scaffolding
  -y, --yes                       Skip all prompts
```

## Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm run frontend` | Start the sample frontend |
| `npm run cy:smoke:all` | Clean → smoke tests → report → serve |
| `npm run cy:regression:all` | Clean → regression tests → report → serve |
| `npm run cy:bdd:all` | Clean → BDD tests → report → serve |
| `npm run test:all` | Run all suites sequentially |
| `npm run serve:smoke` | View smoke Allure report |

## Test Users

| Username | Password | Role |
|----------|----------|------|
| `admin` | `123456` | مدیر سیستم |
| `operator` | `123456` | اپراتور |
| `manager` | `123456` | مدیر پروژه |

## CI/CD

The generated project includes `azure-pipelines.yml` with:
- Node.js setup
- `npm ci` + Cypress binary install
- Frontend server startup
- Test execution with Chrome
- Allure report generation
- Artifact publishing (report, videos, screenshots)

## License

MIT
