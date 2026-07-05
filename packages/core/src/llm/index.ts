/**
 * Convenience helpers for working with providers from an `AppConfig`.
 */
import {
  activeProviderConfig,
  loadConfig,
  saveConfig,
  type AppConfig,
} from "../config/store";
import { createProvider } from "./provider-factory";
import type { LLMProvider } from "./types";

/** Build and return the currently active provider from the saved config. */
export function getActiveProvider(): LLMProvider {
  const config = loadConfig();
  return getProviderForConfig(config);
}

/** Build the active provider for an explicit config object. */
export function getProviderForConfig(config: AppConfig): LLMProvider {
  return createProvider(activeProviderConfig(config));
}

/** Convenience: save a new config and return the resulting active provider. */
export function setActiveConfig(config: AppConfig): LLMProvider {
  saveConfig(config);
  return getProviderForConfig(config);
}
