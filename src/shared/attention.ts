import type { AttentionReason, NeedsAttentionItem, ProductionSummary } from "./types";

function reason(code: AttentionReason["code"], label: string): AttentionReason {
  return { code, label };
}

export function getAttentionReasons(production: ProductionSummary): AttentionReason[] {
  if (production.detectionType === "loose") return [];

  const reasons: AttentionReason[] = [];
  const hasTextStoryboard = production.gates.G1 === "detected";
  const hasStoryboard = production.gates.G2 === "detected" || production.storyboardSheetCount > 0;
  const hasVideoPrompt = production.gates.G3 === "detected" || production.videoPromptCount > 0;
  const hasGeneratedVideo = production.gates.G4 === "detected" || production.generatedVideoCount > 0;
  const hasDownstreamAssets = hasStoryboard || hasVideoPrompt || hasGeneratedVideo;

  if (!hasTextStoryboard && hasDownstreamAssets) {
    reasons.push(reason("text_storyboard_missing", "テキストコンテ未検出"));
  }

  if (hasTextStoryboard && !hasStoryboard) {
    reasons.push(reason("storyboard_missing", "絵コンテ未検出"));
  }

  if (hasTextStoryboard && !hasVideoPrompt) {
    reasons.push(reason("video_prompt_missing", "動画プロンプト未検出"));
  }

  if (hasTextStoryboard && production.sceneCount === 0) {
    reasons.push(reason("scene_parse_missing", "シーン未解析"));
  }

  if (production.sceneCount > 0 && production.cutCount === 0) {
    reasons.push(reason("cut_parse_missing", "カット未解析"));
  }

  if (production.sceneCount > 0 && production.videoPromptCount > 0 && production.videoPromptCount < production.sceneCount) {
    reasons.push(reason("prompt_coverage_low", "動画プロンプト不足"));
  }

  if (hasVideoPrompt && !hasGeneratedVideo) {
    reasons.push(reason("generated_video_missing", "生成動画未検出"));
  }

  if (production.issueCount > 0) {
    reasons.push(reason("scan_issues", "スキャン問題"));
  }

  return reasons;
}

export function toNeedsAttentionItem(production: ProductionSummary): NeedsAttentionItem | null {
  const attentionReasons = getAttentionReasons(production);
  return attentionReasons.length > 0 ? { ...production, attentionReasons } : null;
}

export function needsAttention(production: ProductionSummary): boolean {
  return getAttentionReasons(production).length > 0;
}
