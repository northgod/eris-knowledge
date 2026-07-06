import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProductionList } from "../../src/client/components/ProductionList";
import type { DetectionType, ProductionSummary } from "../../src/shared/types";

function makeProduction(overrides: Partial<ProductionSummary> = {}): ProductionSummary {
  const id = overrides.id ?? "story::prod";
  const storyName = overrides.storyName ?? "story";
  const productionPath = overrides.productionPath ?? "prod";
  return {
    id,
    storyName,
    productionPath,
    absolutePath: overrides.absolutePath ?? `D:\\prod\\${productionPath}`,
    detectionType: (overrides.detectionType ?? "manual") as DetectionType,
    gates: overrides.gates ?? { G0: "missing", G1: "detected", G2: "missing", G3: "missing", G4: "missing" },
    sceneCount: overrides.sceneCount ?? 1,
    cutCount: overrides.cutCount ?? 1,
    storyboardSheetCount: overrides.storyboardSheetCount ?? 0,
    videoPromptCount: overrides.videoPromptCount ?? 0,
    generatedVideoCount: overrides.generatedVideoCount ?? 0,
    approvalCount: overrides.approvalCount ?? 0,
    issueCount: overrides.issueCount ?? 0,
    lastContentMtime: overrides.lastContentMtime ?? null,
    checked: overrides.checked ?? false,
    tags: overrides.tags ?? []
  };
}

const production = makeProduction();

const filterProductions: ProductionSummary[] = [
  makeProduction({
    id: "story-a::EP1",
    storyName: "story-a",
    productionPath: "EP1",
    detectionType: "mixed",
    tags: ["urgent"],
    checked: false,
    gates: { G0: "detected", G1: "detected", G2: "missing", G3: "missing", G4: "missing" }
  }),
  makeProduction({
    id: "story-a::EP2",
    storyName: "story-a",
    productionPath: "EP2",
    detectionType: "mixed",
    tags: ["urgent"],
    checked: false,
    gates: { G0: "detected", G1: "detected", G2: "detected", G3: "missing", G4: "missing" }
  }),
  makeProduction({
    id: "story-b::EP1",
    storyName: "story-b",
    productionPath: "EP1",
    detectionType: "manual",
    tags: ["reviewed"],
    checked: true,
    gates: { G0: "detected", G1: "detected", G2: "missing", G3: "missing", G4: "missing" }
  })
];
const progressFilterProductions: ProductionSummary[] = [
  makeProduction({
    id: "story::complete-recent",
    storyName: "story",
    productionPath: "complete-recent",
    lastContentMtime: "2026-07-05T00:00:00.000Z",
    gates: { G0: "detected", G1: "detected", G2: "detected", G3: "detected", G4: "detected" }
  }),
  makeProduction({
    id: "story::missing-recent",
    storyName: "story",
    productionPath: "missing-recent",
    lastContentMtime: "2026-07-04T00:00:00.000Z",
    gates: { G0: "detected", G1: "detected", G2: "missing", G3: "detected", G4: "detected" }
  }),
  makeProduction({
    id: "story::missing-old",
    storyName: "story",
    productionPath: "missing-old",
    lastContentMtime: "2026-06-01T00:00:00.000Z",
    gates: { G0: "detected", G1: "detected", G2: "missing", G3: "detected", G4: "detected" }
  })
];

describe("ProductionList", () => {
  it("selects a production from its detail button", () => {
    const onSelect = vi.fn();
    render(<ProductionList productions={[production]} selectedProductionId={null} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "Show details for story / prod" }));

    expect(onSelect).toHaveBeenCalledWith("story::prod");
  });

  it("filters productions by story, detection type, gate status, tag, unchecked state, and search text", () => {
    render(<ProductionList productions={filterProductions} />);

    fireEvent.change(screen.getByLabelText("Filter productions by story"), { target: { value: "story-a" } });
    fireEvent.change(screen.getByLabelText("Filter productions by detection type"), { target: { value: "mixed" } });
    fireEvent.change(screen.getByLabelText("Filter productions by gate status"), { target: { value: "G2:missing" } });
    fireEvent.change(screen.getByLabelText("Filter productions by tag"), { target: { value: "urgent" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Show unchecked only" }));
    fireEvent.change(screen.getByLabelText("Search productions"), { target: { value: "EP1" } });

    expect(screen.getByText("Showing 1 of 3 productions")).toBeInTheDocument();
    expect(screen.getByText("story-a / EP1")).toBeInTheDocument();
    expect(screen.queryByText("story-a / EP2")).not.toBeInTheDocument();
    expect(screen.queryByText("story-b / EP1")).not.toBeInTheDocument();
  });
  it("filters productions by missing gates and recently updated state", () => {
    render(<ProductionList productions={progressFilterProductions} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Show productions with missing gates only" }));

    expect(screen.getByText("Showing 2 of 3 productions")).toBeInTheDocument();
    expect(screen.queryByText("story / complete-recent")).not.toBeInTheDocument();
    expect(screen.getByText("story / missing-recent")).toBeInTheDocument();
    expect(screen.getByText("story / missing-old")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Show recently updated only" }));

    expect(screen.getByText("Showing 1 of 3 productions")).toBeInTheDocument();
    expect(screen.getByText("story / missing-recent")).toBeInTheDocument();
    expect(screen.queryByText("story / missing-old")).not.toBeInTheDocument();
  });
});
