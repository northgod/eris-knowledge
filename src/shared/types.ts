export type DetectionType = "orchestrated" | "manual" | "mixed" | "loose";
export type GateId = "G0" | "G1" | "G2" | "G3" | "G4";
export type GateStatus =
  | "missing"
  | "detected"
  | "partial"
  | "complete"
  | "approved"
  | "manual_override";

export type ArtifactKind =
  | "brief"
  | "script"
  | "text_storyboard"
  | "storyboard_reference"
  | "storyboard_sheet"
  | "stage_sketch"
  | "video_prompt"
  | "generated_video"
  | "codex_task"
  | "approval"
  | "orchestrator_state"
  | "markdown"
  | "json"
  | "image"
  | "video"
  | "unknown";

export interface AppConfig {
  scarletRoot: string;
  databasePath: string;
  port: number;
}

export interface ProductionSummary {
  id: string;
  storyName: string;
  productionPath: string;
  absolutePath: string;
  detectionType: DetectionType;
  gates: Record<GateId, GateStatus>;
  sceneCount: number;
  cutCount: number;
  storyboardSheetCount: number;
  videoPromptCount: number;
  generatedVideoCount: number;
  approvalCount: number;
  issueCount: number;
  lastContentMtime: string | null;
  checked: boolean;
  tags: string[];
}

export type ScanRunStatus = "running" | "success" | "error";

export interface ScanRunRecord {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  rootPath: string;
  status: ScanRunStatus;
  errorMessage: string | null;
}

export type AttentionReasonCode =
  | "text_storyboard_missing"
  | "storyboard_missing"
  | "video_prompt_missing"
  | "scene_parse_missing"
  | "cut_parse_missing"
  | "prompt_coverage_low"
  | "generated_video_missing"
  | "scan_issues";

export interface AttentionReason {
  code: AttentionReasonCode;
  label: string;
}

export interface NeedsAttentionItem extends ProductionSummary {
  attentionReasons: AttentionReason[];
}

export interface ArtifactRecord {
  id: string;
  productionId: string;
  kind: ArtifactKind;
  gate: GateId | null;
  relativePath: string;
  absolutePath: string;
  extension: string;
  sizeBytes: number;
  mtime: string;
  contentHash: string | null;
}

export type AssetPreviewMode = "text" | "metadata";

export interface AssetPreviewPayload {
  id: string;
  relativePath: string;
  absolutePath: string;
  kind: ArtifactKind;
  mode: AssetPreviewMode;
  text: string | null;
  truncated: boolean;
  sizeBytes: number;
  mtime: string;
}

export interface SceneRecord {
  id: string;
  productionId: string;
  sourceArtifactId: string;
  sceneKey: string;
  title: string;
  timeRange: string | null;
  durationSeconds: number | null;
  summary: string | null;
  details: string | null;
  lineNumber: number;
}

export interface CutRecord {
  id: string;
  sceneId: string;
  cutKey: string;
  timeRange: string | null;
  durationSeconds: number | null;
  cameraLabel: string | null;
  summary: string | null;
  dialogue: string | null;
  details: string | null;
  lineNumber: number;
}

export interface SceneWithCuts extends SceneRecord {
  cuts: CutRecord[];
}

export interface ScanIssueRecord {
  id: string;
  scanRunId: string | null;
  severity: string;
  relativePath: string;
  issueCode: string;
  message: string;
}

export interface OrchestratorTaskRecord {
  id: string;
  productionId: string;
  artifactId: string;
  runId: string | null;
  gateId: GateId | null;
  taskId: string | null;
  title: string | null;
  status: string | null;
  expectedOutputs: string[];
  contextPaths: string[];
  createdAt: string | null;
}

export interface ApprovalRecord {
  id: string;
  productionId: string;
  artifactId: string;
  gateId: GateId | null;
  approvalId: string | null;
  status: string | null;
  decision: string | null;
  actor: string | null;
  decidedAt: string | null;
}

export interface ProductionDetailPayload {
  production: ProductionSummary;
  scenes: SceneWithCuts[];
  artifacts: ArtifactRecord[];
  manualNote: string | null;
  issues: ScanIssueRecord[];
  orchestratorTasks?: OrchestratorTaskRecord[];
  approvals?: ApprovalRecord[];
}

