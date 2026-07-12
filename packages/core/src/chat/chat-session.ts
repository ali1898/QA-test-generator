/**
 * QA-focused chat session backed by an LLM provider.
 *
 * Keeps an in-memory conversation history and streams assistant replies.
 * The system prompt is tuned for Cypress / QA guidance.
 */
import { getActiveProvider } from "../llm";
import type { ChatMessage, ChatOptions, LLMProvider } from "../llm/types";
import { QA_CHAT_SYSTEM_PROMPT } from "../generator/prompts";

export interface ChatSessionOptions {
  provider?: LLMProvider;
  /** Extra context to inject (e.g. analyzed project summary). */
  context?: string;
  /** Override the default system prompt. */
  systemPrompt?: string;
}

export class ChatSession {
  private history: ChatMessage[] = [];
  private readonly provider: LLMProvider;
  private readonly systemPrompt: string;

  constructor(options: ChatSessionOptions = {}) {
    this.provider = options.provider ?? getActiveProvider();
    const base = options.systemPrompt ?? QA_CHAT_SYSTEM_PROMPT;
    this.systemPrompt = options.context
      ? `${base}\n\nProject context:\n${options.context}`
      : base;
  }

  /** Send a user message and return the full assistant reply. */
  async send(userMessage: string): Promise<string> {
    this.history.push({ role: "user", content: userMessage });
    const result = await this.provider.chat(this.history, {
      systemPrompt: this.systemPrompt,
      temperature: 0.3,
      maxTokens: 2048,
    });
    this.history.push({ role: "assistant", content: result.content });
    return result.content;
  }

  /** Send a user message, streaming the reply chunk-by-chunk. */
  async sendStream(
    userMessage: string,
    onChunk: (chunk: string) => boolean | void,
  ): Promise<string> {
    this.history.push({ role: "user", content: userMessage });
    const result = await this.provider.streamChat(
      this.history,
      onChunk,
      {
        systemPrompt: this.systemPrompt,
        temperature: 0.3,
        maxTokens: 2048,
      },
    );
    this.history.push({ role: "assistant", content: result.content });
    return result.content;
  }

  /** Clear conversation history (system prompt is retained). */
  reset(): void {
    this.history = [];
  }

  /** Read-only copy of the current history. */
  getHistory(): ChatMessage[] {
    return [...this.history];
  }
}

/** Low-level helper: a single one-shot QA question (no session memory). */
export async function askQa(
  question: string,
  options?: { provider?: LLMProvider } & ChatOptions,
): Promise<string> {
  const provider = options?.provider ?? getActiveProvider();
  const result = await provider.chat(
    [{ role: "user", content: question }],
    {
      systemPrompt: QA_CHAT_SYSTEM_PROMPT,
      temperature: options?.temperature ?? 0.3,
      maxTokens: options?.maxTokens ?? 2048,
    },
  );
  return result.content;
}
