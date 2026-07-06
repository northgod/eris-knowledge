import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductionDetail } from "../../src/client/components/ProductionDetail";

describe("ProductionDetail", () => {
  it("shows read-only path and gate states", () => {
    render(
      <ProductionDetail
        production={{
          id: "story::prod",
          storyName: "story",
          productionPath: "prod",
          absolutePath: "D:\\prod",
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
        }}
      />
    );

    expect(screen.getByText("story / prod")).toBeInTheDocument();
    expect(screen.getByText("Read-only source")).toBeInTheDocument();
    expect(screen.getByText("G1")).toBeInTheDocument();
    expect(screen.getByText("detected")).toBeInTheDocument();
  });

  it("shows a compact progress summary for list scanning", () => {
    render(
      <ProductionDetail
        production={{
          id: "story::prod",
          storyName: "story",
          productionPath: "prod",
          absolutePath: "D:\\prod",
          detectionType: "manual",
          gates: { G0: "detected", G1: "detected", G2: "missing", G3: "partial", G4: "approved" },
          sceneCount: 3,
          cutCount: 9,
          storyboardSheetCount: 2,
          videoPromptCount: 1,
          generatedVideoCount: 0,
          approvalCount: 1,
          issueCount: 2,
          lastContentMtime: "2026-07-05T12:34:56.000Z",
          checked: true,
          tags: ["確認済み"]
        }}
      />
    );

    expect(screen.getByText("Updated 2026-07-05")).toBeInTheDocument();
    expect(screen.getByText("Needs G2, G3")).toBeInTheDocument();
    expect(screen.getByText("2 issues")).toBeInTheDocument();
    expect(screen.getByText("checked")).toBeInTheDocument();
    expect(screen.getByText("確認済み")).toBeInTheDocument();
  });
});
