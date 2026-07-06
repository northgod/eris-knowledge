import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dashboard } from "../../src/client/components/Dashboard";
import type { ProductionSummary } from "../../src/shared/types";

function production(overrides: Partial<ProductionSummary> = {}): ProductionSummary {
  return {
    id: "story::prod",
    storyName: "story",
    productionPath: "prod",
    absolutePath: "D:\\prod",
    detectionType: "manual",
    gates: { G0: "missing", G1: "detected", G2: "missing", G3: "missing", G4: "missing" },
    sceneCount: 1,
    cutCount: 2,
    storyboardSheetCount: 0,
    videoPromptCount: 0,
    generatedVideoCount: 0,
    approvalCount: 0,
    issueCount: 0,
    lastContentMtime: null,
    checked: false,
    tags: [],
    ...overrides
  };
}

describe("Dashboard", () => {
  it("shows production counts and attention count", () => {
    render(<Dashboard productions={[production()]} />);

    expect(screen.getByText("Productions")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getByText("Needs Attention")).toBeInTheDocument();
  });
});
