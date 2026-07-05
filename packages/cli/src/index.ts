#!/usr/bin/env node
/**
 * qa — CLI entry point for the QA Test Generator.
 *
 * Wires up commander with the command modules and routes to them.
 */
import { Command } from "commander";
import type { ProjectLanguage } from "@qa-test-generator/core";
import { CORE_VERSION } from "@qa-test-generator/core";
import { ui, chalk } from "./ui";
import { configCommand } from "./commands/config";
import { newCommand, type NewOptions } from "./commands/new";
import { generateCommand, type GenerateType } from "./commands/generate";
import { chatCommand } from "./commands/chat";
import { docsCommand, type DocsOptions } from "./commands/docs";
import { modelsCommand } from "./commands/models";

const program = new Command();

program
  .name("qa")
  .description("Cypress test project generator with AI assistance")
  .version(CORE_VERSION)
  .hook("preAction", () => {
    // Friendly banner before every command (except --version/--help).
  });

// ── qa new ──────────────────────────────────────────────────────────────────
program
  .command("new")
  .description("Scaffold a new Cypress project (POM, BDD, Allure)")
  .option("-n, --name <name>", "project name")
  .option("-p, --path <dir>", "target directory")
  .option("-l, --language <lang>", "typescript | javascript")
  .option("--bdd <bool>", "enable Cucumber BDD", (v) => v !== "false")
  .option("--no-bdd", "disable Cucumber BDD")
  .option("--allure <bool>", "enable Allure reporter", (v) => v !== "false")
  .option("--no-allure", "disable Allure reporter")
  .option("--baseUrl <url>", "base URL for tests")
  .option("-d, --description <text>", "project description")
  .option("--no-install", "skip running npm install")
  .option("-y, --yes", "skip prompts, use defaults + provided flags")
  .action(async (opts) => {
    try {
      const lang = opts.language as ProjectLanguage | undefined;
      await newCommand({
        name: opts.name,
        path: opts.path,
        language: lang,
        bdd: opts.bdd,
        allure: opts.allure,
        baseUrl: opts.baseUrl,
        description: opts.description,
        install: opts.install,
        yes: opts.yes,
      });
    } catch (err) {
      ui.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ── qa generate ─────────────────────────────────────────────────────────────
program
  .command("generate")
  .description("Generate a test artifact with AI (test|page|locators|helper|bdd)")
  .argument(
    "<type>",
    "artifact type",
    (v): GenerateType => {
      const allowed = ["test", "page", "locators", "helper", "bdd"];
      if (!allowed.includes(v)) {
        throw new Error(`Invalid type "${v}". Choose: ${allowed.join(", ")}`);
      }
      return v as GenerateType;
    },
  )
  .option("-g, --goal <text>", "natural-language description of what to generate")
  .option("-p, --project-root <dir>", "project root (default: cwd)")
  .option("-y, --yes", "skip confirmations")
  .action(async (type: GenerateType, opts) => {
    try {
      await generateCommand({
        type,
        goal: opts.goal,
        projectRoot: opts.projectRoot,
        yes: opts.yes,
      });
    } catch (err) {
      ui.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ── qa chat ─────────────────────────────────────────────────────────────────
program
  .command("chat")
  .description("Chat with an AI QA assistant")
  .action(async () => {
    try {
      await chatCommand();
    } catch (err) {
      ui.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ── qa docs ─────────────────────────────────────────────────────────────────
program
  .command("docs")
  .description("Generate documentation from the current Cypress project")
  .option("-p, --project-root <dir>", "project root (default: cwd)")
  .option("-o, --output <dir>", "output directory for md/html (default: ./docs)")
  .option("-t, --title <title>", "document title")
  .option("--confluence", "publish to Confluence Cloud")
  .option("--confluence-config <path>", "path to Confluence config JSON")
  .option("--no-file", "skip file output (print to stdout instead)")
  .action(async (opts) => {
    try {
      const docOpts: DocsOptions = {
        projectRoot: opts.projectRoot,
        output: opts.output,
        title: opts.title,
        confluence: opts.confluence,
        confluenceConfig: opts.confluenceConfig,
        noFile: opts.file === false,
      };
      await docsCommand(docOpts);
    } catch (err) {
      ui.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ── qa config ───────────────────────────────────────────────────────────────
program
  .command("config")
  .description("Configure LLM providers (local + cloud)")
  .action(async () => {
    try {
      await configCommand();
    } catch (err) {
      ui.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ── qa models ───────────────────────────────────────────────────────────────
program
  .command("models")
  .description("List models available to the active provider")
  .action(async () => {
    try {
      await modelsCommand();
    } catch (err) {
      ui.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

// ── Boot ────────────────────────────────────────────────────────────────────
program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red("Fatal:"), err);
  process.exit(1);
});
