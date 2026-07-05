import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { getActiveProvider } from "../llm";
import type { ChatMessage, LLMProvider } from "../llm/types";

const QA_SYSTEM_PROMPT = `You are an expert QA automation engineer specializing in Cypress.
You write clean, maintainable test code following these principles:
- Page Object Model for reusing UI interactions
- Robust selectors (prefer data-cy attributes, avoid brittle CSS/XPath)
- BDD-style Cucumber features using Given/When/Then in plain English
- Custom Cypress commands for repeated actions
- Clear assertions with meaningful failure messages
- No flaky waits (no cy.wait with arbitrary timeouts)

Return ONLY the requested file content. Do not add markdown code fences
unless the file format is markdown. Do not add commentary.`;

export interface GenerateOptions {
  projectRoot: string;
  provider?: LLMProvider;
}

async function askLlm(
  provider: LLMProvider,
  prompt: string,
  systemPrompt = QA_SYSTEM_PROMPT,
): Promise<string> {
  const messages: ChatMessage[] = [{ role: "user", content: prompt }];
  const result = await provider.chat(messages, {
    systemPrompt,
    temperature: 0.2,
    maxTokens: 2048,
  });
  return stripCodeFences(result.content);
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  return match ? match[1] : trimmed;
}

function writeArtifact(projectRoot: string, relativePath: string, content: string): string {
  const absPath = resolve(projectRoot, relativePath);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, content + "\n", "utf-8");
  return absPath;
}

export async function generateTest(
  goal: string,
  options: GenerateOptions,
): Promise<{ path: string; content: string }> {
  const provider = options.provider ?? getActiveProvider();
  const prompt = `Write a Cypress spec file for the following test goal:
${goal}

Use the Page Object Model pattern. Import page objects from "../pages".
Use describe/it blocks. Include a beforeEach if appropriate.`;
  const content = await askLlm(provider, prompt);
  const safeName = goal.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40).replace(/^-|-$/g, "") || "test";
  const path = writeArtifact(options.projectRoot, `cypress/e2e/test/smoke/${safeName}.cy.ts`, content);
  return { path, content };
}

export async function generatePage(
  description: string,
  options: GenerateOptions,
): Promise<{ path: string; content: string }> {
  const provider = options.provider ?? getActiveProvider();
  const prompt = `Write a Cypress Page Object class for the following page:
${description}

Export a class with methods for each element and action. Use data-cy selectors. Use TypeScript.`;
  const content = await askLlm(provider, prompt);
  const safeName = description.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40).replace(/^-|-$/g, "") || "page";
  const path = writeArtifact(options.projectRoot, `cypress/e2e/pages/${safeName}Page.ts`, content);
  return { path, content };
}

export async function generateLocators(
  description: string,
  options: GenerateOptions,
): Promise<{ path: string; content: string }> {
  const provider = options.provider ?? getActiveProvider();
  const prompt = `Write a Cypress locators constants file for the following:
${description}

Export a const object mapping semantic names to Cypress selectors
(prefer [data-cy="..."] format). Use TypeScript with "as const".`;
  const content = await askLlm(provider, prompt);
  const safeName = description.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40).replace(/^-|-$/g, "") || "locators";
  const path = writeArtifact(options.projectRoot, `cypress/e2e/locators/${safeName}.ts`, content);
  return { path, content };
}

export async function generateHelper(
  description: string,
  options: GenerateOptions,
): Promise<{ path: string; content: string }> {
  const provider = options.provider ?? getActiveProvider();
  const prompt = `Write a Cypress helper/utility module for the following purpose:
${description}

Export pure functions only (no side effects, no DOM access unless asked).
Use TypeScript with explicit return types.`;
  const content = await askLlm(provider, prompt);
  const safeName = description.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40).replace(/^-|-$/g, "") || "helper";
  const path = writeArtifact(options.projectRoot, `cypress/utils/${safeName}.ts`, content);
  return { path, content };
}

export async function generateBdd(
  description: string,
  options: GenerateOptions,
): Promise<{ paths: string[]; content: string }> {
  const provider = options.provider ?? getActiveProvider();
  const featurePrompt = `Write a Cucumber .feature file for the following functionality:
${description}

Use Feature/Scenario with Given/When/Then steps in plain English.
Keep scenarios independent and concrete.`;
  const stepsPrompt = `Write Cypress step definitions (TypeScript) using
@badeball/cypress-cucumber-preprocessor Given/When/Then decorators
for these scenarios:
${description}

Import page objects from "../pages". Implement each step.`;

  const [featureContent, stepsContent] = await Promise.all([
    askLlm(provider, featurePrompt),
    askLlm(provider, stepsPrompt),
  ]);

  const safeName = description.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40).replace(/^-|-$/g, "") || "feature";
  const featurePath = writeArtifact(options.projectRoot, `cypress/e2e/features/${safeName}.feature`, featureContent);
  const stepsPath = writeArtifact(options.projectRoot, `cypress/e2e/step-definitions/${safeName}Steps.ts`, stepsContent);

  return {
    paths: [featurePath, stepsPath],
    content: `# Feature\n${featureContent}\n\n# Steps\n${stepsContent}`,
  };
}

export const _internal = { stripCodeFences, writeArtifact, QA_SYSTEM_PROMPT };
