import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/client/App";
import {
  addProductionTag,
  fetchAssetPreview,
  fetchAssets,
  fetchLatestScan,
  fetchProductionDetail,
  fetchProductions,
  runScan,
  saveManualNote,
  saveManualStatus
} from "../../src/client/api";
import type { ProductionDetailPayload, ProductionSummary, ScanRunRecord } from "../../src/shared/types";

vi.mock("../../src/client/api", () => ({
  addProductionTag: vi.fn(),
  fetchAssetPreview: vi.fn(),
  fetchAssets: vi.fn(),
  fetchLatestScan: vi.fn(),
  fetchProductionDetail: vi.fn(),
  fetchProductions: vi.fn(),
  runScan: vi.fn(),
  saveManualNote: vi.fn(),
  saveManualStatus: vi.fn()
}));

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

describe("App", () => {
  const selectedProduction = production();
  const latestScan: ScanRunRecord = {
    id: "scan-1",
    startedAt: "2026-07-06T09:00:00.000Z",
    finishedAt: "2026-07-06T09:00:03.000Z",
    rootPath: "D:\\Scarlet",
    status: "success",
    errorMessage: null
  };

  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    vi.mocked(fetchProductions).mockResolvedValue([selectedProduction]);
    vi.mocked(fetchAssets).mockResolvedValue([]);
    vi.mocked(fetchLatestScan).mockResolvedValue(latestScan);
    vi.mocked(fetchProductionDetail).mockResolvedValue({
      production: selectedProduction,
      manualNote: "",
      scenes: [],
      artifacts: [],
      issues: []
    } satisfies ProductionDetailPayload);
    vi.mocked(fetchAssetPreview).mockReset();
    vi.mocked(runScan).mockReset();
    vi.mocked(runScan).mockResolvedValue(latestScan);
    vi.mocked(saveManualNote).mockReset();
    vi.mocked(saveManualStatus).mockReset();
    vi.mocked(addProductionTag).mockReset();
  });

  it("shows the latest scan state in the top bar", async () => {
    render(<App />);

    const scanStatus = await screen.findByLabelText("Latest scan");

    expect(scanStatus).toHaveTextContent("success");
    expect(scanStatus).toHaveTextContent("D:\\Scarlet");
  });

  it("opens selected production on a detail screen and returns to the dashboard", async () => {
    const { container } = render(<App />);

    expect(await screen.findByRole("region", { name: "Dashboard" })).toBeInTheDocument();
    const productionSection = container.querySelector(".production-section");
    expect(productionSection).not.toBeNull();
    fireEvent.click(within(productionSection as HTMLElement).getByRole("button", { name: "Show details for story / prod" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/productions/story%3A%3Aprod");
    });
    expect(screen.queryByRole("region", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Dashboard" })).toBeInTheDocument();
    expect(await screen.findByText("Selected Production")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to Dashboard" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
    expect(await screen.findByRole("region", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Productions" })).toBeInTheDocument();
  });
});
