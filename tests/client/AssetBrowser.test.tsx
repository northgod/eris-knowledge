import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssetBrowser } from "../../src/client/components/AssetBrowser";
import type { ArtifactRecord } from "../../src/shared/types";

const assets: ArtifactRecord[] = [
  {
    id: "asset-1",
    productionId: "story::EP2/01b",
    kind: "storyboard_sheet",
    gate: "G2",
    relativePath: "stories/story/02_Anime/storyboards/EP2/01b/storyboard_sheets/sheet_001.png",
    absolutePath: "D:\\story\\sheet_001.png",
    extension: ".png",
    sizeBytes: 200,
    mtime: "2026-07-06T00:00:00.000Z",
    contentHash: null
  },
  {
    id: "asset-2",
    productionId: "story::EP2/01b",
    kind: "video_prompt",
    gate: "G3",
    relativePath: "stories/story/02_Anime/storyboards/EP2/01b/video_prompts/cut_001.md",
    absolutePath: "D:\\story\\cut_001.md",
    extension: ".md",
    sizeBytes: 120,
    mtime: "2026-07-06T00:00:00.000Z",
    contentHash: null
  },
  {
    id: "asset-3",
    productionId: "story::EP2/02",
    kind: "text_storyboard",
    gate: "G1",
    relativePath: "stories/story/02_Anime/storyboards/EP2/02/text_storyboard.md",
    absolutePath: "D:\\story\\text_storyboard.md",
    extension: ".md",
    sizeBytes: 90,
    mtime: "2026-07-06T00:00:00.000Z",
    contentHash: null
  }
];

describe("AssetBrowser", () => {
  it("filters assets by production, kind, gate, and search text", () => {
    render(<AssetBrowser assets={assets} />);

    fireEvent.change(screen.getByLabelText("Production"), { target: { value: "story::EP2/01b" } });
    fireEvent.change(screen.getByLabelText("Kind"), { target: { value: "video_prompt" } });
    fireEvent.change(screen.getByLabelText("Gate"), { target: { value: "G3" } });
    fireEvent.change(screen.getByPlaceholderText("Search assets"), { target: { value: "cut_001" } });

    expect(screen.getByText("Showing 1 of 3 assets")).toBeInTheDocument();

    const table = within(screen.getByRole("table"));
    expect(table.getByText("video_prompt")).toBeInTheDocument();
    expect(table.getByText("stories/story/02_Anime/storyboards/EP2/01b/video_prompts/cut_001.md")).toBeInTheDocument();
    expect(table.queryByText("storyboard_sheet")).not.toBeInTheDocument();
    expect(table.queryByText("text_storyboard")).not.toBeInTheDocument();

    const rows = table.getAllByRole("row");
    expect(rows).toHaveLength(2);
  });
});

