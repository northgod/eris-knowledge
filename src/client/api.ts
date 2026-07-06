import type { ArtifactRecord, ProductionSummary } from "../shared/types";

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

export async function runScan(): Promise<void> {
  const response = await fetch("/api/scans", { method: "POST" });
  if (!response.ok) throw new Error(`Failed to run scan: ${response.status}`);
}

export async function saveManualNote(targetType: string, targetId: string, note: string): Promise<void> {
  const response = await fetch("/api/manual/note", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetType, targetId, note })
  });
  if (!response.ok) throw new Error(`Failed to save note: ${response.status}`);
}
