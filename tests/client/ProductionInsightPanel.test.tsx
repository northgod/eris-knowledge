import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductionInsightPanel } from "../../src/client/components/ProductionInsightPanel";
import type { ProductionDetailPayload } from "../../src/shared/types";

describe("ProductionInsightPanel", () => {
  it("shows parsed scene boards, cuts, and source assets for the selected production", () => {
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
              details: null,
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
                  details: null,
                  lineNumber: 4
                }
              ]
            }
          ],
          manualNote: "G2確認待ち",
          issues: [
            {
              id: "issue-1",
              scanRunId: "scan-1",
              severity: "error",
              relativePath: "stories/story/02_Anime/storyboards/prod/broken.json",
              issueCode: "json_parse_error",
              message: "Invalid JSON"
            }
          ],
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
    const sceneBoards = screen.getByRole("region", { name: "Scene Boards" });
    expect(within(sceneBoards).getByRole("article", { name: "001 Opening" })).toBeInTheDocument();
    expect(screen.getByText("City reveal")).toBeInTheDocument();
    expect(screen.getAllByText("text_storyboard").length).toBeGreaterThan(0);
    expect(screen.getByText("Scan Issues")).toBeInTheDocument();
    expect(screen.getByText("json_parse_error")).toBeInTheDocument();
    expect(screen.getByText("Invalid JSON")).toBeInTheDocument();
  });
  it("renders scene details as tables with separated references, cuts, and full-size storyboards", () => {
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
            gates: { G0: "missing", G1: "detected", G2: "detected", G3: "missing", G4: "missing" },
            sceneCount: 1,
            cutCount: 1,
            storyboardSheetCount: 1,
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
              sourceArtifactId: "text-1",
              sceneKey: "001",
              title: "Opening",
              timeRange: "00:00-00:03",
              durationSeconds: 3,
              summary: "Hero arrives",
              details: [
                "内容: Hero arrives",
                "場所、状態: Rooftop / rain",
                "参照ロール:",
                "character_reference:",
                "アルヴィナ: references/alvina_scene_001.png",
                "background_reference:",
                "屋上: background/roof_scene_001.png",
                "stage_sketch: storyboards/stage_scene_001.png",
                "カメラ: WEEK_MONTAGE / POP_CUTS",
                "画面: Hero stands in rain",
                "CUT PLAN:"
              ].join("\n"),
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
                  dialogue: "なし",
                  details: "CUT1 [00:00-00:01] wide:\n目的: Establish the city\n画面: City reveal\nセリフ: なし",
                  lineNumber: 4
                }
              ]
            }
          ],
          manualNote: "",
          issues: [],
          artifacts: [
            {
              id: "text-1",
              productionId: "story::prod",
              kind: "text_storyboard",
              gate: "G1",
              relativePath: "stories/story/02_Anime/storyboards/prod/scene_001_text.md",
              absolutePath: "D:\\prod\\scene_001_text.md",
              extension: ".md",
              sizeBytes: 120,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            },
            {
              id: "storyboard-1",
              productionId: "story::prod",
              kind: "storyboard_sheet",
              gate: "G2",
              relativePath: "stories/story/02_Anime/storyboards/prod/storyboard_sheets/scene_001_sheet.png",
              absolutePath: "D:\\prod\\scene_001_sheet.png",
              extension: ".png",
              sizeBytes: 200,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            },
            {
              id: "reference-character",
              productionId: "story::prod",
              kind: "image",
              gate: null,
              relativePath: "stories/story/02_Anime/references/alvina_scene_001.png",
              absolutePath: "D:\\prod\\alvina_scene_001.png",
              extension: ".png",
              sizeBytes: 180,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            },
            {
              id: "reference-background",
              productionId: "story::prod",
              kind: "image",
              gate: null,
              relativePath: "stories/story/02_Anime/references/background/roof_scene_001.png",
              absolutePath: "D:\\prod\\roof_scene_001.png",
              extension: ".png",
              sizeBytes: 180,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            },
            {
              id: "stage-sketch",
              productionId: "story::prod",
              kind: "image",
              gate: null,
              relativePath: "stories/story/02_Anime/storyboards/prod/storyboards/stage_scene_001.png",
              absolutePath: "D:\\prod\\stage_scene_001.png",
              extension: ".png",
              sizeBytes: 180,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            },
            {
              id: "storyboard-2",
              productionId: "story::prod",
              kind: "storyboard_sheet",
              gate: "G2",
              relativePath: "stories/story/02_Anime/storyboards/EP2/01b/storyboard_sheets/EP2_01b_cut_sheet_02.png",
              absolutePath: "D:\\prod\\EP2_01b_cut_sheet_02.png",
              extension: ".png",
              sizeBytes: 200,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            },
            {
              id: "storyboard-10",
              productionId: "story::prod",
              kind: "storyboard_sheet",
              gate: "G2",
              relativePath: "stories/story/02_Anime/storyboards/EP2/01b/storyboard_sheets/EP2_01b_cut_sheet_10.png",
              absolutePath: "D:\\prod\\EP2_01b_cut_sheet_10.png",
              extension: ".png",
              sizeBytes: 200,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            }
          ]
        }}
      />
    );

    const sceneBoards = screen.getByRole("region", { name: "Scene Boards" });
    const sceneBoard = within(sceneBoards).getByRole("article", { name: "001 Opening" });
    expect(within(sceneBoard).getByText("001 Opening 00:00-00:03 / 3秒")).toBeInTheDocument();
    expect(within(sceneBoard).getAllByText("Line 3").length).toBeGreaterThan(0);
    const sceneInfo = within(sceneBoard).getByRole("table", { name: "Scene information" });
    expect(within(sceneInfo).getByRole("columnheader", { name: "項目" })).toBeInTheDocument();
    expect(within(sceneInfo).getByRole("columnheader", { name: "本文" })).toBeInTheDocument();
    expect(within(sceneInfo).getByRole("cell", { name: "内容" })).toBeInTheDocument();
    expect(within(sceneInfo).getByRole("cell", { name: "Hero arrives" })).toBeInTheDocument();
    expect(within(sceneInfo).getByRole("cell", { name: "場所、状態" })).toBeInTheDocument();
    expect(within(sceneInfo).getByRole("cell", { name: "Rooftop / rain" })).toBeInTheDocument();
    expect(within(sceneInfo).getByRole("cell", { name: "カメラ" })).toBeInTheDocument();
    expect(within(sceneInfo).getByRole("cell", { name: "WEEK_MONTAGE / POP_CUTS" })).toBeInTheDocument();
    expect(within(sceneInfo).getByRole("cell", { name: "画面" })).toBeInTheDocument();
    expect(within(sceneInfo).getByRole("cell", { name: "Hero stands in rain" })).toBeInTheDocument();
    expect(within(sceneInfo).queryByText("参照ロール")).not.toBeInTheDocument();
    expect(within(sceneInfo).queryByText("CUT PLAN")).not.toBeInTheDocument();

    const referenceRoles = within(sceneBoard).getByRole("region", { name: "参照ロール" });
    const characterReference = within(referenceRoles).getByRole("region", { name: "character_reference" });
    expect(within(characterReference).getByRole("cell", { name: "アルヴィナ" })).toBeInTheDocument();
    const characterLink = within(characterReference).getByRole("link", { name: "references/alvina_scene_001.png" });
    expect(characterLink).toHaveAttribute("href", "/api/assets/reference-character/file");
    expect(within(characterLink).getByRole("img", { name: "references/alvina_scene_001.png" })).toHaveClass("reference-thumbnail");
    const backgroundReference = within(referenceRoles).getByRole("region", { name: "background_reference" });
    expect(within(backgroundReference).getByRole("cell", { name: "屋上" })).toBeInTheDocument();
    expect(within(backgroundReference).getByRole("link", { name: "background/roof_scene_001.png" })).toHaveAttribute(
      "href",
      "/api/assets/reference-background/file"
    );
    const stageSketch = within(referenceRoles).getByRole("region", { name: "stage_sketch" });
    expect(within(stageSketch).getByRole("cell", { name: "stage_sketch" })).toBeInTheDocument();
    expect(within(stageSketch).getByRole("link", { name: "storyboards/stage_scene_001.png" })).toHaveAttribute(
      "href",
      "/api/assets/stage-sketch/file"
    );
    expect(within(stageSketch).queryByText("WEEK_MONTAGE / POP_CUTS")).not.toBeInTheDocument();

    const cutPlan = within(sceneBoard).getByRole("region", { name: "カットプラン" });
    expect(cutPlan.compareDocumentPosition(within(sceneBoard).getByText("Text Sources")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(cutPlan).getByText("CUT 1 [00:00-00:01]")).toBeInTheDocument();
    const cutTable = within(cutPlan).getByRole("table", { name: "CUT 1 attributes" });
    expect(within(cutTable).getByRole("cell", { name: "カメラ" })).toBeInTheDocument();
    expect(within(cutTable).getByRole("cell", { name: "wide" })).toBeInTheDocument();
    expect(within(cutTable).getByRole("cell", { name: "目的" })).toBeInTheDocument();
    expect(within(cutTable).getByRole("cell", { name: "Establish the city" })).toBeInTheDocument();
    expect(within(cutTable).getByRole("cell", { name: "画面" })).toBeInTheDocument();
    expect(within(cutTable).getByRole("cell", { name: "City reveal" })).toBeInTheDocument();
    expect(within(cutTable).getByRole("cell", { name: "セリフ" })).toBeInTheDocument();
    expect(within(cutTable).getByRole("cell", { name: "なし" })).toBeInTheDocument();

    const sheetLink = within(sceneBoard).getByRole("link", {
      name: "stories/story/02_Anime/storyboards/prod/storyboard_sheets/scene_001_sheet.png"
    });
    expect(sheetLink).toHaveAttribute("href", "/api/assets/storyboard-1/file");
    expect(sheetLink).toHaveAttribute("target", "_blank");
    expect(within(sheetLink).getByRole("img", {
      name: "stories/story/02_Anime/storyboards/prod/storyboard_sheets/scene_001_sheet.png"
    })).toHaveAttribute("src", "/api/assets/storyboard-1/file");
    expect(within(sheetLink).getByRole("img", {
      name: "stories/story/02_Anime/storyboards/prod/storyboard_sheets/scene_001_sheet.png"
    })).toHaveClass("storyboard-original-image");
    expect(within(sceneBoard).queryByRole("link", {
      name: "stories/story/02_Anime/storyboards/EP2/01b/storyboard_sheets/EP2_01b_cut_sheet_02.png"
    })).not.toBeInTheDocument();
    expect(within(sceneBoard).queryByRole("link", {
      name: "stories/story/02_Anime/storyboards/EP2/01b/storyboard_sheets/EP2_01b_cut_sheet_10.png"
    })).not.toBeInTheDocument();
  });
  it("shows G0-G4 gate statuses for the selected production", () => {
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
            gates: { G0: "missing", G1: "detected", G2: "partial", G3: "complete", G4: "approved" },
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
          manualNote: "",
          scenes: [],
          artifacts: [],
          issues: []
        }}
      />
    );

    const gateStatus = screen.getByRole("region", { name: "Gate Status" });
    expect(within(gateStatus).getByText("G0")).toBeInTheDocument();
    expect(within(gateStatus).getByText("missing")).toBeInTheDocument();
    expect(within(gateStatus).getByText("G1")).toBeInTheDocument();
    expect(within(gateStatus).getByText("detected")).toBeInTheDocument();
    expect(within(gateStatus).getByText("G2")).toBeInTheDocument();
    expect(within(gateStatus).getByText("partial")).toBeInTheDocument();
    expect(within(gateStatus).getByText("G3")).toBeInTheDocument();
    expect(within(gateStatus).getByText("complete")).toBeInTheDocument();
    expect(within(gateStatus).getByText("G4")).toBeInTheDocument();
    expect(within(gateStatus).getByText("approved")).toBeInTheDocument();
  });
  it("shows storyboard thumbnails, video prompts, and generated videos as production asset groups", () => {
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
            gates: { G0: "missing", G1: "detected", G2: "detected", G3: "detected", G4: "detected" },
            sceneCount: 0,
            cutCount: 0,
            storyboardSheetCount: 1,
            videoPromptCount: 1,
            generatedVideoCount: 1,
            approvalCount: 0,
            issueCount: 0,
            lastContentMtime: null,
            checked: false,
            tags: []
          },
          manualNote: "",
          scenes: [],
          issues: [],
          artifacts: [
            {
              id: "storyboard-1",
              productionId: "story::prod",
              kind: "storyboard_sheet",
              gate: "G2",
              relativePath: "stories/story/02_Anime/storyboards/prod/storyboard_sheets/sheet_001.png",
              absolutePath: "D:\\prod\\sheet_001.png",
              extension: ".png",
              sizeBytes: 200,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            },
            {
              id: "prompt-1",
              productionId: "story::prod",
              kind: "video_prompt",
              gate: "G3",
              relativePath: "stories/story/02_Anime/storyboards/prod/video_prompts/cut_001.md",
              absolutePath: "D:\\prod\\cut_001.md",
              extension: ".md",
              sizeBytes: 120,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            },
            {
              id: "video-1",
              productionId: "story::prod",
              kind: "generated_video",
              gate: "G4",
              relativePath: "stories/story/02_Anime/storyboards/prod/generated_videos/cut_001.mp4",
              absolutePath: "D:\\prod\\cut_001.mp4",
              extension: ".mp4",
              sizeBytes: 5000,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            }
          ]
        }}
      />
    );

    const sceneBoards = screen.getByRole("region", { name: "Scene Boards" });
    expect(within(sceneBoards).getByRole("img", {
      name: "stories/story/02_Anime/storyboards/prod/storyboard_sheets/sheet_001.png"
    })).toHaveAttribute("src", "/api/assets/storyboard-1/file");
    const videoPromptList = screen.getByRole("region", { name: "Video Prompt List" });
    expect(within(videoPromptList).getByText("stories/story/02_Anime/storyboards/prod/video_prompts/cut_001.md")).toBeInTheDocument();
    const generatedVideos = screen.getByRole("region", { name: "Generated Videos" });
    expect(within(generatedVideos).getByText("stories/story/02_Anime/storyboards/prod/generated_videos/cut_001.mp4")).toBeInTheDocument();
  });
  it("previews text storyboards and video prompts from the detail panel", () => {
    const onPreviewAsset = vi.fn();
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
            gates: { G0: "missing", G1: "detected", G2: "missing", G3: "detected", G4: "missing" },
            sceneCount: 0,
            cutCount: 0,
            storyboardSheetCount: 0,
            videoPromptCount: 1,
            generatedVideoCount: 0,
            approvalCount: 0,
            issueCount: 0,
            lastContentMtime: null,
            checked: false,
            tags: []
          },
          manualNote: "",
          scenes: [],
          issues: [],
          artifacts: [
            {
              id: "text-1",
              productionId: "story::prod",
              kind: "text_storyboard",
              gate: "G1",
              relativePath: "stories/story/02_Anime/storyboards/prod/02_テキストコンテ.md",
              absolutePath: "D:\\prod\\02_テキストコンテ.md",
              extension: ".md",
              sizeBytes: 160,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            },
            {
              id: "prompt-1",
              productionId: "story::prod",
              kind: "video_prompt",
              gate: "G3",
              relativePath: "stories/story/02_Anime/storyboards/prod/video_prompts/cut_001.md",
              absolutePath: "D:\\prod\\cut_001.md",
              extension: ".md",
              sizeBytes: 120,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            }
          ]
        }}
        selectedPreview={{
          id: "prompt-1",
          relativePath: "stories/story/02_Anime/storyboards/prod/video_prompts/cut_001.md",
          absolutePath: "D:\\prod\\cut_001.md",
          kind: "video_prompt",
          mode: "text",
          text: "CUT 1: Opening image prompt",
          truncated: false,
          sizeBytes: 120,
          mtime: "2026-07-06T00:00:00.000Z"
        }}
        previewLoading={false}
        onPreviewAsset={onPreviewAsset}
      />
    );

    const textStoryboardList = screen.getByRole("region", { name: "Text Storyboards" });
    expect(within(textStoryboardList).getByText("stories/story/02_Anime/storyboards/prod/02_テキストコンテ.md")).toBeInTheDocument();
    fireEvent.click(within(textStoryboardList).getByRole("button", {
      name: "Preview stories/story/02_Anime/storyboards/prod/02_テキストコンテ.md"
    }));

    const videoPromptList = screen.getByRole("region", { name: "Video Prompt List" });
    fireEvent.click(within(videoPromptList).getByRole("button", {
      name: "Preview stories/story/02_Anime/storyboards/prod/video_prompts/cut_001.md"
    }));

    const detailPreview = screen.getByRole("region", { name: "Selected Production Preview" });
    expect(within(detailPreview).getByText("video_prompt")).toBeInTheDocument();
    expect(within(detailPreview).getByText("full preview")).toBeInTheDocument();
    expect(within(detailPreview).getByText("CUT 1: Opening image prompt")).toBeInTheDocument();
    expect(onPreviewAsset).toHaveBeenCalledWith("text-1");
    expect(onPreviewAsset).toHaveBeenCalledWith("prompt-1");
  });
  it("shows orchestrator task, approval, and state records as a dedicated group", () => {
    render(
      <ProductionInsightPanel
        loading={false}
        detail={{
          production: {
            id: "story::prod",
            storyName: "story",
            productionPath: "prod",
            absolutePath: "D:\\prod",
            detectionType: "mixed",
            gates: { G0: "missing", G1: "detected", G2: "detected", G3: "missing", G4: "missing" },
            sceneCount: 0,
            cutCount: 0,
            storyboardSheetCount: 0,
            videoPromptCount: 0,
            generatedVideoCount: 0,
            approvalCount: 1,
            issueCount: 0,
            lastContentMtime: null,
            checked: false,
            tags: []
          },
          manualNote: "",
          scenes: [],
          issues: [],
          artifacts: [
            {
              id: "task-1",
              productionId: "story::prod",
              kind: "codex_task",
              gate: "G1",
              relativePath: "stories/story/02_Anime/storyboards/prod/codex_tasks/G1_task.json",
              absolutePath: "D:\\prod\\G1_task.json",
              extension: ".json",
              sizeBytes: 300,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            },
            {
              id: "approval-1",
              productionId: "story::prod",
              kind: "approval",
              gate: "G2",
              relativePath: "stories/story/02_Anime/storyboards/prod/approvals/G2_approval.md",
              absolutePath: "D:\\prod\\G2_approval.md",
              extension: ".md",
              sizeBytes: 140,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            },
            {
              id: "state-1",
              productionId: "story::prod",
              kind: "orchestrator_state",
              gate: null,
              relativePath: "stories/story/02_Anime/storyboards/prod/orchestrator/state.json",
              absolutePath: "D:\\prod\\state.json",
              extension: ".json",
              sizeBytes: 200,
              mtime: "2026-07-06T00:00:00.000Z",
              contentHash: null
            }
          ]
        }}
      />
    );

    const orchestratorRecords = screen.getByRole("region", { name: "Orchestrator Records" });
    expect(within(orchestratorRecords).getByText("codex_task")).toBeInTheDocument();
    expect(within(orchestratorRecords).getByText("stories/story/02_Anime/storyboards/prod/codex_tasks/G1_task.json")).toBeInTheDocument();
    expect(within(orchestratorRecords).getByText("approval")).toBeInTheDocument();
    expect(within(orchestratorRecords).getByText("stories/story/02_Anime/storyboards/prod/approvals/G2_approval.md")).toBeInTheDocument();
    expect(within(orchestratorRecords).getByText("orchestrator_state")).toBeInTheDocument();
    expect(within(orchestratorRecords).getByText("stories/story/02_Anime/storyboards/prod/orchestrator/state.json")).toBeInTheDocument();
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
          artifacts: [],
          issues: []
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
  it("shows and adds app-local tags for selected production", () => {
    const onAddTag = vi.fn();
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
            tags: ["G2待ち"]
          },
          manualNote: "",
          scenes: [],
          artifacts: [],
          issues: []
        }}
        onAddTag={onAddTag}
      />
    );

    expect(screen.getByText("G2待ち")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("New tag"), { target: { value: "優先確認" } });
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));

    expect(onAddTag).toHaveBeenCalledWith("優先確認");
  });
  it("renders older detail payloads without scan issues as empty", () => {
    const legacyDetail = {
      production: {
        id: "story::legacy",
        storyName: "story",
        productionPath: "legacy",
        absolutePath: "D:\\legacy",
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
      manualNote: "",
      scenes: [],
      artifacts: []
    } as unknown as ProductionDetailPayload;

    render(<ProductionInsightPanel loading={false} detail={legacyDetail} />);

    expect(screen.getByText("No scan issues are recorded for this production.")).toBeInTheDocument();
  });});

