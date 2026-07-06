import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductionInsightPanel } from "../../src/client/components/ProductionInsightPanel";

describe("ProductionInsightPanel", () => {
  it("shows parsed scenes, cuts, and source assets for the selected production", () => {
    render(
      <ProductionInsightPanel
        loading={false}
        detail={{
          production: {
            id: "story::prod",
            storyName: "story",
            productionPath: "prod",
            absolutePath: "D:\\prod",
            detectionType: "manual",
            gates: { G0: "missing", G1: "detected", G2: "missing", G3: "missing", G4: "missing" },
            sceneCount: 1,
            cutCount: 1,
            storyboardSheetCount: 0,
            videoPromptCount: 0,
            generatedVideoCount: 0,
            approvalCount: 0,
            issueCount: 0,
            lastContentMtime: null,
            checked: false,
            tags: []
          },
          scenes: [
            {
              id: "scene-1",
              productionId: "story::prod",
              sourceArtifactId: "artifact-1",
              sceneKey: "001",
              title: "Opening",
              timeRange: "00:00-00:03",
              durationSeconds: 3,
              summary: "Hero arrives",
              lineNumber: 3,
              cuts: [
                {
                  id: "cut-1",
                  sceneId: "scene-1",
                  cutKey: "1",
                  timeRange: "00:00-00:01",
                  durationSeconds: 1,
                  cameraLabel: "wide",
                  summary: "City reveal",
                  dialogue: null,
                  lineNumber: 4
                }
              ]
            }
          ],
          manualNote: "G2確認待ち",
          artifacts: [
            {
              id: "artifact-1",
              productionId: "story::prod",
              kind: "text_storyboard",
              gate: "G1",
              relativePath: "stories/story/02_Anime/storyboards/prod/text.md",
              absolutePath: "D:\\prod\\text.md",
              extension: ".md",
              sizeBytes: 120,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            }
          ]
        }}
        onSaveNote={vi.fn()}
        onToggleChecked={vi.fn()}
      />
    );

    expect(screen.getByText("Selected Production")).toBeInTheDocument();
    expect(screen.getByText("001 Opening")).toBeInTheDocument();
    expect(screen.getByText("City reveal")).toBeInTheDocument();
    expect(screen.getByText("text_storyboard")).toBeInTheDocument();
  });
  it("saves app-local manual note and checked status", () => {
    const onSaveNote = vi.fn();
    const onToggleChecked = vi.fn();
    render(
      <ProductionInsightPanel
        loading={false}
        detail={{
          production: {
            id: "story::prod",
            storyName: "story",
            productionPath: "prod",
            absolutePath: "D:\\prod",
            detectionType: "manual",
            gates: { G0: "missing", G1: "detected", G2: "missing", G3: "missing", G4: "missing" },
            sceneCount: 0,
            cutCount: 0,
            storyboardSheetCount: 0,
            videoPromptCount: 0,
            generatedVideoCount: 0,
            approvalCount: 0,
            issueCount: 0,
            lastContentMtime: null,
            checked: false,
            tags: []
          },
          manualNote: "G2確認待ち",
          scenes: [],
          artifacts: []
        }}
        onSaveNote={onSaveNote}
        onToggleChecked={onToggleChecked}
      />
    );

    fireEvent.change(screen.getByLabelText("Local note"), { target: { value: "G3素材確認" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Mark production checked" }));

    expect(onSaveNote).toHaveBeenCalledWith("G3素材確認");
    expect(onToggleChecked).toHaveBeenCalledWith(true);
  });
});
