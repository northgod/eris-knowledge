import { describe, expect, it } from "vitest";
import { parseCodexTask } from "../../src/server/parser/orchestratorParser";

describe("parseCodexTask", () => {
  it("extracts the fields needed for production detail", () => {
    const parsed = parseCodexTask(
      JSON.stringify({
        runId: "story::production",
        gateId: "G1",
        taskId: "task-1",
        title: "G1 task",
        expectedOutputs: ["01_脚本.md", "02_テキストコンテ.md"],
        contextPaths: ["source.txt"],
        createdAt: "2026-07-06T00:00:00.000Z"
      })
    );

    expect(parsed).toMatchObject({
      runId: "story::production",
      gateId: "G1",
      taskId: "task-1",
      title: "G1 task"
    });
    expect(parsed.expectedOutputs).toEqual(["01_脚本.md", "02_テキストコンテ.md"]);
  });
});
