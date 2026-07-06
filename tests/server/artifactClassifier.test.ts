import { describe, expect, it } from "vitest";
import { classifyArtifact } from "../../src/server/scanner/artifactClassifier";
import { inferGateStatuses } from "../../src/server/scanner/progress";

describe("artifact classification", () => {
  it("classifies known production files into kind and gate", () => {
    expect(classifyArtifact("EP2/01b/02_テキストコンテ.md")).toMatchObject({
      kind: "text_storyboard",
      gate: "G1"
    });
    expect(classifyArtifact("EP2/01b/storyboard_sheets/sheet.png")).toMatchObject({
      kind: "storyboard_sheet",
      gate: "G2"
    });
    expect(classifyArtifact("EP2/01b/video_prompts/scene_001.md")).toMatchObject({
      kind: "video_prompt",
      gate: "G3"
    });
    expect(classifyArtifact("EP1/03_1/06-08_video_prompts_001-018.md")).toMatchObject({
      kind: "video_prompt",
      gate: "G3"
    });
  });

  it("infers gate statuses from artifacts", () => {
    const statuses = inferGateStatuses([
      { kind: "text_storyboard", gate: "G1" },
      { kind: "storyboard_sheet", gate: "G2" },
      { kind: "video_prompt", gate: "G3" }
    ]);

    expect(statuses).toMatchObject({
      G0: "missing",
      G1: "detected",
      G2: "detected",
      G3: "detected",
      G4: "missing"
    });
  });
});
