export interface ParsedCodexTask {
  runId: string | null;
  gateId: string | null;
  taskId: string | null;
  title: string | null;
  status: string | null;
  expectedOutputs: string[];
  contextPaths: string[];
  createdAt: string | null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function parseCodexTask(jsonText: string): ParsedCodexTask {
  const value = JSON.parse(jsonText) as Record<string, unknown>;
  return {
    runId: typeof value.runId === "string" ? value.runId : null,
    gateId: typeof value.gateId === "string" ? value.gateId : null,
    taskId: typeof value.taskId === "string" ? value.taskId : null,
    title: typeof value.title === "string" ? value.title : null,
    status: typeof value.status === "string" ? value.status : null,
    expectedOutputs: stringArray(value.expectedOutputs),
    contextPaths: stringArray(value.contextPaths),
    createdAt: typeof value.createdAt === "string" ? value.createdAt : null
  };
}
