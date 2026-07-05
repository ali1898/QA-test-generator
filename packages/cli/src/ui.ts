/**
 * Shared CLI presentation helpers — colors, spinners, error handling.
 *
 * Using chalk@4 (CommonJS) and ora@7 keeps everything ESM-free so the
 * compiled CLI runs directly with `node` on Windows without loader flags.
 */
import chalk from "chalk";
import ora from "ora";
// ora@5 bundles its own types via the main field; no separate @types needed.
type Ora = ReturnType<typeof ora>;

export const ui = {
  info: (msg: string) => console.log(chalk.cyan("ℹ"), msg),
  success: (msg: string) => console.log(chalk.green("✔"), msg),
  warn: (msg: string) => console.log(chalk.yellow("!"), msg),
  error: (msg: string) => console.error(chalk.red("✖"), msg),
  dim: (msg: string) => console.log(chalk.dim(msg)),
  header: (msg: string) => console.log(chalk.bold.white.bgCyan(` ${msg} `)),
};

/** Run an async task with a spinner; returns its result or exits on error. */
export async function withSpinner<T>(
  text: string,
  task: (spinner: Ora) => Promise<T>,
): Promise<T> {
  const spinner = ora(text).start();
  try {
    const result = await task(spinner);
    spinner.succeed();
    return result;
  } catch (err) {
    spinner.fail();
    handleError(err);
  }
}

/** Print a user-friendly error and exit with non-zero status. */
export function handleError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  ui.error(message);
  if (process.env.QA_DEBUG) {
    console.error(err);
  }
  process.exit(1);
}

export { chalk, ora };
