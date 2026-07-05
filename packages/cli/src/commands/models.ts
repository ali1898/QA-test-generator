/**
 * `qa models` — list models offered by the active provider.
 *
 * Acts as a connectivity check: if this works, chat/generate will too.
 */
import { getActiveProvider } from "@qa-test-generator/core";
import { ui, withSpinner, chalk } from "../ui";
import { activeBanner } from "./config";

export async function modelsCommand(): Promise<void> {
  ui.header("Available models");
  ui.dim(`Provider: ${activeBanner()}\n`);

  const provider = getActiveProvider();
  const models = await withSpinner("Fetching models…", () => provider.listModels());

  if (models.length === 0) {
    ui.warn("No models reported. Check that your local server is running.");
    return;
  }

  for (const m of models) {
    console.log(`  ${chalk.green("•")} ${m.id}${m.name && m.name !== m.id ? chalk.dim(`  (${m.name})`) : ""}`);
  }
  console.log();
  ui.dim(`Local: ${provider.isLocal ? "yes (offline capable)" : "no (cloud)"}`);
}
