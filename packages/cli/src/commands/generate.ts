import { input } from "@inquirer/prompts";
import {
  generateTest,
  generatePage,
  generateLocators,
  generateHelper,
  generateBdd,
} from "@qa-test-generator/core";
import { ui, withSpinner, chalk } from "../ui";

export type GenerateType = "test" | "page" | "locators" | "helper" | "bdd";

export interface GenerateOptions {
  type: GenerateType;
  goal?: string;
  /** Project root; defaults to cwd. */
  projectRoot?: string;
  /** Skip the goal prompt (used with --goal). */
  yes?: boolean;
  /** Path to a Structure Guide markdown file. */
  guide?: string;
  /** Test tier for test generation: smoke (default) or regression. */
  tier?: "smoke" | "regression";
}

const PROMPTS: Record<GenerateType, string> = {
  test: "Describe the test scenario (e.g. 'verify user can log out from the dashboard'):",
  page: "Describe the page to model (e.g. 'checkout page with cart summary and payment form'):",
  locators: "Describe the elements to capture (e.g. 'header nav bar links and search box'):",
  helper: "Describe the helper purpose (e.g. 'generate random credit card numbers for tests'):",
  bdd: "Describe the feature (e.g. 'user search with filters and sorting'):",
};

const SUCCESS_LABEL: Record<GenerateType, string> = {
  test: "Test spec",
  page: "Page Object",
  locators: "Locators file",
  helper: "Helper module",
  bdd: "BDD feature + steps",
};

export async function generateCommand(opts: GenerateOptions): Promise<void> {
  const projectRoot = opts.projectRoot ?? process.cwd();

  const goal =
    opts.goal ?? (opts.yes ? "" : await input({ message: PROMPTS[opts.type] }));
  if (!goal.trim()) {
    ui.error("A description is required. Pass it with --goal or answer the prompt.");
    process.exit(1);
  }

  ui.dim(`Using project: ${projectRoot}`);
  if (opts.guide) {
    ui.dim(`Using structure guide: ${opts.guide}`);
  }
  if (opts.tier) {
    ui.dim(`Test tier: ${opts.tier}`);
  }

  const baseOptions = { projectRoot, guide: opts.guide, tier: opts.tier };

  if (opts.type === "test") {
    const res = await withSpinner("Generating test…", () =>
      generateTest(goal, baseOptions),
    );
    printSingle(res.path, res.content, SUCCESS_LABEL.test);
  } else if (opts.type === "page") {
    const res = await withSpinner("Generating page object…", () =>
      generatePage(goal, baseOptions),
    );
    printSingle(res.path, res.content, SUCCESS_LABEL.page);
  } else if (opts.type === "locators") {
    const res = await withSpinner("Generating locators…", () =>
      generateLocators(goal, baseOptions),
    );
    printSingle(res.path, res.content, SUCCESS_LABEL.locators);
  } else if (opts.type === "helper") {
    const res = await withSpinner("Generating helper…", () =>
      generateHelper(goal, baseOptions),
    );
    printSingle(res.path, res.content, SUCCESS_LABEL.helper);
  } else if (opts.type === "bdd") {
    const res = await withSpinner("Generating BDD feature + steps…", () =>
      generateBdd(goal, baseOptions),
    );
    ui.success(`${SUCCESS_LABEL.bdd} created:`);
    for (const p of res.paths) console.log(chalk.green("  ✔ ") + chalk.dim(p));
    console.log();
    if (process.stdout.isTTY) {
      console.log(chalk.dim("---- preview ----"));
      console.log(res.content.split("\n").slice(0, 40).join("\n"));
      console.log(chalk.dim("---- /preview ----\n"));
    }
  }
}

function printSingle(path: string, content: string, label: string): void {
  ui.success(`${label} created: ${chalk.underline(path)}`);
  console.log();
  if (process.stdout.isTTY) {
    console.log(chalk.dim("---- preview ----"));
    console.log(content.split("\n").slice(0, 40).join("\n"));
    console.log(chalk.dim("---- /preview ----\n"));
  }
}
