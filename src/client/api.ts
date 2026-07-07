import type {
  ArtifactRecord,
  AssetPreviewPayload,
  ProductionDetailPayload,
  ProductionSummary,
  ScanRunRecord
} from "../shared/types";

export class ScanRequestError extends Error {
  scan: ScanRunRecord | null;

  constructor(message: string, scan: ScanRunRecord | null) {
    super(message);
    this.name = "ScanRequestError";
    this.scan = scan;
  }
}

export async function fetchProductions(): Promise<ProductionSummary[]> {
  const response = await fetch("/api/productions");
  if (!response.ok) throw new Error(`Failed to fetch productions: ${response.status}`);
  const data = (await response.json()) as { productions: ProductionSummary[] };
  return data.productions;
}

export async function fetchAssets(): Promise<ArtifactRecord[]> {
  const response = await fetch("/api/assets");
  if (!response.ok) throw new Error(`Failed to fetch assets: ${response.status}`);
  const data = (await response.json()) as { assets: ArtifactRecord[] };
  return data.assets;
}

export async function fetchAssetPreview(assetId: string): Promise<AssetPreviewPayload> {
  const response = await fetch(`/api/assets/${encodeURIComponent(assetId)}/preview`);
  if (!response.ok) throw new Error(`Failed to fetch asset preview: ${response.status}`);
  const data = (await response.json()) as { preview: AssetPreviewPayload };
  return data.preview;
}

export async function fetchProductionDetail(productionId: string): Promise<ProductionDetailPayload> {
  const response = await fetch(`/api/productions/${encodeURIComponent(productionId)}`);
  if (!response.ok) throw new Error(`Failed to fetch production detail: ${response.status}`);
  const data = (await response.json()) as { detail: ProductionDetailPayload };
  return data.detail;
}

export async function fetchLatestScan(): Promise<ScanRunRecord | null> {
  const response = await fetch("/api/scans/latest");
  if (!response.ok) throw new Error(`Failed to fetch latest scan: ${response.status}`);
  const data = (await response.json()) as { scan: ScanRunRecord | null };
  return data.scan ?? null;
}

export async function fetchScanRuns(): Promise<ScanRunRecord[]> {
  const response = await fetch("/api/scans");
  if (!response.ok) throw new Error(`Failed to fetch scan runs: ${response.status}`);
  const data = (await response.json()) as { scans: ScanRunRecord[] };
  return data.scans;
}

export async function runScan(): Promise<ScanRunRecord | null> {
  const response = await fetch("/api/scans", { method: "POST" });
  const data = (await response.json()) as { scan?: ScanRunRecord | null; error?: string };
  if (!response.ok) {
    throw new ScanRequestError(`Failed to run scan: ${response.status}`, data.scan ?? null);
  }
  return data.scan ?? null;
}

export async function saveManualNote(targetType: string, targetId: string, note: string): Promise<void> {
  const response = await fetch("/api/manual/note", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetType, targetId, note })
  });
  if (!response.ok) throw new Error(`Failed to save note: ${response.status}`);
}

export async function saveManualStatus(targetType: string, targetId: string, checked: boolean): Promise<void> {
  const response = await fetch("/api/manual/status", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetType,
      targetId,
      status: checked ? "checked" : "open",
      checked
    })
  });
  if (!response.ok) throw new Error(`Failed to save status: ${response.status}`);
}

export async function createTag(name: string, color = "#315c6f"): Promise<string> {
  const response = await fetch("/api/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color })
  });
  if (!response.ok) throw new Error(`Failed to create tag: ${response.status}`);
  const data = (await response.json()) as { id: string };
  return data.id;
}

export async function tagTarget(tagId: string, targetType: string, targetId: string): Promise<void> {
  const response = await fetch("/api/taggings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tagId, targetType, targetId })
  });
  if (!response.ok) throw new Error(`Failed to tag target: ${response.status}`);
}

export async function addProductionTag(productionId: string, name: string): Promise<void> {
  const tagName = name.trim();
  if (!tagName) return;
  const tagId = await createTag(tagName);
  await tagTarget(tagId, "production", productionId);
}

