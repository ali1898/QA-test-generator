import { chalk } from "./ui";
import { CORE_VERSION } from "@testsaz/core";

export const BANNER =
    chalk.hex("#ffffff")("\n████████ ") +
      chalk.hex("#ffffff")("███████ ") +
      chalk.hex("#ffffff")("███████ ") +
      chalk.hex("#ffffff")("████████ ") +
      chalk.hex("#ffffff")("███████ ") +
      chalk.hex("#ffffff")(" █████  ") +
      chalk.hex("#ffffff")("███████") + "\n" +

      chalk.hex("#ffffff")("   ██    ") +
      chalk.hex("#ffffff")("██      ") +
      chalk.hex("#ffffff")("██      ") +
      chalk.hex("#ffffff")("   ██    ") +
      chalk.hex("#ffffff")("██      ") +
      chalk.hex("#ffffff")("██   ██ ") +
      chalk.hex("#ffffff")("    ██") + "\n" +

      chalk.hex("#ffffff")("   ██    ") +
      chalk.hex("#ffffff")("█████   ") +
      chalk.hex("#ffffff")("███████ ") +
      chalk.hex("#ffffff")("   ██    ") +
      chalk.hex("#ffffff")("███████ ") +
      chalk.hex("#ffffff")("███████ ") +
      chalk.hex("#ffffff")("  ██") + "\n" +

      chalk.hex("#ffffff")("   ██    ") +
      chalk.hex("#ffffff")("██      ") +
      chalk.hex("#ffffff")("     ██ ") +
      chalk.hex("#ffffff")("   ██    ") +
      chalk.hex("#ffffff")("     ██ ") +
      chalk.hex("#ffffff")("██   ██ ") +
      chalk.hex("#ffffff")("██") + "\n" +

      chalk.hex("#ffffff")("   ██    ") +
      chalk.hex("#ffffff")("███████ ") +
      chalk.hex("#ffffff")("███████ ") +
      chalk.hex("#ffffff")("   ██    ") +
      chalk.hex("#ffffff")("███████ ") +
      chalk.hex("#ffffff")("██   ██ ") +
      chalk.hex("#ffffff")("███████\n") +

  chalk.dim(`  \n\t${chalk.bold.white("AI-Powered Cypress Test Generator")} v${CORE_VERSION}\n`) +
  chalk.hex("#ffffff")(" \t\tPOM") + chalk.dim(" + ") +
  chalk.hex("#ffffff")("BDD") + chalk.dim(" + ") +
  chalk.hex("#ffffff")("Allure") + chalk.dim(" + ") +
  chalk.hex("#ffffff")("AI") +
  "\n";

/** Print banner to stdout. Call this before any project-related command. */
export function printBanner(): void {
  process.stdout.write(BANNER);
}
