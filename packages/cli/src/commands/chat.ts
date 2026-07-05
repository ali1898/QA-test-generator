/**
 * `qa chat` — interactive REPL for QA guidance backed by the active LLM.
 *
 * Streams responses token-by-token. Supports slash commands:
 *   /reset   clear conversation
 *   /exit    quit
 *   /help    show commands
 */
import { input } from "@inquirer/prompts";
import { ChatSession } from "@qa-test-generator/core";
import { ui, chalk } from "../ui";
import { activeBanner } from "./config";

export async function chatCommand(): Promise<void> {
  ui.header("QA Chat");
  ui.dim(`Provider: ${activeBanner()}`);
  console.log(chalk.dim('  Type your question. "/help" for commands, "/exit" to quit.\n'));

  const session = new ChatSession();

  while (true) {
    let question: string;
    try {
      question = await input({ message: chalk.cyan(">") });
    } catch {
      // Ctrl+C / EOF → exit gracefully.
      console.log();
      break;
    }

    const trimmed = question.trim();
    if (!trimmed) continue;

    if (trimmed === "/exit" || trimmed === "/quit") {
      ui.dim("Bye!");
      break;
    }
    if (trimmed === "/help") {
      printHelp();
      continue;
    }
    if (trimmed === "/reset") {
      session.reset();
      ui.success("Conversation cleared.");
      continue;
    }

    // Stream the reply.
    process.stdout.write(chalk.green("<") + " ");
    let firstChunk = true;
    try {
      await session.sendStream(trimmed, (chunk) => {
        process.stdout.write(chunk);
        firstChunk = false;
      });
      process.stdout.write("\n\n");
    } catch (err) {
      process.stdout.write("\n");
      const message = err instanceof Error ? err.message : String(err);
      ui.error(`LLM error: ${message}`);
      ui.dim('Run "qa config" to check your provider settings, or "qa models" to verify connectivity.');
      console.log();
    }
  }
}

function printHelp(): void {
  console.log();
  console.log(chalk.bold("Commands:"));
  console.log(chalk.dim("  /reset   ") + "clear conversation history");
  console.log(chalk.dim("  /help    ") + "show this help");
  console.log(chalk.dim("  /exit    ") + "quit the chat");
  console.log();
}
