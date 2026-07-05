/**
 * `qa new` — scaffold a new Cypress project interactively or via flags.
 *
 * Walks the user through: project name, location, language, BDD, Allure,
 * base URL, and dependency install. Then delegates to core.scaffoldProject.
 */
import { input, select, confirm } from "@inquirer/prompts";
import { scaffoldProject, type ProjectLanguage } from "@qa-test-generator/core";
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
  /** Skip all prompts using defaults + flags (for scripting). */
  yes?: boolean;
}

export async function newCommand(opts: NewOptions): Promise<void> {
  ui.header("Create a Cypress project");

  // ── Gather inputs (skip prompts when --yes and a value is provided) ──
  const projectName =
    opts.name ??
    (opts.yes ? "my-cypress-tests" : await input({ message: "Project name:", default: "my-cypress-tests" }));

  const targetDir =
    opts.path ??
    (opts.yes
      ? resolve(projectName)
      : await input({ message: "Target directory:", default: resolve(projectName) }));

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

  // ── Echo the plan ──
  console.log();
  console.log(chalk.dim("  project:") + `  ${projectName}`);
  console.log(chalk.dim("  location:") + ` ${resolve(targetDir)}`);
  console.log(chalk.dim("  language:") + ` ${language}`);
  console.log(chalk.dim("  bdd:") + `       ${bdd ? "yes" : "no"}`);
  console.log(chalk.dim("  allure:") + `    ${allure ? "yes" : "no"}`);
  console.log(chalk.dim("  baseUrl:") + `   ${baseUrl}`);
  console.log(chalk.dim("  install:") + `   ${installDeps ? "yes" : "no"}`);
  console.log();

  // ── Scaffold ──
  const result = await withSpinner("Scaffolding project…", async (spinner) => {
    return scaffoldProject({
      targetDir: resolve(targetDir),
      projectName,
      description,
      language,
      bdd,
      allure,
      baseUrl,
      installDeps,
    });
  });

  ui.success(`Project created at ${result.projectPath}`);
  console.log();
  ui.dim(`  ${result.files.length} files written.`);
  console.log();
  console.log(chalk.bold("Next steps:"));
  console.log(chalk.dim("  cd ") + resolve(targetDir));
  console.log(chalk.dim("  ") + (bdd ? "npx cypress open   # run the sample feature" : "npx cypress open"));
  console.log(chalk.dim("  npm test"));
  console.log();
  ui.dim(`Tip: run ${chalk.bold('"qa generate test"')} inside the project to add more tests.`);
}
