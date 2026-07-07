import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/client/App";
import {
  addProductionTag,
  fetchAssetPreview,
  fetchAssets,
  fetchLatestScan,
  fetchScanRuns,
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
  fetchScanRuns: vi.fn(),
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
  const failedScan: ScanRunRecord = {
    id: "scan-2",
    startedAt: "2026-07-07T09:00:00.000Z",
    finishedAt: "2026-07-07T09:00:01.000Z",
    rootPath: "D:\\Scarlet",
    status: "error",
    errorMessage: "Root not found"
  };

  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    vi.mocked(fetchProductions).mockResolvedValue([selectedProduction]);
    vi.mocked(fetchAssets).mockResolvedValue([]);
    vi.mocked(fetchLatestScan).mockResolvedValue(latestScan);
    vi.mocked(fetchScanRuns).mockResolvedValue([latestScan]);
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

  it("opens scan history and returns to the dashboard", async () => {
    vi.mocked(fetchScanRuns).mockResolvedValue([failedScan, latestScan]);

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Show scan history" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/scans");
    });
    const history = await screen.findByRole("region", { name: "Scan History" });
    expect(within(history).getByText("スキャン履歴")).toBeInTheDocument();
    expect(within(history).getByText("error")).toBeInTheDocument();
    expect(within(history).getByText("Root not found")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Dashboard" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to Dashboard" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/");
    });
    expect(await screen.findByRole("region", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("updates the latest scan status when a scan request fails", async () => {
    vi.mocked(runScan).mockRejectedValue(Object.assign(new Error("Failed to run scan: 500"), { scan: failedScan }));

    render(<App />);

    expect(await screen.findByLabelText("Latest scan")).toHaveTextContent("success");
    fireEvent.click(screen.getByRole("button", { name: "Run scan" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Latest scan")).toHaveTextContent("error");
    });
    expect(screen.getByLabelText("Latest scan")).toHaveTextContent("Root not found");
    expect(screen.getByText("Failed to run scan: 500")).toBeInTheDocument();
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
