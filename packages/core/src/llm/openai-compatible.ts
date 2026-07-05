/**
 * Base provider for any backend that speaks the OpenAI Chat Completions API.
 *
 * LM Studio, llama.cpp (server) and OpenRouter all expose the same
 * `/v1/chat/completions` shape, so we implement the logic once with the
 * built-in `fetch` (Node 18+) and only vary the `baseURL`, `apiKey` and
 * default headers per subclass. No external SDK needed.
 */
import type {
  ChatMessage,
  ChatOptions,
  ChatResult,
  LLMProvider,
  ModelInfo,
  ProviderId,
  StreamHandler,
} from "./types";

export interface OpenAICompatibleConfig {
  /** Default model used when none is passed in chat options. */
  model: string;
  /** Base URL of the OpenAI-compatible API, e.g. http://localhost:1234/v1. */
  baseURL: string;
  /** API key. Local servers often accept any non-empty string. */
  apiKey?: string;
  /** Extra headers (e.g. OpenRouter's HTTP-Referer). */
  defaultHeaders?: Record<string, string>;
  /** Per-request timeout in ms (default 120s). */
  timeoutMs?: number;
}

interface OpenAIChoice {
  message?: { content?: string };
  delta?: { content?: string };
}
interface OpenAICompletion {
  choices?: OpenAIChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export abstract class OpenAICompatibleProvider implements LLMProvider {
  abstract readonly id: ProviderId;
  abstract readonly displayName: string;
  abstract readonly isLocal: boolean;

  protected readonly config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.config = config;
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): Promise<ChatResult> {
    const resolved = this.resolveMessages(messages, options);
    const body = {
      model: this.config.model,
      messages: resolved,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: false,
    };

    const res = await this.post("/chat/completions", body);
    const data = (await res.json()) as OpenAICompletion;
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content ?? "",
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async streamChat(
    messages: ChatMessage[],
    onChunk: StreamHandler,
    options: ChatOptions = {},
  ): Promise<ChatResult> {
    const resolved = this.resolveMessages(messages, options);
    const body = {
      model: this.config.model,
      messages: resolved,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stream: true,
    };

    const res = await this.post("/chat/completions", body);
    if (!res.ok || !res.body) {
      throw new Error(
        `OpenAI-compatible stream failed (${res.status}): ${await res.text()}`,
      );
    }

    let content = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // SSE frames are separated by blank lines; process complete lines.
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const payload = trimmed.slice("data:".length).trim();
        if (payload === "[DONE]") {
          return { content };
        }
        try {
          const json = JSON.parse(payload) as OpenAICompletion;
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            content += delta;
            if (onChunk(delta) === false) {
              await reader.cancel();
              return { content };
            }
          }
        } catch {
          // Partial JSON across chunks — ignore, will be completed next read.
        }
      }
    }
    return { content };
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const res = await this.get("/models");
      if (!res.ok) {
        return [{ id: this.config.model, name: this.config.model }];
      }
      const data = (await res.json()) as { data?: { id: string }[] };
      return (data.data ?? []).map((m) => ({ id: m.id, name: m.id }));
    } catch {
      // Some local servers don't implement /models — fall back to the configured model.
      return [{ id: this.config.model, name: this.config.model }];
    }
  }

  // ── HTTP helpers ──────────────────────────────────────────────────────────

  private get(path: string): Promise<Response> {
    return this.request("GET", path);
  }

  private post(path: string, body: unknown): Promise<Response> {
    return this.request("POST", path, body);
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const url = `${this.config.baseURL.replace(/\/$/, "")}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.config.defaultHeaders,
    };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? 120_000,
    );
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `OpenAI-compatible request failed (${res.status}) ${url}: ${text}`,
        );
      }
      return res;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Merge an optional system prompt into the message list.
   * If the first message is already a system message, we leave it as-is.
   */
  private resolveMessages(
    messages: ChatMessage[],
    options: ChatOptions,
  ): ChatMessage[] {
    const hasSystem = messages.some((m) => m.role === "system");
    if (options.systemPrompt && !hasSystem) {
      return [{ role: "system", content: options.systemPrompt }, ...messages];
    }
    return messages;
  }
}
