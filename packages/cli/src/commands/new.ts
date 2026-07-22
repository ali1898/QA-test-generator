/**
 * `qa new` — scaffold a new Cypress project interactively or via flags.
 *
 * Walks the user through: project name, location, language, BDD, Allure,
 * base URL, and dependency install. Then delegates to core.scaffoldProject.
 *
 * When --url is provided, the project is scaffolded for a specific page
 * (no frontend sample app, uses Playwright + AI to generate page-specific tests).
 */
import { input, select, confirm } from "@inquirer/prompts";
import { scaffoldProject, type ProjectLanguage } from "@testsaz/core";
import { resolve } from "node:path";
import { ui, withSpinner, chalk } from "../ui";

export interface NewOptions {
  name?: string;
  path?: string;
  language?: ProjectLanguage;
  bdd?: boolean;
  allure?: boolean;
  baseUrl?: string;
  description?: string;
  install?: boolean;
  llmWiki?: boolean;
  scenarios?: boolean;
  /** Base name for generated files (locators, page, tests). */
  fileName?: string;
  /** Skip all prompts using defaults + flags (for scripting). */
  yes?: boolean;
  /** Git initialization (false to skip). */
  git?: boolean;
  /** Target URL to analyze and generate tests for (skips frontend). */
  url?: string;
  /** Login page URL (for authenticated pages). */
  loginUrl?: string;
  /** Username for login. */
  username?: string;
  /** Password for login. */
  password?: string;
  /** Username field selector. */
  usernameSelector?: string;
  /** Password field selector. */
  passwordSelector?: string;
  /** Login button selector. */
  loginButtonSelector?: string;
  /** Wait for selector after login. */
  waitForSelector?: string;
}

export async function newCommand(opts: NewOptions): Promise<void> {
  ui.header("Create a Cypress project");

  // ── URL mode prompt ──
  let url = opts.url;
  if (!url && !opts.yes) {
    url = await input({
      message: "Target URL (leave empty for sample app mode):",
      default: "",
    });
    if (!url) url = undefined;
  }

  // ── Project name (required with URL, optional otherwise) ──
  let projectName = opts.name;
  if (url && !projectName && !opts.yes) {
    projectName = await input({ message: "Project name (required with URL):" });
    if (!projectName) {
      ui.error("Project name is required when a URL is provided.");
      process.exit(1);
    }
  }
  if (!projectName) {
    projectName = opts.yes ? "my-cypress-tests" : await input({ message: "Project name:", default: "my-cypress-tests" });
  }

  const fileName =
    opts.fileName ??
    (opts.yes ? projectName : await input({ message: "File name for test, page, locators:", default: projectName }));

  const targetDir =
    opts.path ??
    (opts.yes
      ? resolve(projectName)
      : resolve(projectName));

  const language: ProjectLanguage =
    opts.language ??
    (opts.yes
      ? "typescript"
      : await select<ProjectLanguage>({
          message: "Language:",
          choices: [
            { name: "TypeScript (recommended)", value: "typescript" },
            { name: "JavaScript", value: "javascript" },
          ],
        }));

  const bdd =
    opts.bdd ??
    (opts.yes ? true : await confirm({ message: "Enable Cucumber BDD?", default: true }));

  const allure =
    opts.allure ??
    (opts.yes ? true : await confirm({ message: "Enable Allure reporter?", default: true }));

  const baseUrl =
    opts.baseUrl ??
    (opts.yes ? "http://localhost:3000" : await input({
      message: "Base URL for tests:",
      default: "http://localhost:3000",
    }));

  const description = opts.description ?? "";
  const installDeps =
    opts.install ?? (opts.yes ? true : await confirm({ message: "Run npm install now?", default: true }));
  const initGit =
    opts.git !== undefined ? opts.git :
    (opts.yes ? true : await confirm({ message: "Initialize git repository?", default: true }));
  const llmWiki =
    opts.llmWiki ?? (opts.yes ? false : await confirm({ message: "Include LLM-Wiki from reference project?", default: false }));
  const scenarios =
    opts.scenarios ?? (opts.yes ? false : await confirm({ message: "Include sample scenario files in scenarios/?", default: false }));

  // ── Auth prompts for URL mode ──
  let authConfig: {
    loginUrl?: string;
    username?: string;
    password?: string;
    usernameSelector?: string;
    passwordSelector?: string;
    loginButtonSelector?: string;
    waitForSelector?: string;
  } | undefined;
  if (url && !opts.yes && !opts.loginUrl) {
    const needsAuth = await confirm({ message: "Does the target page require authentication?", default: false });
    if (needsAuth) {
      const loginUrl = await input({ message: "Login page URL:" });
      const username = await input({ message: "Username:" });
      const password = await input({ message: "Password:" });
      const usernameSelector = await input({ message: "Username field selector (optional, press Enter to skip):" }) || undefined;
      const passwordSelector = await input({ message: "Password field selector (optional, press Enter to skip):" }) || undefined;
      const loginButtonSelector = await input({ message: "Login button selector (optional, press Enter to skip):" }) || undefined;
      const waitForSelector = await input({ message: "Wait for selector after login (optional, press Enter to skip):" }) || undefined;
      authConfig = { loginUrl, username, password, usernameSelector, passwordSelector, loginButtonSelector, waitForSelector };
    }
  } else if (url && opts.loginUrl) {
    authConfig = {
      loginUrl: opts.loginUrl,
      username: opts.username,
      password: opts.password,
      usernameSelector: opts.usernameSelector,
      passwordSelector: opts.passwordSelector,
      loginButtonSelector: opts.loginButtonSelector,
      waitForSelector: opts.waitForSelector,
    };
  }

  // ── Echo the plan ──
  console.log();
  if (url) {
    console.log(chalk.hex("#48dbfb")("  Mode:") + `   URL-specific (Playwright + AI)`);
    console.log(chalk.dim("  url:") + `      ${url}`);
  } else {
    console.log(chalk.hex("#48dbfb")("  Mode:") + `   Sample app`);
  }
  console.log(chalk.dim("  project:") + `  ${projectName}`);
  console.log(chalk.dim("  files:") + `   ${fileName}`);
  console.log(chalk.dim("  location:") + ` ${resolve(targetDir)}`);
  console.log(chalk.dim("  language:") + ` ${language}`);
  console.log(chalk.dim("  bdd:") + `       ${bdd ? "yes" : "no"}`);
  console.log(chalk.dim("  allure:") + `    ${allure ? "yes" : "no"}`);
  if (!url) {
    console.log(chalk.dim("  baseUrl:") + `   ${baseUrl}`);
  }
  console.log(chalk.dim("  install:") + `   ${installDeps ? "yes" : "no"}`);
  console.log(chalk.dim("  llm-wiki:") + `  ${llmWiki ? "yes" : "no"}`);
  console.log(chalk.dim("  scenarios:") + ` ${scenarios ? "yes" : "no"}`);
  console.log(chalk.dim("  git:") + `       ${initGit ? "yes" : "no"}`);
  console.log();

  // ── Scaffold ──
  const result = await withSpinner(url ? "Scaffolding project & analyzing page..." : "Scaffolding project...", async (spinner) => {
    return scaffoldProject({
      targetDir: resolve(targetDir),
      projectName,
      description,
      language,
      bdd,
      allure,
      baseUrl,
      installDeps,
      llmWiki,
      scenarios,
      initGit,
      url,
      auth: authConfig,
      fileName,
    });
  });

  ui.success(`Project created at ${result.projectPath}`);
  console.log();
  ui.dim(`  ${result.files.length} files written.`);
  console.log();
  console.log(chalk.bold.hex("#feca57")("\n  Next steps"));
  console.log(chalk.dim("  ─────────────────────────────────────────────"));
  console.log(chalk.hex("#48dbfb")("  1.") + chalk.dim("  cd ") + chalk.bold(resolve(targetDir)));
  if (!url) {
    console.log(chalk.hex("#48dbfb")("  2.") + chalk.dim("  npm run setup        ") + chalk.hex("#ff9ff3")("Check & install deps (Node, Java, Cypress)"));
    console.log(chalk.hex("#48dbfb")("  3.") + chalk.dim("  npm run frontend      ") + chalk.hex("#ff9ff3")("Start the sample app on :3000"));
    console.log(chalk.hex("#48dbfb")("  4.") + chalk.dim("  ") + (bdd ? "npx cypress open   " : "npx cypress open    ") + chalk.hex("#ff9ff3")("Run the sample " + (bdd ? "feature" : "test")));
    console.log(chalk.hex("#48dbfb")("  5.") + chalk.dim("  npm test             ") + chalk.hex("#ff9ff3")("Run smoke tests"));
  } else {
    console.log(chalk.hex("#48dbfb")("  2.") + chalk.dim("  npm run setup        ") + chalk.hex("#ff9ff3")("Check & install deps"));
    console.log(chalk.hex("#48dbfb")("  3.") + chalk.dim("  npx cypress open     ") + chalk.hex("#ff9ff3")("Open Cypress"));
    console.log(chalk.hex("#48dbfb")("  4.") + chalk.dim("  npm test             ") + chalk.hex("#ff9ff3")("Run smoke tests"));
    console.log(chalk.hex("#48dbfb")("  5.") + chalk.dim("  qa hybrid -u <url>   ") + chalk.hex("#ff9ff3")("Generate tests for another page"));
  }
  console.log(chalk.dim("  ─────────────────────────────────────────────"));
  console.log();
  console.log(chalk.hex("#ff6b6b")("  ") + chalk.dim("  Windows: use ") + chalk.bold("npm run qa"));
  console.log(chalk.hex("#feca57")("  ") + chalk.dim(`  Run `) + chalk.bold("qa generate test") + chalk.dim(" inside the project to add more tests."));
  if (llmWiki) {
    console.log(chalk.hex("#ff9ff3")("  ") + chalk.dim("  LLM-Wiki ") + chalk.bold(".qa-guide.md") + chalk.dim(" included — run ") + chalk.bold("qa generate") + chalk.dim(" to use it automatically."));
  }
  console.log();
}
