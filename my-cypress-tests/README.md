# my-cypress-tests

Cypress test project with POM + Allure + CI/CD.

## Project Structure

```
./
├── cypress/
│   ├── e2e/
│   │   ├── locators/
│   │   ├── pages/
│   │   ├── features/
│   │   ├── step-definitions/
│   │   └── test/
│   │       ├── smoke/
│   │       └── regression/
│   ├── fixtures/
│   ├── support/
│   └── utils/
├── scripts/
└── cypress.config.ts
```

## Setup

```bash
npm install
```

## Run tests

| Task | Command |
|---|---|
| Open Cypress UI | `npm run cy:open` |
| Run smoke tests | `npm run cy:smoke:all` |
| Run regression tests | `npm run cy:regression:all` |
| Run BDD tests | `npm run cy:bdd:all` |
| Serve smoke report | `npm run serve:smoke` |
| Serve regression report | `npm run serve:regression` |

## Test Users

| Username | Password | Role |
|----------|----------|------|
| admin | 123456 | Admin |
| operator | 123456 | Operator |
| manager | 123456 | Manager |
