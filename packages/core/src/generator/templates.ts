import type { ScaffoldOptions } from "./types";

export interface FileSpec {
  path: string;
  content: string;
}

const isTs = (o: ScaffoldOptions) => o.language === "typescript";
const ext = (o: ScaffoldOptions) => (isTs(o) ? "ts" : "js");

export function packageJson(o: ScaffoldOptions): FileSpec {
  const deps: Record<string, string> = {
    cypress: "^15.17.0",
  };

  const devDeps: Record<string, string> = {};

  if (isTs(o)) {
    devDeps.typescript = "^5.9.3";
    devDeps["@types/node"] = "^22.0.0";
  }

  if (o.bdd) {
    deps["@badeball/cypress-cucumber-preprocessor"] = "^23.2.1";
    if (isTs(o)) {
      devDeps["@bahmutov/cypress-esbuild-preprocessor"] = "^2.2.7";
      devDeps.esbuild = "^0.28.0";
    } else {
      devDeps["@cypress/browserify-preprocessor"] = "^3.0.2";
    }
  }

  if (o.allure) {
    deps["@shelex/cypress-allure-plugin"] = "^2.41.2";
    devDeps["allure-commandline"] = "^2.43.0";
  }

  devDeps["@cypress/xpath"] = "^2.0.3";
  devDeps["@testing-library/cypress"] = "^10.1.0";
  devDeps["cypress-terminal-report"] = "^7.3.3";
  devDeps["rimraf"] = "^6.1.3";
  devDeps["concurrently"] = "^10.0.3";

  const scripts: Record<string, string> = {
    "frontend:start": "node frontend/server.js",
    "frontend": "node frontend/server.js",
    "cy:open": "cypress open",
    "cy:run": "cypress run",
    "cy:smoke": "cypress run --env CYPRESS_UNIQUE_ID=smoke --spec \"cypress/e2e/test/smoke/**/*.cy.ts\"",
    "cy:smoke:clean": "rimraf allure-results/smoke allure-report/smoke",
    "cy:smoke:report": "node scripts/allure/generate.js allure-results/smoke --clean -o allure-report/smoke",
    "cy:smoke:copy-serve": "node scripts/serve/copy.js allure-report/smoke",
    "cy:smoke:all": "node scripts/run-all.js smoke",
    "cy:regression": "cypress run --env CYPRESS_UNIQUE_ID=regression --spec \"cypress/e2e/test/regression/**/*.cy.ts\"",
    "cy:regression:clean": "rimraf allure-results/regression allure-report/regression",
    "cy:regression:report": "node scripts/allure/generate.js allure-results/regression --clean -o allure-report/regression",
    "cy:regression:copy-serve": "node scripts/serve/copy.js allure-report/regression",
    "cy:regression:all": "node scripts/run-all.js regression",
    "allure:open:smoke": "node scripts/allure/open.js open allure-report/smoke",
    "allure:open:regression": "node scripts/allure/open.js open allure-report/regression",
    "serve:smoke": "node scripts/serve/index.js allure-report/smoke",
    "serve:regression": "node scripts/serve/index.js allure-report/regression",
    "test": "npm run cy:smoke:all",
    "test:all": "node scripts/run-all.js all",
  };

  if (o.bdd) {
    scripts["cy:bdd"] = "cypress run --env CYPRESS_UNIQUE_ID=bdd --spec \"cypress/e2e/features/**/*.feature\"";
    scripts["cy:bdd:clean"] = "rimraf allure-results/bdd allure-report/bdd";
    scripts["cy:bdd:report"] = "node scripts/allure/generate.js allure-results/bdd --clean -o allure-report/bdd";
    scripts["cy:bdd:copy-serve"] = "node scripts/serve/copy.js allure-report/bdd";
    scripts["cy:bdd:all"] = "node scripts/run-all.js bdd";
    scripts["allure:open:bdd"] = "node scripts/allure/open.js open allure-report/bdd";
    scripts["serve:bdd"] = "node scripts/serve/index.js allure-report/bdd";


  }

  const pkg: Record<string, any> = {
    name: o.projectName,
    version: "1.0.0",
    private: true,
    description: o.description || `${o.projectName} — Cypress test project with POM + Allure + CI/CD`,
    scripts,
  };

  if (Object.keys(deps).length > 0) pkg.dependencies = deps;
  if (Object.keys(devDeps).length > 0) pkg.devDependencies = devDeps;

  if (o.bdd && isTs(o)) {
    pkg["cypress-cucumber-preprocessor"] = {
      stepDefinitions: "cypress/e2e/step-definitions/**/*.ts",
    };
  }

  return { path: "package.json", content: JSON.stringify(pkg, null, 2) + "\n" };
}

export function tsconfig(_o: ScaffoldOptions): FileSpec {
  const content = `{
  "compilerOptions": {
    "paths": {
      "cypress/*": ["./cypress/*"],
      "@fixtures/*": ["./cypress/fixtures/*"],
      "@support/*": ["./cypress/support/*"]
    },
    "module": "nodenext",
    "target": "esnext",
    "types": ["cypress", "node"],
    "lib": ["dom", "esnext"],
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "strict": true,
    "jsx": "react-jsx",
    "verbatimModuleSyntax": false,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  },
  "include": [
    "cypress/support/**/*.d.ts",
    "cypress/support/**/*.ts",
    "cypress/**/*.ts",
    "./**/*.ts",
  ],
  "exclude": ["node_modules"]
}
`;
  return { path: "tsconfig.json", content };
}

export function cypressConfig(o: ScaffoldOptions): FileSpec {
  const e = ext(o);
  const allureImport = o.allure
    ? `import allureWriter from "@shelex/cypress-allure-plugin/writer";`
    : "";
  const allureSetup = o.allure
    ? `\n      config.env.allure = true;\n      require("@shelex/cypress-allure-plugin/writer")(on, config);`
    : "";
  const bddImports = o.bdd && isTs(o)
    ? `\nimport createBundler from "@bahmutov/cypress-esbuild-preprocessor";\nimport { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";\nimport createEsbuildPlugin from "@badeball/cypress-cucumber-preprocessor/esbuild";`
    : o.bdd
    ? `\nconst browserify = require("@cypress/browserify-preprocessor");`
    : "";
  const bddSetup = o.bdd && isTs(o)
    ? `\n      await addCucumberPreprocessorPlugin(on, config);\n      on("file:preprocessor", createBundler({ plugins: [createEsbuildPlugin(config)] }));`
    : o.bdd
    ? `\n      await addCucumberPreprocessorPlugin(on, config);\n      on("file:preprocessor", browserify.default({ ...browserify.defaultOptions, plugin: [], transformers: [] }));`
    : "";
  const asyncKwd = o.bdd ? "async " : "";
  const specPattern = o.bdd
    ? `["cypress/e2e/**/*.cy.ts", "cypress/e2e/**/*.feature"]`
    : `"cypress/e2e/**/*.cy.ts"`;

  const content = `import { defineConfig } from "cypress";${bddImports}
${allureImport ? `\n${allureImport}` : ""}

export default defineConfig({
  viewportWidth: 1920,
  viewportHeight: 1080,
  defaultCommandTimeout: 10000,
  watchForFileChanges: false,
  experimentalInteractiveRunEvents: true,
  video: true,
  videoCompression: 32,
  videosFolder: "cypress/videos",
  screenshotOnRunFailure: true,
  screenshotsFolder: "cypress/screenshots",
  e2e: {
    baseUrl: "${o.baseUrl}",
    specPattern: ${specPattern},
    supportFile: "cypress/support/e2e.${e}",
    retries: {
      runMode: 0,
      openMode: 0,
    },
    ${asyncKwd}setupNodeEvents(on, config) {${bddSetup}${allureSetup}
      on("task", {
        deleteFileTask(fileName: string): Promise<null> {
          return new Promise((resolve, reject) => {
            const fs = require("fs");
            fs.rm(fileName, { maxRetries: 10, recursive: true }, (err: any) => {
              if (err) return reject(err);
              resolve(null);
            });
          });
        },
      });
      return config;
    },
  },
});
`;
  return { path: `cypress.config.${e}`, content };
}

export function cypressEnvJson(_o: ScaffoldOptions): FileSpec {
  const content = `{
  "DB_USER": "sa",
  "DB_PASSWORD": "",
  "DB_HOST": "localhost",
  "DB_NAME": "testdb"
}
`;
  return { path: "cypress.env.json", content };
}

export function supportE2e(o: ScaffoldOptions): FileSpec {
  const e = ext(o);
  const content = isTs(o)
    ? `import "./commands";
import '@cypress/xpath';
import '@shelex/cypress-allure-plugin';
import "cypress-plugin-steps";
import "@testing-library/cypress/add-commands";
`
    : `require("./commands");
require("@cypress/xpath");
require("@shelex/cypress-allure-plugin");
require("cypress-plugin-steps");
require("@testing-library/cypress/add-commands");
`;
  return { path: `cypress/support/e2e.${e}`, content };
}

export function supportCommands(o: ScaffoldOptions): FileSpec {
  const e = ext(o);
  if (isTs(o)) {
    const content = `/// <reference types="cypress" />

Cypress.Commands.add("uploadFile", (selector: string, filePath: string) => {
  cy.get(selector).selectFile(filePath, { force: true });
});

Cypress.Commands.add("getByCy", (value: string) => {
  return cy.get(\`[data-cy="\${value}"]\`);
});

Cypress.Commands.add("clickIfVisible", (selector: string) => {
  cy.get("body").then(($body) => {
    const el = $body.find(selector);
    if (el.length && el.is(":visible")) {
      cy.wrap(el).click();
    }
  });
});

Cypress.Commands.add("loginByApi", (username: string, password: string) => {
  cy.request({
    method: "POST",
    url: "/api/login",
    body: { username, password },
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.success).to.be.true;
    cy.setCookie("token", response.body.token);
  });
});
`;
    return { path: `cypress/support/commands.${e}`, content };
  } else {
    const content = `Cypress.Commands.add("uploadFile", (selector, filePath) => {
  cy.get(selector).selectFile(filePath, { force: true });
});

Cypress.Commands.add("getByCy", (value) => {
  return cy.get(\`[data-cy="\${value}"]\`);
});

Cypress.Commands.add("clickIfVisible", (selector) => {
  cy.get("body").then(($body) => {
    const el = $body.find(selector);
    if (el.length && el.is(":visible")) {
      cy.wrap(el).click();
    }
  });
});

Cypress.Commands.add("loginByApi", (username, password) => {
  cy.request({
    method: "POST",
    url: "/api/login",
    body: { username, password },
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.success).to.be.true;
    cy.setCookie("token", response.body.token);
  });
});
`;
    return { path: `cypress/support/commands.${e}`, content };
  }
}

export function supportIndexDts(_o: ScaffoldOptions): FileSpec {
  const content = `/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      uploadFile(selector: string, filePath: string): Chainable<void>;
      getByCy(value: string): Chainable<JQuery<HTMLElement>>;
      clickIfVisible(selector: string): Chainable<void>;
      loginByApi(username: string, password: string): Chainable<void>;
    }
  }
}

export {};
`;
  return { path: "cypress/support/index.d.ts", content };
}

export function supportTypesTypesDts(_o: ScaffoldOptions): FileSpec {
  const content = `/// <reference types="@shelex/cypress-allure-plugin" />
`;
  return { path: "cypress/support/types/types.d.ts", content };
}

export function supportTypesUsersJsonDts(_o: ScaffoldOptions): FileSpec {
  const content = `export interface User {
  username: string;
  password: string;
  fullName: string;
  role: "admin" | "operator" | "manager";
}

export interface UsersData {
  [key: string]: User;
}
`;
  return { path: "cypress/support/types/usersJson.d.ts", content };
}

export function locators(o: ScaffoldOptions): FileSpec {
  const e = ext(o);
  if (isTs(o)) {
    const content = `export const LOCATORS = {
  LOGIN_PAGE: {
    Username_Input: "[formcontrolname='username']",
    Password_Input: "[formcontrolname='password']",
    Login_Button: "login",
  },
  Sidebar: {
    Siam_Service: "checkRunService",
    Announcements: "notifications",
    Change_Theme: "toggleTheme",
    Login_As: "showImpersonateDlg",
    Logout: "stopImpersonate",
    Yes_Button: "onOkClick",
    No_Button: "onNoClick",
  },
} as const;

export type Locators = typeof LOCATORS;
`;
    return { path: `cypress/e2e/locators/locators.${e}`, content };
  } else {
    const content = `export const LOCATORS = {
  LOGIN_PAGE: {
    Username_Input: "[formcontrolname='username']",
    Password_Input: "[formcontrolname='password']",
    Login_Button: "login",
  },
  Sidebar: {
    Siam_Service: "checkRunService",
    Announcements: "notifications",
    Change_Theme: "toggleTheme",
    Login_As: "showImpersonateDlg",
    Logout: "stopImpersonate",
    Yes_Button: "onOkClick",
    No_Button: "onNoClick",
  },
};

module.exports = { LOCATORS };
`;
    return { path: `cypress/e2e/locators/locators.${e}`, content };
  }
}

export function loginPage(o: ScaffoldOptions): FileSpec {
  const e = ext(o);
  if (isTs(o)) {
    const content = `import { LOCATORS } from "../locators/locators";

export class LoginPage {
  openLoginPage(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.visit("/");
  }

  enterUserNameInput(username: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(LOCATORS.LOGIN_PAGE.Username_Input).type(username);
  }

  enterPasswordInput(password: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get(LOCATORS.LOGIN_PAGE.Password_Input).type(password);
  }

  clickLoginButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.getByCy(LOCATORS.LOGIN_PAGE.Login_Button).click();
  }

  login(username: string, password: string): this {
    this.enterUserNameInput(username);
    this.enterPasswordInput(password);
    this.clickLoginButton();
    return this;
  }
}

export const loginPage = new LoginPage();
`;
    return { path: `cypress/e2e/pages/loginPage.${e}`, content };
  } else {
    const content = `const { LOCATORS } = require("../locators/locators");

class LoginPage {
  openLoginPage() {
    return cy.visit("/");
  }

  enterUserNameInput(username) {
    return cy.get(LOCATORS.LOGIN_PAGE.Username_Input).type(username);
  }

  enterPasswordInput(password) {
    return cy.get(LOCATORS.LOGIN_PAGE.Password_Input).type(password);
  }

  clickLoginButton() {
    return cy.getByCy(LOCATORS.LOGIN_PAGE.Login_Button).click();
  }

  login(username, password) {
    this.enterUserNameInput(username);
    this.enterPasswordInput(password);
    this.clickLoginButton();
    return this;
  }
}

const loginPage = new LoginPage();
module.exports = { LoginPage, loginPage };
`;
    return { path: `cypress/e2e/pages/loginPage.${e}`, content };
  }
}

export function sidebarPage(o: ScaffoldOptions): FileSpec {
  const e = ext(o);
  if (isTs(o)) {
    const content = `import { LOCATORS } from "../locators/locators";

export class Sidebar {
  clickDashboard(): Cypress.Chainable<Element> {
    return cy.getDynamicMenu("Dashboard").click();
  }

  siamService(): Cypress.Chainable<Element> {
    return cy.getByCy(LOCATORS.Sidebar.Siam_Service).click();
  }

  announcements(): Cypress.Chainable<Element> {
    return cy.getByCy(LOCATORS.Sidebar.Announcements).click();
  }

  changeTheme(): Cypress.Chainable<Element> {
    return cy.getByCy(LOCATORS.Sidebar.Change_Theme).click();
  }

  loginAs(): Cypress.Chainable<Element> {
    return cy.getByCy(LOCATORS.Sidebar.Login_As).click();
  }

  logoutAndYesButton(): Cypress.Chainable<Element> {
    cy.getByCy(LOCATORS.Sidebar.Logout).click();
    return cy.getByCy(LOCATORS.Sidebar.Yes_Button).click();
  }
}

export const sidebar = new Sidebar();
`;
    return { path: `cypress/e2e/pages/sidebar.${e}`, content };
  } else {
    const content = `const { LOCATORS } = require("../locators/locators");

class Sidebar {
  clickDashboard() {
    return cy.getDynamicMenu("Dashboard").click();
  }

  siamService() {
    return cy.getByCy(LOCATORS.Sidebar.Siam_Service).click();
  }

  announcements() {
    return cy.getByCy(LOCATORS.Sidebar.Announcements).click();
  }

  changeTheme() {
    return cy.getByCy(LOCATORS.Sidebar.Change_Theme).click();
  }

  loginAs() {
    return cy.getByCy(LOCATORS.Sidebar.Login_As).click();
  }

  logoutAndYesButton() {
    cy.getByCy(LOCATORS.Sidebar.Logout).click();
    return cy.getByCy(LOCATORS.Sidebar.Yes_Button).click();
  }
}

const sidebar = new Sidebar();
module.exports = { Sidebar, sidebar };
`;
    return { path: `cypress/e2e/pages/sidebar.${e}`, content };
  }
}

export function smokeTest(o: ScaffoldOptions): FileSpec {
  const e = ext(o);
  if (isTs(o)) {
    const content = `import { loginPage } from "../../pages/loginPage";

describe("Login Page — Smoke Tests", { tags: ["smoke"] }, () => {
  beforeEach(() => {
    loginPage.openLoginPage();
  });

  it("should display the login form", () => {
    cy.getByCy("login-form").should("be.visible");
  });

  it("should show an error with empty fields", () => {
    cy.getByCy("login-button").click();
    cy.getByCy("login-error").should("be.visible");
  });

  it("should login with valid credentials", () => {
    loginPage.login("admin", "123456");
    cy.url().should("include", "/dashboard");
  });

  it("should show error with invalid credentials", () => {
    loginPage.login("wrong", "wrong");
    cy.getByCy("login-error").should("be.visible");
  });
});
`;
    return { path: `cypress/e2e/test/smoke/loginSmoke.cy.${e}`, content };
  } else {
    const content = `const { loginPage } = require("../../pages/loginPage");

describe("Login Page — Smoke Tests", { tags: ["smoke"] }, () => {
  beforeEach(() => {
    loginPage.openLoginPage();
  });

  it("should display the login form", () => {
    cy.getByCy("login-form").should("be.visible");
  });

  it("should show an error with empty fields", () => {
    cy.getByCy("login-button").click();
    cy.getByCy("login-error").should("be.visible");
  });

  it("should login with valid credentials", () => {
    loginPage.login("admin", "123456");
    cy.url().should("include", "/dashboard");
  });

  it("should show error with invalid credentials", () => {
    loginPage.login("wrong", "wrong");
    cy.getByCy("login-error").should("be.visible");
  });
});
`;
    return { path: `cypress/e2e/test/smoke/loginSmoke.cy.${e}`, content };
  }
}

export function regressionTest(o: ScaffoldOptions): FileSpec {
  const e = ext(o);
  if (isTs(o)) {
    const content = `import { loginPage } from "../../pages/loginPage";

describe("Login Page — Regression Tests", { tags: ["regression"] }, () => {
  describe("Login with different users", () => {
    beforeEach(() => {
      loginPage.openLoginPage();
    });

    const users = [
      { username: "admin", password: "123456", role: "مدیر سیستم" },
      { username: "operator", password: "123456", role: "اپراتور" },
      { username: "manager", password: "123456", role: "مدیر پروژه" },
    ];

    users.forEach(({ username, password, role }) => {
      it(\`user \${username} with role \${role} should login\`, () => {
        loginPage.login(username, password);
        cy.url().should("include", "/dashboard");
        cy.getByCy("user-fullname").should("not.be.empty");
      });
    });
  });

  describe("Form validation", () => {
    beforeEach(() => {
      loginPage.openLoginPage();
    });

    it("should show validation error with short password", () => {
      loginPage.enterUserNameInput("admin");
      loginPage.enterPasswordInput("12");
      cy.getByCy("login-button").click();
      cy.getByCy("login-error").should("be.visible");
    });

    it("should show error with empty username", () => {
      loginPage.enterPasswordInput("123456");
      cy.getByCy("login-button").click();
      cy.getByCy("login-error").should("be.visible");
    });
  });

  describe("Direct access (without login)", () => {
    it("should redirect to login page when accessing dashboard directly", () => {
      cy.visit("/dashboard.html");
      cy.url().should("eq", Cypress.config().baseUrl + "/");
    });
  });

  describe("Logout", () => {
    it("should return to login page after logout", () => {
      loginPage.openLoginPage().login("admin", "123456");
      cy.url().should("include", "/dashboard.html");
      cy.getByCy("logout-button").click();
      cy.url().should("eq", Cypress.config().baseUrl + "/");
      cy.getByCy("login-form").should("be.visible");
    });
  });
});
`;
    return { path: `cypress/e2e/test/regression/loginRegression.cy.${e}`, content };
  } else {
    const content = `const { loginPage } = require("../../pages/loginPage");

describe("Login Page — Regression Tests", { tags: ["regression"] }, () => {
  describe("Login with different users", () => {
    beforeEach(() => {
      loginPage.openLoginPage();
    });

    const users = [
      { username: "admin", password: "123456", role: "مدیر سیستم" },
      { username: "operator", password: "123456", role: "اپراتور" },
      { username: "manager", password: "123456", role: "مدیر پروژه" },
    ];

    users.forEach(({ username, password, role }) => {
      it(\`user \${username} with role \${role} should login\`, () => {
        loginPage.login(username, password);
        cy.url().should("include", "/dashboard");
        cy.getByCy("user-fullname").should("not.be.empty");
      });
    });
  });

  describe("Form validation", () => {
    beforeEach(() => {
      loginPage.openLoginPage();
    });

    it("should show validation error with short password", () => {
      loginPage.enterUserNameInput("admin");
      loginPage.enterPasswordInput("12");
      cy.getByCy("login-button").click();
      cy.getByCy("login-error").should("be.visible");
    });

    it("should show error with empty username", () => {
      loginPage.enterPasswordInput("123456");
      cy.getByCy("login-button").click();
      cy.getByCy("login-error").should("be.visible");
    });
  });

  describe("Direct access (without login)", () => {
    it("should redirect to login page when accessing dashboard directly", () => {
      cy.visit("/dashboard.html");
      cy.url().should("eq", Cypress.config().baseUrl + "/");
    });
  });

  describe("Logout", () => {
    it("should return to login page after logout", () => {
      loginPage.openLoginPage().login("admin", "123456");
      cy.url().should("include", "/dashboard.html");
      cy.getByCy("logout-button").click();
      cy.url().should("eq", Cypress.config().baseUrl + "/");
      cy.getByCy("login-form").should("be.visible");
    });
  });
});
`;
    return { path: `cypress/e2e/test/regression/loginRegression.cy.${e}`, content };
  }
}

export function sampleFeature(_o: ScaffoldOptions): FileSpec {
  const content = `@smoke
Feature: Login
  As a registered user
  I want to log in
  So that I can access my account

  Scenario Outline: Successful login with different users
    Given I am on the login page
    When I enter username "<username>" and password "<password>"
    And I submit the login form
    Then I should be redirected to the dashboard
    And my full name "<fullName>" should be displayed

    Examples:
      | username | password | fullName    |
      | admin    | 123456   | Admin User  |
      | operator | 123456   | Operator    |

  @regression
  Scenario: Login fails with invalid credentials
    Given I am on the login page
    When I enter invalid credentials
    And I submit the login form
    Then I should see an error message
`;
  return { path: "cypress/e2e/features/login.feature", content };
}

export function sampleStepsTs(): FileSpec {
  const content = `import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor";
import { loginPage } from "../../pages/loginPage";

Given("I am on the login page", () => {
  loginPage.openLoginPage();
});

When("I enter username {string} and password {string}", (username: string, password: string) => {
  loginPage.enterUserNameInput(username);
  loginPage.enterPasswordInput(password);
});

When("I enter invalid credentials", () => {
  loginPage.enterUserNameInput("invalid");
  loginPage.enterPasswordInput("invalid");
});

When("I submit the login form", () => {
  loginPage.clickLoginButton();
});

Then("I should be redirected to the dashboard", () => {
  cy.url().should("include", "/dashboard");
});

Then("my full name {string} should be displayed", (fullName: string) => {
  cy.getByCy("user-fullname").should("contain.text", fullName);
});

Then("I should see an error message", () => {
  cy.getByCy("login-error").should("be.visible");
});
`;
  return { path: "cypress/e2e/step-definitions/loginSteps.ts", content };
}

export function sampleStepsJs(): FileSpec {
  const content = `const { Given, When, Then } = require("@badeball/cypress-cucumber-preprocessor");
const { loginPage } = require("../../pages/loginPage");

Given("I am on the login page", () => {
  loginPage.openLoginPage();
});

When("I enter username {string} and password {string}", (username, password) => {
  loginPage.enterUserNameInput(username);
  loginPage.enterPasswordInput(password);
});

When("I enter invalid credentials", () => {
  loginPage.enterUserNameInput("invalid");
  loginPage.enterPasswordInput("invalid");
});

When("I submit the login form", () => {
  loginPage.clickLoginButton();
});

Then("I should be redirected to the dashboard", () => {
  cy.url().should("include", "/dashboard");
});

Then("my full name {string} should be displayed", (fullName) => {
  cy.getByCy("user-fullname").should("contain.text", fullName);
});

Then("I should see an error message", () => {
  cy.getByCy("login-error").should("be.visible");
});
`;
  return { path: "cypress/e2e/step-definitions/loginSteps.js", content };
}

export function fixturesUsers(_o: ScaffoldOptions): FileSpec {
  const content = `{
  "admin": {
    "username": "admin",
    "password": "123456",
    "fullName": "Admin User",
    "role": "admin"
  },
  "operator": {
    "username": "operator",
    "password": "123456",
    "fullName": "Operator",
    "role": "operator"
  },
  "manager": {
    "username": "manager",
    "password": "123456",
    "fullName": "Manager",
    "role": "manager"
  }
}
`;
  return { path: "cypress/fixtures/users.json", content };
}

export function utilsDataGenerator(_o: ScaffoldOptions): FileSpec {
  const content = isTs(_o)
    ? `export function randomString(length = 8): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

export function randomEmail(domain = "test.com"): string {
  return \`user_\${randomString()}@\${domain}\`;
}

export function nationalCodeGenerator(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const sum = digits.reduce((acc, d, i) => acc + d * (10 - i), 0);
  const remainder = sum % 11;
  const control = remainder < 2 ? 0 : 11 - remainder;
  return [...digits, control].join("");
}

export function phoneNumberGenerator(): string {
  const prefix = "0912";
  const rest = Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join("");
  return \`\${prefix}\${rest}\`;
}
`
    : `function randomString(length = 8) {
  return Math.random().toString(36).slice(2, 2 + length);
}

function randomEmail(domain = "test.com") {
  return \`user_\${randomString()}@\${domain}\`;
}

function nationalCodeGenerator() {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const sum = digits.reduce((acc, d, i) => acc + d * (10 - i), 0);
  const remainder = sum % 11;
  const control = remainder < 2 ? 0 : 11 - remainder;
  return [...digits, control].join("");
}

function phoneNumberGenerator() {
  const prefix = "0912";
  const rest = Array.from({ length: 7 }, () => Math.floor(Math.random() * 10)).join("");
  return \`\${prefix}\${rest}\`;
}

module.exports = { randomString, randomEmail, nationalCodeGenerator, phoneNumberGenerator };
`;
  return { path: `cypress/utils/dataGenerator.${ext(_o)}`, content };
}

export function scriptsRunAll(_o: ScaffoldOptions): FileSpec {
  const content = `#!/usr/bin/env node
const { execSync } = require("child_process");
const path = require("path");

const SUITES = {
  smoke: {
    clean: "npm run cy:smoke:clean",
    run: "npm run cy:smoke",
    report: "npm run cy:smoke:report",
    copyServe: "npm run cy:smoke:copy-serve",
  },
  regression: {
    clean: "npm run cy:regression:clean",
    run: "npm run cy:regression",
    report: "npm run cy:regression:report",
    copyServe: "npm run cy:regression:copy-serve",
  },
  bdd: {
    clean: "npm run cy:bdd:clean",
    run: "npm run cy:bdd",
    report: "npm run cy:bdd:report",
    copyServe: "npm run cy:bdd:copy-serve",
  },
};

function run(cmd) {
  console.log("  > " + cmd);
  try {
    execSync(cmd, { stdio: "inherit", shell: true, cwd: path.resolve(__dirname, "..") });
    return { ok: true, code: 0 };
  } catch (e) {
    return { ok: false, code: e.status ?? 1 };
  }
}

const suite = process.argv[2];
if (!suite) {
  console.log("Usage: node scripts/run-all.js <smoke | regression | bdd | all>");
  process.exit(1);
}

if (suite === "all") {
  for (const s of ["smoke", "regression", "bdd"]) {
    const c = SUITES[s];
    run(c.clean);
    run(c.run);
    run(c.report);
    if (c.copyServe) run(c.copyServe);
  }
  process.exit(0);
}

const config = SUITES[suite];
if (!config) {
  console.log("Unknown suite: " + suite);
  process.exit(1);
}

run(config.clean);
const result = run(config.run);
run(config.report);
if (config.copyServe) run(config.copyServe);
process.exit(result.code);
`;
  return { path: "scripts/run-all.js", content };
}

export function scriptsAllureGenerate(_o: ScaffoldOptions): FileSpec {
  const content = `const { execSync } = require("child_process");
const path = require("path");
const os = require("os");

const SEP = os.platform() === "win32" ? ";" : ":";
const EXE_SUFFIX = os.platform() === "win32" ? ".exe" : "";

function findJava() {
  const { JAVA_HOME } = process.env;
  if (JAVA_HOME) return path.join(JAVA_HOME, "bin", "java" + EXE_SUFFIX);
  return "java" + EXE_SUFFIX;
}

const allureDist = path.resolve(__dirname, "..", "node_modules", "allure-commandline", "dist");
const classpath = path.join(allureDist, "lib", "*") + SEP + path.join(allureDist, "lib", "config");
const args = process.argv.slice(2).join(" ");
const javaExe = findJava();

const cmd = '"' + javaExe + '" -classpath "' + classpath + '" io.qameta.allure.CommandLine generate ' + args;
execSync(cmd, { stdio: "inherit", shell: true });
`;
  return { path: "scripts/allure/generate.js", content };
}

export function scriptsAllureOpen(_o: ScaffoldOptions): FileSpec {
  const content = `const { execSync } = require("child_process");
const path = require("path");
const os = require("os");

const SEP = os.platform() === "win32" ? ";" : ":";
const EXE_SUFFIX = os.platform() === "win32" ? ".exe" : "";

function findJava() {
  const { JAVA_HOME } = process.env;
  if (JAVA_HOME) return path.join(JAVA_HOME, "bin", "java" + EXE_SUFFIX);
  return "java" + EXE_SUFFIX;
}

const allureDist = path.resolve(__dirname, "..", "node_modules", "allure-commandline", "dist");
const classpath = path.join(allureDist, "lib", "*") + SEP + path.join(allureDist, "lib", "config");
const args = process.argv.slice(2).join(" ");
const javaExe = findJava();

const cmd = '"' + javaExe + '" -classpath "' + classpath + '" io.qameta.allure.CommandLine ' + args;
execSync(cmd, { stdio: "inherit", shell: true });
`;
  return { path: "scripts/allure/open.js", content };
}

export function scriptsServeIndex(_o: ScaffoldOptions): FileSpec {
  const content = `const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;
const REPORT_PATH = path.resolve(process.argv[2] || ".");

const MIME_MAP = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/") reqPath = "/index.html";

  const safePath = path.normalize(reqPath).replace(/^(\\.\\.(\\/|\\\\|$))+/, "");
  const filePath = path.join(REPORT_PATH, safePath);

  if (!filePath.startsWith(REPORT_PATH)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (!fs.existsSync(filePath)) {
    const fallback = path.join(REPORT_PATH, "index.html");
    if (fs.existsSync(fallback)) return serveFile(fallback, res);
    res.writeHead(404);
    return res.end("Report not found. Run 'npm run cy:smoke:report' first.");
  }

  serveFile(filePath, res);
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
}

server.listen(PORT, () => {
  console.log("Serving Allure report at http://localhost:" + PORT + "/");
  console.log("Report path: " + REPORT_PATH);
});
`;
  return { path: "scripts/serve/index.js", content };
}

export function scriptsServeCopy(_o: ScaffoldOptions): FileSpec {
  const content = `#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const reportDir = process.argv[2];
if (!reportDir) {
  console.error("Usage: node scripts/serve/copy.js <report-dir>");
  process.exit(1);
}

const dst = path.resolve(reportDir);
if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
`;
  return { path: "scripts/serve/copy.js", content };
}

export function azurePipelines(_o: ScaffoldOptions): FileSpec {
  return {
    path: "azure-pipelines.yml",
    content: `trigger:
  branches:
    include:
      - master
      - develop
      - feature/*

pool:
  name: QaTestAgent

variables:
  - name: NODE_VERSION
    value: '22.x'

steps:
  - checkout: self

  - task: NodeTool@0
    inputs:
      versionSpec: '$(NODE_VERSION)'
    displayName: 'Install Node.js $(NODE_VERSION)'

  - script: npm ci
    displayName: 'Install npm packages'

  - script: npx cypress install
    displayName: 'Install Cypress binary'

  - script: |
      npx cypress run --browser chrome --headless
    displayName: 'Run Cypress tests'
    continueOnError: true

  - script: |
      npx allure generate allure-results --clean -o allure-report
    displayName: 'Generate Allure HTML report'
    condition: always()

  - task: PublishBuildArtifacts@1
    inputs:
      PathtoPublish: 'allure-report'
      ArtifactName: 'AllureReport'
      publishLocation: 'Container'
    displayName: 'Publish Allure report'
    condition: always()

  - task: PublishBuildArtifacts@1
    inputs:
      PathtoPublish: 'cypress/videos'
      ArtifactName: 'CypressVideos'
      publishLocation: 'Container'
    displayName: 'Publish test videos'
    condition: always()

  - task: PublishBuildArtifacts@1
    inputs:
      PathtoPublish: 'cypress/screenshots'
      ArtifactName: 'CypressScreenshots'
      publishLocation: 'Container'
    displayName: 'Publish screenshots'
    condition: failed()
`,
  };
}

export function gitignore(_o: ScaffoldOptions): FileSpec {
  return {
    path: ".gitignore",
    content: `node_modules/
npm-debug.log*

.env
.env.local
cypress.env.json

cypress/videos/
cypress/screenshots/
videos/
screenshots/

allure-results/
allure-report/

.idea/
.vscode/
*.swp
*.swo

.DS_Store
Thumbs.db

*.log

.agents/
skills-lock.json

.tmp/
dist/
build/
`,
  };
}

export function readme(o: ScaffoldOptions): FileSpec {
  const lines = [
    `# ${o.projectName}`,
    "",
    o.description || "Cypress test project with POM + Allure + CI/CD.",
    "",
    "## Project Structure",
    "",
    "```",
    "./",
    "├── cypress/",
    "│   ├── e2e/",
    "│   │   ├── locators/",
    "│   │   ├── pages/",
    "│   │   ├── features/",
    "│   │   ├── step-definitions/",
    "│   │   └── test/",
    "│   │       ├── smoke/",
    "│   │       └── regression/",
    "│   ├── fixtures/",
    "│   ├── support/",
    "│   └── utils/",
    "├── scripts/",
    "└── cypress.config.ts",
    "```",
    "",
    "## Setup",
    "",
    "```bash",
    "npm install",
    "```",
    "",
    "## Run tests",
    "",
    "| Task | Command |",
    "|---|---|",
    "| Open Cypress UI | \`npm run cy:open\` |",
    "| Run smoke tests | \`npm run cy:smoke:all\` |",
    "| Run regression tests | \`npm run cy:regression:all\` |",
  ];

  if (o.bdd) {
    lines.push("| Run BDD tests | `npm run cy:bdd:all` |");
  }

  lines.push(
    "| Serve smoke report | `npm run serve:smoke` |",
    "| Serve regression report | `npm run serve:regression` |",
    "",
    "## Test Users",
    "",
    "| Username | Password | Role |",
    "|----------|----------|------|",
    "| admin | 123456 | Admin |",
    "| operator | 123456 | Operator |",
    "| manager | 123456 | Manager |",
  );

  return { path: "README.md", content: lines.join("\n") + "\n" };
}
