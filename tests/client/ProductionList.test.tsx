import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductionList } from "../../src/client/components/ProductionList";
import type { ProductionSummary } from "../../src/shared/types";

const production: ProductionSummary = {
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
};

describe("ProductionList", () => {
  it("selects a production from its detail button", () => {
    const onSelect = vi.fn();
    render(<ProductionList productions={[production]} selectedProductionId={null} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Show details for story / prod" }));

    expect(onSelect).toHaveBeenCalledWith("story::prod");
  });
});
