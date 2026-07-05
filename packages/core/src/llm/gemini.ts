/**
 * Google Gemini provider — uses the official @google/generative-ai SDK.
 *
 * Requires an API key from https://aistudio.google.com/app/apikey.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ChatMessage,
  ChatOptions,
  ChatResult,
  LLMProvider,
  ModelInfo,
  StreamHandler,
} from "./types";

export interface GeminiConfig {
  model: string;
  apiKey: string;
}

export class GeminiProvider implements LLMProvider {
  readonly id = "gemini" as const;
  readonly displayName = "Google Gemini";
  readonly isLocal = false;

  private readonly genAI: GoogleGenerativeAI;
  private readonly model: string;

  constructor(config: GeminiConfig) {
    this.model = config.model;
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }

  async chat(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): Promise<ChatResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      ...(options.systemPrompt
        ? { systemInstruction: options.systemPrompt }
        : {}),
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });

    const { history, prompt } = this.toGeminiHistory(messages);
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(prompt);
    return { content: result.response.text() };
  }

  async streamChat(
    messages: ChatMessage[],
    onChunk: StreamHandler,
    options: ChatOptions = {},
  ): Promise<ChatResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      ...(options.systemPrompt
        ? { systemInstruction: options.systemPrompt }
        : {}),
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });

    const { history, prompt } = this.toGeminiHistory(messages);
    const chat = model.startChat({ history });
    const stream = await chat.sendMessageStream(prompt);

    let content = "";
    for await (const chunk of stream.stream) {
      const delta = chunk.text();
      if (delta) {
        content += delta;
        if (onChunk(delta) === false) {
          break;
        }
      }
    }
    return { content };
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      // The @google/generative-ai SDK doesn't expose listModels() directly.
      // We return a fallback with the configured model.
      return [{ id: this.model, name: this.model }];
    } catch {
      return [{ id: this.model, name: this.model }];
    }
  }

  /**
   * Convert our flat message list into Gemini's `history` (role pairs) plus a
   * trailing `prompt` for the final user turn.
   */
  private toGeminiHistory(
    messages: ChatMessage[],
  ): { history: { role: string; parts: { text: string }[] }[]; prompt: string } {
    // Gemini uses "user" and "model" roles (system is handled separately).
    const filtered = messages.filter((m) => m.role !== "system");
    if (filtered.length === 0) {
      return { history: [], prompt: "" };
    }

    const prompt = filtered[filtered.length - 1].content;
    const history = filtered.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    return { history, prompt };
  }
}
