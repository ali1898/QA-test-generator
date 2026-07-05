import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  analyzeProjectStructure,
  renderStructureGuide,
} from "@qa-test-generator/core";
import { ui, withSpinner, chalk } from "../ui";

export interface GenerateGuideOptions {
  /** Project root to analyze; defaults to cwd. */
  projectRoot?: string;
  /** Output file path; defaults to ./structure-guide.md. */
  output?: string;
  /** Override detected project name. */
  title?: string;
}

export async function generateGuideCommand(opts: GenerateGuideOptions): Promise<void> {
  const projectRoot = resolve(opts.projectRoot ?? process.cwd());

  if (!existsSync(join(projectRoot, "cypress.config.ts")) &&
      !existsSync(join(projectRoot, "cypress.config.js"))) {
    ui.warn("No cypress.config.* found — is this a Cypress project?");
  }

  ui.dim(`Analyzing project: ${projectRoot}`);

  const guide = await withSpinner("Analyzing project structure…", () => {
    return Promise.resolve(analyzeProjectStructure({
      projectRoot,
      projectName: opts.title,
    }));
  });

  const markdown = renderStructureGuide(guide);

  const outPath = resolve(opts.output ?? "structure-guide.md");
  mkdirSync(dirname(outPath), { recursive: true });

  await withSpinner("Writing structure guide…", () => {
    return new Promise<void>((resolve, reject) => {
      try {
        writeFileSync(outPath, markdown, "utf-8");
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });

  ui.success(`Structure guide created`);
  console.log(chalk.underline(outPath));
  console.log();
  console.log(chalk.hex("#48dbfb")("  Project :") + chalk.bold(` ${guide.projectName}`));
  console.log(chalk.hex("#feca57")("  Language:") + ` ${guide.language}`);
  console.log(chalk.hex("#ff9ff3")("  Layers  :") + ` ${guide.layers.length}`);
  console.log(chalk.hex("#00d4ff")("  Commands:") + ` ${guide.customCommands.length} custom commands`);
  console.log();
  console.log(chalk.bold.hex("#feca57")("  Use it with:"));
  console.log(chalk.dim("    qa generate test --goal \"...\" --guide ") + chalk.underline(outPath));
  console.log(chalk.dim("    qa generate page --goal \"...\" --guide ") + chalk.underline(outPath));
  console.log(chalk.dim("    qa chat --guide ") + chalk.underline(outPath));
  console.log();
}

function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(0, i) : ".";
}
