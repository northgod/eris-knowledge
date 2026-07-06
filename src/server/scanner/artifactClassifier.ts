import path from "node:path";
import type { ArtifactKind, GateId } from "../../shared/types";

export interface ArtifactClassification {
  kind: ArtifactKind;
  gate: GateId | null;
}

export function classifyArtifact(relativePath: string): ArtifactClassification {
  const normalized = relativePath.replaceAll("\\", "/");
  const file = path.posix.basename(normalized);
  const ext = path.posix.extname(normalized).toLowerCase();

  if (file === "00_制作ブリーフ.md") return { kind: "brief", gate: "G0" };
  if (file === "01_脚本.md") return { kind: "script", gate: "G1" };
  if (file === "02_テキストコンテ.md" || file.endsWith("_text_storyboard.md")) {
    return { kind: "text_storyboard", gate: "G1" };
  }
  if (file === "03_絵コンテ作成リファレンス.md") {
    return { kind: "storyboard_reference", gate: "G2" };
  }
  if (normalized.includes("/storyboard_sheets/")) return { kind: "storyboard_sheet", gate: "G2" };
  if (file.startsWith("stage_sketch_")) return { kind: "stage_sketch", gate: "G2" };
  if (normalized.includes("/video_prompts/") || file.endsWith("_video_prompt.md")) {
    return { kind: "video_prompt", gate: "G3" };
  }
  if (normalized.includes("/generated_videos/")) return { kind: "generated_video", gate: "G4" };
  if (normalized.includes("/codex_tasks/") && ext === ".json") return { kind: "codex_task", gate: null };
  if (normalized.includes("/approvals/") && ext === ".md") return { kind: "approval", gate: null };
  if (normalized.includes("/orchestrator/") && ext === ".json") return { kind: "orchestrator_state", gate: null };
  if (ext === ".md") return { kind: "markdown", gate: null };
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return { kind: "image", gate: null };
  if ([".mp4", ".mov", ".webm", ".mkv"].includes(ext)) return { kind: "video", gate: null };
  if (ext === ".json") return { kind: "json", gate: null };
  return { kind: "unknown", gate: null };
}
