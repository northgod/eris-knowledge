import { AlertTriangle, Eye, FileText, Image, ListChecks, ListTree, Save, Tag, Video } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { ArtifactRecord, AssetPreviewPayload, CutRecord, GateId, ProductionDetailPayload, SceneWithCuts } from "../../shared/types";

interface ProductionInsightPanelProps {
  detail: ProductionDetailPayload | null;
  loading: boolean;
  onSaveNote?: (note: string) => void | Promise<void>;
  onToggleChecked?: (checked: boolean) => void | Promise<void>;
  onAddTag?: (name: string) => void | Promise<void>;
  selectedPreview?: AssetPreviewPayload | null;
  previewLoading?: boolean;
  onPreviewAsset?: (assetId: string) => void | Promise<void>;
}

const gateIds: GateId[] = ["G0", "G1", "G2", "G3", "G4"];

function assetFileUrl(assetId: string): string {
  return `/api/assets/${encodeURIComponent(assetId)}/file`;
}

function normalizeAssetKey(value: string): string {
  return value.replace(/\\/g, "/").toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sceneNumberVariants(scene: SceneWithCuts): string[] {
  const key = scene.sceneKey.toLowerCase();
  const unpadded = key.replace(/^0+/, "") || key;
  const twoDigit = unpadded.padStart(2, "0");
  const threeDigit = unpadded.padStart(3, "0");
  return Array.from(new Set([key, twoDigit, threeDigit, unpadded]));
}

function sceneAssetPattern(scene: SceneWithCuts): RegExp {
  const variants = sceneNumberVariants(scene).map(escapeRegExp).join("|");
  return new RegExp(
    `(?:scene|シーン|cut(?:[_-]sheet)?|カット|sheet|storyboard(?:[_-]sheet)?)[_-]?(?:${variants})(?=\\D|$)`,
    "i"
  );
}

function assetMatchesScene(asset: ArtifactRecord, scene: SceneWithCuts): boolean {
  const normalizedPath = normalizeAssetKey(asset.relativePath);
  const fileName = normalizedPath.split("/").at(-1) ?? normalizedPath;
  return sceneAssetPattern(scene).test(fileName);
}

function uniqueAssets(assets: Array<ArtifactRecord | undefined>): ArtifactRecord[] {
  const seen = new Set<string>();
  return assets.filter((asset): asset is ArtifactRecord => {
    if (!asset || seen.has(asset.id)) return false;
    seen.add(asset.id);
    return true;
  });
}

function isStoryboardImage(asset: ArtifactRecord): boolean {
  return asset.kind === "storyboard_sheet"
    && [".png", ".jpg", ".jpeg", ".webp"].includes(asset.extension.toLowerCase());
}

function isTextBoardAsset(asset: ArtifactRecord): boolean {
  return ["text_storyboard", "markdown", "video_prompt"].includes(asset.kind) && asset.extension.toLowerCase() === ".md";
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null;
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)}秒`;
}

interface DetailRow {
  label: string;
  value: ReactNode;
}

interface ReferenceItem {
  title: string;
  value: string;
  asset: ArtifactRecord | null;
}

interface ReferenceGroup {
  name: string;
  items: ReferenceItem[];
}

interface SceneDisplaySections {
  infoRows: DetailRow[];
  referenceGroups: ReferenceGroup[];
  stageSketches: ReferenceItem[];
}

function splitDetailLines(details: string | null): string[] {
  return (details ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseAttributeLine(line: string): { label: string; value: string } | null {
  const match = line.match(/^([^:：]+)[:：]\s*(.*)$/);
  if (!match) return null;
  return {
    label: match[1].trim(),
    value: match[2].trim()
  };
}

function isReferenceHeading(label: string): boolean {
  return label === "参照ロール" || label.toLowerCase() === "references";
}

function isReferenceGroupHeading(label: string): boolean {
  return /_reference$/i.test(label);
}

function isStageSketchHeading(label: string): boolean {
  return label.toLowerCase() === "stage_sketch";
}

function isCutPlanHeading(label: string): boolean {
  return label.toLowerCase() === "cut plan" || label === "カットプラン";
}

function normalizeReferenceValue(value: string): string {
  return normalizeAssetKey(value).replace(/^["'`]+|["'`]+$/g, "");
}

function looksLikeReferenceValue(value: string): boolean {
  const normalized = normalizeReferenceValue(value);
  return /\.(?:png|jpe?g|webp)$/i.test(normalized);
}

function assetMatchesReference(asset: ArtifactRecord, referenceValue: string): boolean {
  const normalizedReference = normalizeReferenceValue(referenceValue);
  if (!normalizedReference) return false;
  const normalizedPath = normalizeAssetKey(asset.relativePath);
  return normalizedPath.endsWith(normalizedReference) || normalizedPath.includes(`/${normalizedReference}`);
}

function findReferenceAsset(value: string, assets: ArtifactRecord[]): ArtifactRecord | null {
  return assets.find((asset) =>
    [".png", ".jpg", ".jpeg", ".webp"].includes(asset.extension.toLowerCase())
    && assetMatchesReference(asset, value)
  ) ?? null;
}

function appendReferenceItem(
  groups: ReferenceGroup[],
  groupName: string,
  item: { title: string; value: string },
  assets: ArtifactRecord[]
) {
  const name = groupName || "reference";
  let group = groups.find((candidate) => candidate.name === name);
  if (!group) {
    group = { name, items: [] };
    groups.push(group);
  }
  group.items.push({
    ...item,
    asset: findReferenceAsset(item.value, assets)
  });
}

function referenceItem(item: { title: string; value: string }, assets: ArtifactRecord[]): ReferenceItem {
  return {
    ...item,
    asset: findReferenceAsset(item.value, assets)
  };
}

function sceneDisplaySections(scene: SceneWithCuts, assets: ArtifactRecord[]): SceneDisplaySections {
  const rows: DetailRow[] = [];
  const references: ReferenceGroup[] = [];
  const stageSketches: ReferenceItem[] = [];
  let currentReferenceGroup = "";
  let inReferences = false;
  let inCutPlan = false;
  let contentFromDetails: string | null = null;

  for (const line of splitDetailLines(scene.details)) {
    const attribute = parseAttributeLine(line);
    if (!attribute) {
      if (!inReferences && !inCutPlan) rows.push({ label: "詳細", value: line });
      continue;
    }

    const normalizedLabel = attribute.label.toLowerCase();
    if (isReferenceHeading(attribute.label)) {
      inReferences = true;
      inCutPlan = false;
      currentReferenceGroup = "";
      if (attribute.value) appendReferenceItem(references, "reference", { title: attribute.label, value: attribute.value }, assets);
      continue;
    }
    if (isCutPlanHeading(attribute.label)) {
      inCutPlan = true;
      inReferences = false;
      currentReferenceGroup = "";
      continue;
    }

    if (isStageSketchHeading(attribute.label)) {
      currentReferenceGroup = "stage_sketch";
      if (attribute.value) {
        stageSketches.push(referenceItem({ title: attribute.label, value: attribute.value }, assets));
      }
      continue;
    }

    if (inReferences) {
      if (currentReferenceGroup === "stage_sketch" && looksLikeReferenceValue(attribute.value)) {
        stageSketches.push(referenceItem({
          title: attribute.label,
          value: attribute.value
        }, assets));
        continue;
      }
      if (isReferenceGroupHeading(attribute.label)) {
        currentReferenceGroup = attribute.label;
        if (attribute.value) {
          appendReferenceItem(references, currentReferenceGroup, { title: attribute.label, value: attribute.value }, assets);
        }
        continue;
      }
      if (currentReferenceGroup && looksLikeReferenceValue(attribute.value)) {
        appendReferenceItem(references, currentReferenceGroup, {
          title: attribute.label,
          value: attribute.value
        }, assets);
        continue;
      }
      if (!currentReferenceGroup && looksLikeReferenceValue(attribute.value)) {
        appendReferenceItem(references, "reference", {
          title: attribute.label,
          value: attribute.value
        }, assets);
        continue;
      } else {
        inReferences = false;
        currentReferenceGroup = "";
      }
    }

    if (inCutPlan) continue;
    if (normalizedLabel === "時間" || normalizedLabel === "time") continue;
    if (normalizedLabel === "ソース行" || normalizedLabel === "line") continue;
    if (normalizedLabel === "内容" || normalizedLabel === "summary") {
      contentFromDetails = attribute.value;
      continue;
    }

    rows.push({ label: attribute.label, value: attribute.value });
  }

  const content = scene.summary ?? contentFromDetails;
  return {
    infoRows: [
      ...(content ? [{ label: "内容", value: content }] : []),
      ...rows
    ],
    referenceGroups: references,
    stageSketches
  };
}

function cutAttributeRows(cut: CutRecord): DetailRow[] {
  const rows: DetailRow[] = [];
  const seenLabels = new Set<string>();

  if (cut.cameraLabel) {
    rows.push({ label: "カメラ", value: cut.cameraLabel });
    seenLabels.add("カメラ");
  }

  for (const line of splitDetailLines(cut.details)) {
    if (/^CUT\s*[0-9０-９]+/i.test(line)) continue;
    const attribute = parseAttributeLine(line);
    if (!attribute) {
      rows.push({ label: "詳細", value: line });
      continue;
    }
    if (isReferenceHeading(attribute.label) || isCutPlanHeading(attribute.label)) continue;
    if (attribute.label === "ソース行" || attribute.label.toLowerCase() === "line") continue;
    if (attribute.label === "カメラ" || attribute.label.toLowerCase() === "camera") {
      if (!seenLabels.has("カメラ")) rows.push({ label: "カメラ", value: attribute.value });
      seenLabels.add("カメラ");
      continue;
    }
    rows.push({ label: attribute.label, value: attribute.value });
    seenLabels.add(attribute.label);
  }

  if (cut.summary && !seenLabels.has("画面") && !seenLabels.has("内容")) {
    rows.push({ label: "画面", value: cut.summary });
  }
  if (cut.dialogue && !seenLabels.has("セリフ") && !seenLabels.has("台詞")) {
    rows.push({ label: "セリフ", value: cut.dialogue });
  }
  return rows;
}

function DetailTable({ ariaLabel, rows }: { ariaLabel: string; rows: DetailRow[] }) {
  if (rows.length === 0) return <p className="quiet-text">No structured details are available.</p>;
  return (
    <table className="detail-table" aria-label={ariaLabel}>
      <thead>
        <tr>
          <th>項目</th>
          <th>本文</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${row.label}-${index}`}>
            <td>{row.label}</td>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReferenceRoles({ groups }: { groups: ReferenceGroup[] }) {
  if (groups.length === 0) return null;
  return (
    <section className="reference-roles-block" aria-label="参照ロール">
      <h5>参照ロール</h5>
      {groups.map((group) => (
        <section className="reference-group" aria-label={group.name} key={group.name}>
          <h6>{group.name}</h6>
          <table className="reference-table">
            <thead>
              <tr>
                <th>タイトル</th>
                <th>小さいサムネイル</th>
              </tr>
            </thead>
            <tbody>
              {group.items.map((item, index) => (
                <tr key={`${group.name}-${item.title}-${index}`}>
                  <td>{item.title}</td>
                  <td>
                    {item.asset ? (
                      <a href={assetFileUrl(item.asset.id)} target="_blank" rel="noreferrer" aria-label={item.value}>
                        <img className="reference-thumbnail" src={assetFileUrl(item.asset.id)} alt={item.value} loading="lazy" />
                      </a>
                    ) : (
                      <code>{item.value}</code>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </section>
  );
}

function CutDetail({ cut }: { cut: CutRecord }) {
  const title = `CUT ${cut.cutKey}${cut.timeRange ? ` [${cut.timeRange}]` : ""}`;
  return (
    <li className="cut-detail-item">
      <div className="cut-detail-header">
        <strong>{title}</strong>
        {formatDuration(cut.durationSeconds) && <span>{formatDuration(cut.durationSeconds)}</span>}
      </div>
      <DetailTable ariaLabel={`CUT ${cut.cutKey} attributes`} rows={cutAttributeRows(cut)} />
    </li>
  );
}

function OriginalImageLink({
  asset,
  label,
  imageClassName = ""
}: {
  asset: ArtifactRecord;
  label: string;
  imageClassName?: string;
}) {
  return (
    <a className="storyboard-original-link" href={assetFileUrl(asset.id)} target="_blank" rel="noreferrer" aria-label={label}>
      <figure className="storyboard-original-figure">
        <img className={`storyboard-original-image${imageClassName ? ` ${imageClassName}` : ""}`} src={assetFileUrl(asset.id)} alt={label} loading="lazy" />
        <figcaption>{label}</figcaption>
      </figure>
    </a>
  );
}

function listCell(values: string[]): ReactNode {
  if (values.length === 0) return "-";
  return values.join("\n");
}

export function ProductionInsightPanel({
  detail,
  loading,
  onSaveNote,
  onToggleChecked,
  onAddTag,
  selectedPreview = null,
  previewLoading = false,
  onPreviewAsset
}: ProductionInsightPanelProps) {
  const [noteDraft, setNoteDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    setNoteDraft(detail?.manualNote ?? "");
  }, [detail?.production.id, detail?.manualNote]);

  useEffect(() => {
    setTagDraft("");
  }, [detail?.production.id]);

  async function handleAddTag() {
    const tagName = tagDraft.trim();
    if (!tagName) return;
    setTagDraft("");
    await onAddTag?.(tagName);
  }

  if (loading) {
    return (
      <section className="insight-panel" id="selected-production-panel">
        <h2><ListTree size={18} /> Selected Production</h2>
        <p className="quiet-text">Loading selected production details.</p>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="insight-panel" id="selected-production-panel">
        <h2><ListTree size={18} /> Selected Production</h2>
        <p className="quiet-text">Select a production to inspect parsed scenes, cuts, and source assets.</p>
      </section>
    );
  }

  const assetPreview = detail.artifacts.slice(0, 10);
  const issuePreview = (detail.issues ?? []).slice(0, 20);
  const textStoryboards = detail.artifacts.filter((asset) => asset.kind === "text_storyboard").slice(0, 20);
  const textBoardAssets = detail.artifacts.filter(isTextBoardAsset);
  const storyboardImages = detail.artifacts.filter(isStoryboardImage).slice(0, 80);
  const videoPrompts = detail.artifacts.filter((asset) => asset.kind === "video_prompt").slice(0, 20);
  const generatedVideos = detail.artifacts.filter((asset) => asset.kind === "generated_video" || asset.kind === "video").slice(0, 20);
  const orchestratorArtifacts = detail.artifacts
    .filter((asset) => asset.kind === "codex_task" || asset.kind === "approval" || asset.kind === "orchestrator_state")
    .slice(0, 20);
  const orchestratorTasks = (detail.orchestratorTasks ?? []).slice(0, 20);
  const approvals = (detail.approvals ?? []).slice(0, 20);
  const hasOrchestratorRecords = orchestratorArtifacts.length > 0 || orchestratorTasks.length > 0 || approvals.length > 0;
  const artifactsById = new Map(detail.artifacts.map((asset) => [asset.id, asset]));
  const sceneBoardImages = new Set<string>();
  const sceneBoards = detail.scenes.map((scene) => {
    const textAssets = uniqueAssets([
      artifactsById.get(scene.sourceArtifactId),
      ...textBoardAssets.filter((asset) => assetMatchesScene(asset, scene))
    ]);
    const imageAssets = storyboardImages.filter((asset) => assetMatchesScene(asset, scene));
    for (const asset of imageAssets) sceneBoardImages.add(asset.id);
    return { scene, textAssets, imageAssets, sections: sceneDisplaySections(scene, detail.artifacts) };
  });
  const unassignedStoryboardImages = storyboardImages.filter((asset) => !sceneBoardImages.has(asset.id));
  const canAddTag = tagDraft.trim().length > 0;

  return (
    <section className="insight-panel" id="selected-production-panel">
      <div className="insight-header">
        <div>
          <h2><ListTree size={18} /> Selected Production</h2>
          <p>{detail.production.storyName} / {detail.production.productionPath}</p>
        </div>
        <span className={`detection-pill detection-${detail.production.detectionType}`}>
          {detail.production.detectionType}
        </span>
      </div>

      <section className="insight-block gate-status-block" aria-label="Gate Status">
        <h3><ListChecks size={16} /> Gate Status</h3>
        <div className="gate-row">
          {gateIds.map((gate) => (
            <div className={`gate-chip gate-${detail.production.gates[gate]}`} key={gate}>
              <strong>{gate}</strong>
              <span>{detail.production.gates[gate]}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="manual-panel">
        <label className="check-row">
          <input
            type="checkbox"
            checked={detail.production.checked}
            aria-label="Mark production checked"
            onChange={(event) => void onToggleChecked?.(event.currentTarget.checked)}
          />
          <span>Checked in eris-knowledge</span>
        </label>
        <label className="note-field">
          <span>Local note</span>
          <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.currentTarget.value)} />
        </label>
        <button className="secondary-button" type="button" onClick={() => void onSaveNote?.(noteDraft)}>
          <Save size={16} />
          Save note
        </button>
      </div>

      <div className="tag-panel">
        <div className="tag-list" aria-label="Production tags">
          {detail.production.tags.length === 0 ? (
            <span className="quiet-text">No local tags</span>
          ) : (
            detail.production.tags.map((tag) => (
              <span className="tag-chip" key={tag}>{tag}</span>
            ))
          )}
        </div>
        <label className="tag-field">
          <span>New tag</span>
          <input
            aria-label="New tag"
            value={tagDraft}
            onChange={(event) => setTagDraft(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleAddTag();
              }
            }}
          />
        </label>
        <button className="secondary-button" type="button" disabled={!canAddTag} onClick={() => void handleAddTag()}>
          <Tag size={16} />
          Add tag
        </button>
      </div>

      <section className="insight-block scene-boards-block" aria-label="Scene Boards">
        <h3><Image size={16} /> Scene Boards</h3>
        {sceneBoards.length === 0 && unassignedStoryboardImages.length === 0 ? (
          <p className="quiet-text">No parsed scene boards are available for this production.</p>
        ) : (
          <div className="scene-board-list">
            {sceneBoards.map(({ scene, textAssets, imageAssets, sections }) => (
              <article className="scene-board-card" aria-label={`${scene.sceneKey} ${scene.title}`} key={scene.id}>
                <div className="scene-board-heading">
                  <div>
                    <h4>
                      {scene.sceneKey} {scene.title}
                      {scene.timeRange && ` ${scene.timeRange}`}
                      {formatDuration(scene.durationSeconds) && ` / ${formatDuration(scene.durationSeconds)}`}
                    </h4>
                  </div>
                </div>
                <div className="scene-board-layout">
                  <div className="scene-text-panel">
                    <DetailTable ariaLabel="Scene information" rows={sections.infoRows} />
                    <ReferenceRoles groups={sections.referenceGroups} />
                    <section className="scene-cut-list" aria-label="カットプラン">
                      <strong>カットプラン</strong>
                      {scene.cuts.length === 0 ? (
                        <p className="quiet-text">No parsed cuts are available for this scene.</p>
                      ) : (
                        <ol>
                          {scene.cuts.map((cut) => <CutDetail cut={cut} key={cut.id} />)}
                        </ol>
                      )}
                    </section>
                    <div className="scene-source-assets">
                      <strong>Text Sources</strong>
                      {textAssets.length === 0 ? (
                        <p className="quiet-text">No text source is linked to this scene.</p>
                      ) : (
                        <ul className="asset-mini-list">
                          {textAssets.map((asset) => (
                            <li className="asset-action-item" key={asset.id}>
                              <div>
                                <span>{asset.kind}</span>
                                <code>{asset.relativePath}</code>
                              </div>
                              <button
                                className="secondary-button asset-preview-button"
                                type="button"
                                aria-label={`Preview ${asset.relativePath}`}
                                onClick={() => void onPreviewAsset?.(asset.id)}
                              >
                                <Eye size={14} />
                                Preview
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <section className="scene-image-panel" aria-label="絵コンテ">
                    <strong>絵コンテ</strong>
                    {sections.stageSketches.length > 0 && (
                      <div className="storyboard-original-list stage-sketch-original-list" aria-label="stage_sketch">
                        {sections.stageSketches.map((item, index) => (
                          item.asset ? (
                            <OriginalImageLink
                              asset={item.asset}
                              imageClassName="stage-sketch-original-image"
                              key={`${item.value}-${index}`}
                              label={item.value}
                            />
                          ) : (
                            <code key={`${item.value}-${index}`}>{item.value}</code>
                          )
                        ))}
                      </div>
                    )}
                    {imageAssets.length > 0 ? (
                      <div className="storyboard-original-list">
                        {imageAssets.map((asset) => (
                          <OriginalImageLink asset={asset} key={asset.id} label={asset.relativePath} />
                        ))}
                      </div>
                    ) : (
                      sections.stageSketches.length === 0 && <p className="quiet-text">No storyboard images are matched to this scene.</p>
                    )}
                  </section>
                </div>
              </article>
            ))}
            {unassignedStoryboardImages.length > 0 && (
              <article className="scene-board-card unassigned-scene-board" aria-label="Unassigned Storyboard Images">
                <div className="scene-board-heading">
                  <div>
                    <h4>Unassigned Storyboard Images</h4>
                    <span>{unassignedStoryboardImages.length} assets</span>
                  </div>
                </div>
                <div className="storyboard-original-list">
                  {unassignedStoryboardImages.map((asset) => (
                    <OriginalImageLink asset={asset} key={asset.id} label={asset.relativePath} />
                  ))}
                </div>
              </article>
            )}
          </div>
        )}
      </section>

      <div className="production-asset-groups">
        <section className="insight-block production-asset-section" aria-label="Text Storyboards">
          <h3><FileText size={16} /> Text Storyboards</h3>
          {textStoryboards.length === 0 ? (
            <p className="quiet-text">No text storyboards are indexed for this production.</p>
          ) : (
            <ul className="asset-mini-list">
              {textStoryboards.map((asset) => (
                <li className="asset-action-item" key={asset.id}>
                  <div>
                    <span>{asset.gate ?? "storyboard"}</span>
                    <code>{asset.relativePath}</code>
                  </div>
                  <button
                    className="secondary-button asset-preview-button"
                    type="button"
                    aria-label={`Preview ${asset.relativePath}`}
                    onClick={() => void onPreviewAsset?.(asset.id)}
                  >
                    <Eye size={14} />
                    Preview
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="insight-block production-asset-section" aria-label="Video Prompt List">
          <h3><FileText size={16} /> Video Prompt List</h3>
          {videoPrompts.length === 0 ? (
            <p className="quiet-text">No video prompts are indexed for this production.</p>
          ) : (
            <ul className="asset-mini-list">
              {videoPrompts.map((asset) => (
                <li className="asset-action-item" key={asset.id}>
                  <div>
                    <span>{asset.gate ?? "prompt"}</span>
                    <code>{asset.relativePath}</code>
                  </div>
                  <button
                    className="secondary-button asset-preview-button"
                    type="button"
                    aria-label={`Preview ${asset.relativePath}`}
                    onClick={() => void onPreviewAsset?.(asset.id)}
                  >
                    <Eye size={14} />
                    Preview
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="insight-block production-asset-section" aria-label="Generated Videos">
          <h3><Video size={16} /> Generated Videos</h3>
          {generatedVideos.length === 0 ? (
            <p className="quiet-text">No generated videos are indexed for this production.</p>
          ) : (
            <ul className="asset-mini-list">
              {generatedVideos.map((asset) => (
                <li key={asset.id}>
                  <span>{asset.gate ?? "video"}</span>
                  <code>{asset.relativePath}</code>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="insight-block source-assets-block" aria-label="Source Assets">
        <h3><FileText size={16} /> Source Assets</h3>
        {assetPreview.length === 0 ? (
          <p className="quiet-text">No assets are indexed for this production.</p>
        ) : (
          <ul className="asset-mini-list">
            {assetPreview.map((asset) => (
              <li key={asset.id}>
                <span>{asset.kind}</span>
                <code>{asset.relativePath}</code>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="asset-preview-panel detail-preview-panel" aria-label="Selected Production Preview" aria-live="polite">
        <h3>Selected Production Preview</h3>
        {previewLoading ? (
          <p className="quiet-text">Loading preview.</p>
        ) : selectedPreview ? (
          <div className="asset-preview-content">
            <div className="asset-preview-meta">
              <span>{selectedPreview.kind}</span>
              <span>{selectedPreview.sizeBytes} bytes</span>
              <span>{selectedPreview.truncated ? "truncated" : "full preview"}</span>
            </div>
            <code>{selectedPreview.relativePath}</code>
            {selectedPreview.mode === "text" ? (
              <pre>{selectedPreview.text}</pre>
            ) : (
              <p className="quiet-text">Inline preview is not available for this asset type. Use the path for external review.</p>
            )}
          </div>
        ) : (
          <p className="quiet-text">Select a text storyboard or video prompt to preview it without editing source files.</p>
        )}
      </section>

      <section className="insight-block orchestrator-block" aria-label="Orchestrator Records">
        <h3><FileText size={16} /> Orchestrator Records</h3>
        {!hasOrchestratorRecords ? (
          <p className="quiet-text">No orchestrator task, approval, or state records are indexed for this production.</p>
        ) : (
          <div className="orchestrator-record-stack">
            {orchestratorTasks.length > 0 && (
              <div className="orchestrator-table-block">
                <strong>Codex Tasks</strong>
                <table className="detail-table orchestrator-table" aria-label="Codex task records">
                  <thead>
                    <tr>
                      <th>Gate</th>
                      <th>Task</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Expected Outputs</th>
                      <th>Context Paths</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orchestratorTasks.map((task) => (
                      <tr key={task.id}>
                        <td>{task.gateId ?? "-"}</td>
                        <td>{task.taskId ?? "-"}</td>
                        <td>{task.title ?? "-"}</td>
                        <td>{task.status ?? "-"}</td>
                        <td>{listCell(task.expectedOutputs)}</td>
                        <td>{listCell(task.contextPaths)}</td>
                        <td>{task.createdAt ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {approvals.length > 0 && (
              <div className="orchestrator-table-block">
                <strong>Approvals</strong>
                <table className="detail-table orchestrator-table" aria-label="Approval records">
                  <thead>
                    <tr>
                      <th>Gate</th>
                      <th>Approval</th>
                      <th>Status</th>
                      <th>Decision</th>
                      <th>Actor</th>
                      <th>Decided</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvals.map((approval) => (
                      <tr key={approval.id}>
                        <td>{approval.gateId ?? "-"}</td>
                        <td>{approval.approvalId ?? "-"}</td>
                        <td>{approval.status ?? "-"}</td>
                        <td>{approval.decision ?? "-"}</td>
                        <td>{approval.actor ?? "-"}</td>
                        <td>{approval.decidedAt ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {orchestratorArtifacts.length > 0 && (
              <div className="orchestrator-table-block">
                <strong>Source Files</strong>
                <ul className="asset-mini-list">
                  {orchestratorArtifacts.map((asset) => (
                    <li key={asset.id}>
                      <span>{asset.kind}</span>
                      <code>{asset.relativePath}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="insight-block scan-issues-block">
        <h3><AlertTriangle size={16} /> Scan Issues</h3>
        {issuePreview.length === 0 ? (
          <p className="quiet-text">No scan issues are recorded for this production.</p>
        ) : (
          <ul className="scan-issue-list">
            {issuePreview.map((issue) => (
              <li key={issue.id}>
                <div className="scan-issue-meta">
                  <span className={`issue-severity issue-${issue.severity}`}>{issue.severity}</span>
                  <code>{issue.issueCode}</code>
                </div>
                <p>{issue.message}</p>
                <code>{issue.relativePath}</code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

