/**
 * Public API of @qa-test-generator/core.
 *
 * Sub-modules: llm, config, generator, chat, docs.
 */

// ── LLM ────────────────────────────────────────────────────────────────────
export * from "./llm/types";
export {
  getActiveProvider,
  getProviderForConfig,
  setActiveConfig,
} from "./llm";
export { createProvider } from "./llm/provider-factory";
export { OllamaProvider } from "./llm/ollama";
export { GeminiProvider } from "./llm/gemini";
export {
  LMStudioProvider,
  LlamaCppProvider,
  OpenRouterProvider,
  OpenCodeProvider,
  HermesProvider,
} from "./llm/providers-openai-like";
export { OpenAICompatibleProvider } from "./llm/openai-compatible";

// ── Config ──────────────────────────────────────────────────────────────────
export * from "./config/schema";
export {
  defaultConfig,
  loadConfig,
  saveConfig,
  upsertProvider,
  activeProviderConfig,
  configPaths,
} from "./config/store";

// ── Generator ───────────────────────────────────────────────────────────────
export * from "./generator/types";
export { scaffoldProject, collectFiles } from "./generator/scaffold";
export {
  generateTest,
  generatePage,
  generateLocators,
  generateHelper,
  generateBdd,
} from "./generator/generate";

// ── Chat ────────────────────────────────────────────────────────────────────
export {
  ChatSession,
  askQa,
  QA_CHAT_SYSTEM_PROMPT,
} from "./chat/chat-session";

// ── Docs ────────────────────────────────────────────────────────────────────
export {
  analyzeProject,
  renderMarkdown,
  renderHtml,
} from "./docs/markdown-generator";
export type {
  ProjectAnalysis,
  FeatureOutline,
  DocsOptions,
} from "./docs/markdown-generator";
export {
  publishPage as publishConfluencePage,
  loadConfluenceConfigFromFile,
} from "./docs/confluence-client";
export type {
  ConfluenceConfig,
  PublishResult,
} from "./docs/confluence-client";

// ── Meta ────────────────────────────────────────────────────────────────────
export const CORE_VERSION = "0.1.0";
