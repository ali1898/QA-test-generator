import type { LLMProvider } from "../llm/types";

export interface PipelineStage<TInput, TOutput> {
  name: string;
  execute: (input: TInput, provider: LLMProvider) => Promise<TOutput>;
}

export interface PipelineResult<T> {
  stage: string;
  output: T;
  duration: number;
}

export async function runPipeline<T>(
  stages: PipelineStage<unknown, T>[],
  initialInput: unknown,
  provider: LLMProvider
): Promise<PipelineResult<T>[]> {
  const results: PipelineResult<T>[] = [];
  let currentInput = initialInput;

  for (const stage of stages) {
    const start = Date.now();
    const output = await stage.execute(currentInput, provider);
    const duration = Date.now() - start;
    results.push({ stage: stage.name, output, duration });
    currentInput = output;
  }

  return results;
}

export async function runParallelStages<T>(
  stages: PipelineStage<unknown, T>[],
  inputs: unknown[],
  provider: LLMProvider
): Promise<PipelineResult<T>[]> {
  const promises = stages.map((stage, i) => {
    const start = Date.now();
    return stage.execute(inputs[i] ?? inputs[0], provider).then((output) => ({
      stage: stage.name,
      output,
      duration: Date.now() - start,
    }));
  });

  return Promise.all(promises);
}
