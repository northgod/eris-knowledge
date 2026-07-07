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

const parsedButNoCutsProduction: ProductionSummary = {
  ...attentionProduction,
  id: "story::no-cuts",
  productionPath: "no-cuts",
  gates: { G0: "missing", G1: "detected", G2: "detected", G3: "detected", G4: "missing" },
  sceneCount: 2,
  cutCount: 0,
  storyboardSheetCount: 2,
  videoPromptCount: 2
};

const issueProduction: ProductionSummary = {
  ...attentionProduction,
  id: "story::scan-issue",
  productionPath: "scan-issue",
  gates: { G0: "missing", G1: "detected", G2: "detected", G3: "detected", G4: "detected" },
  sceneCount: 2,
  cutCount: 2,
  storyboardSheetCount: 2,
  videoPromptCount: 2,
  generatedVideoCount: 2,
  issueCount: 1
};

const completeProduction: ProductionSummary = {
  ...issueProduction,
  id: "story::complete",
  productionPath: "complete",
  issueCount: 0
};

describe("NeedsAttention", () => {
  it("selects a production from the attention list", () => {
    const onSelect = vi.fn();
    render(<NeedsAttention productions={[attentionProduction, looseProduction]} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Show details for story / needs-attention" }));

    expect(onSelect).toHaveBeenCalledWith("story::needs-attention");
    expect(screen.queryByText("story / loose")).not.toBeInTheDocument();
  });

  it("shows expanded attention reasons and hides complete productions", () => {
    render(
      <NeedsAttention
        productions={[parsedButNoCutsProduction, issueProduction, completeProduction]}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByText("story / no-cuts")).toBeInTheDocument();
    expect(screen.getByText("カット未解析")).toBeInTheDocument();
    expect(screen.getByText("生成動画未検出")).toBeInTheDocument();
    expect(screen.getByText("story / scan-issue")).toBeInTheDocument();
    expect(screen.getByText("スキャン問題")).toBeInTheDocument();
    expect(screen.queryByText("story / complete")).not.toBeInTheDocument();
  });
});
