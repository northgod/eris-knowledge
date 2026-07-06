import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NeedsAttention } from "../../src/client/components/NeedsAttention";
import type { ProductionSummary } from "../../src/shared/types";

const attentionProduction: ProductionSummary = {
  id: "story::needs-attention",
  storyName: "story",
  productionPath: "needs-attention",
  absolutePath: "D:\\story\\needs-attention",
  detectionType: "manual",
  gates: { G0: "missing", G1: "detected", G2: "missing", G3: "missing", G4: "missing" },
  sceneCount: 3,
  cutCount: 9,
  storyboardSheetCount: 0,
  videoPromptCount: 0,
  generatedVideoCount: 0,
  approvalCount: 0,
  issueCount: 0,
  lastContentMtime: null,
  checked: false,
  tags: []
};

const looseProduction: ProductionSummary = {
  ...attentionProduction,
  id: "story::loose",
  productionPath: "loose",
  detectionType: "loose"
};

describe("NeedsAttention", () => {
  it("selects a production from the attention list", () => {
    const onSelect = vi.fn();
    render(<NeedsAttention productions={[attentionProduction, looseProduction]} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Show details for story / needs-attention" }));

    expect(onSelect).toHaveBeenCalledWith("story::needs-attention");
    expect(screen.queryByText("story / loose")).not.toBeInTheDocument();
  });
});
