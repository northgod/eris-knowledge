import path from "node:path";
import type { DetectionType } from "../../shared/types";
import { shouldIgnoreArtifact } from "./artifactClassifier";
import { walkFiles } from "./fileWalker";

export interface DetectedProduction {
  id: string;
  storyName: string;
  productionPath: string;
  absolutePath: string;
  detectionType: DetectionType;
  files: string[];
}

interface ProductionPathParts {
  storyName: string;
  productionPath: string;
  productionRootRelative: string;
}

function normalizeSeparators(value: string): string {
  return value.split(path.sep).join("/");
}

function productionRootFor(relativePath: string): ProductionPathParts | null {
  const normalized = normalizeSeparators(relativePath);
  const parts = normalized.split("/");
  const storyboardsIndex = parts.findIndex(
    (part, index) => part === "storyboards" && parts[index - 1] === "02_Anime"
  );
  if (storyboardsIndex < 2) return null;

  const storyName = parts[storyboardsIndex - 2];
  const productionStart = storyboardsIndex + 1;
  const markerIndex = parts.findIndex((part) =>
    [
      "codex_tasks",
      "approvals",
      "orchestrator",
      "storyboard_sheets",
      "video_prompts",
      "generated_videos"
    ].includes(part)
  );
  let productionEnd = -1;
  if (markerIndex > productionStart) productionEnd = markerIndex;

  const file = parts.at(-1) ?? "";
  const isRootArtifact =
    file === "00_制作ブリーフ.md" ||
    file === "01_脚本.md" ||
    file === "02_テキストコンテ.md" ||
    file.endsWith("_text_storyboard.md") ||
    file.endsWith("_cut_storyboard.md") ||
    file.endsWith("_video_prompt.md") ||
    file.includes("_video_prompts");
  if (productionEnd === -1 && isRootArtifact) productionEnd = parts.length - 1;

  if (productionEnd <= productionStart) return null;
  const productionParts = parts.slice(productionStart, productionEnd);

  return {
    storyName,
    productionPath: productionParts.join("/"),
    productionRootRelative: parts.slice(0, productionEnd).join("/")
  };
}

function detectType(files: string[]): DetectionType {
  const hasOrchestration = files.some(
    (file) => file.includes("/codex_tasks/") || file.includes("/orchestrator/")
  );
  const hasManual = files.some(
    (file) =>
      file.endsWith("02_テキストコンテ.md") ||
      file.includes("/storyboard_sheets/") ||
      file.includes("/video_prompts/") ||
      file.includes("_video_prompts")
  );
  if (hasOrchestration && hasManual) return "mixed";
  if (hasOrchestration) return "orchestrated";
  if (hasManual) return "manual";
  return "loose";
}

export async function detectProductions(root: string): Promise<DetectedProduction[]> {
  const files = await walkFiles(root);
  const byProduction = new Map<
    string,
    { storyName: string; productionPath: string; productionRootRelative: string; files: string[] }
  >();

  for (const file of files) {
    const normalizedFile = normalizeSeparators(file.relativePath);
    if (shouldIgnoreArtifact(normalizedFile)) continue;

    const parsed = productionRootFor(normalizedFile);
    if (!parsed) continue;
    const productionId = `${parsed.storyName}::${parsed.productionPath}`;
    const existing = byProduction.get(productionId) ?? { ...parsed, files: [] };
    existing.files.push(normalizedFile);
    byProduction.set(productionId, existing);
  }

  return Array.from(byProduction.entries())
    .map(([id, production]) => ({
      id,
      storyName: production.storyName,
      productionPath: production.productionPath,
      absolutePath: path.join(root, ...production.productionRootRelative.split("/")),
      detectionType: detectType(production.files),
      files: production.files.sort()
    }))
    .sort((a, b) => a.id.localeCompare(b.id, "ja"));
}
