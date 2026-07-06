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
  return ["storyboard_sheet", "storyboard_reference", "stage_sketch", "image"].includes(asset.kind)
    && [".png", ".jpg", ".jpeg", ".webp"].includes(asset.extension.toLowerCase());
}

function isTextBoardAsset(asset: ArtifactRecord): boolean {
  return ["text_storyboard", "markdown", "video_prompt"].includes(asset.kind) && asset.extension.toLowerCase() === ".md";
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null;
  return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)}s`;
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function CutDetail({ cut }: { cut: CutRecord }) {
  const title = `CUT ${cut.cutKey}${cut.timeRange ? ` ${cut.timeRange}` : ""}`;
  return (
    <li className="cut-detail-item">
      <div className="cut-detail-header">
        <strong>{title}</strong>
        {formatDuration(cut.durationSeconds) && <span>{formatDuration(cut.durationSeconds)}</span>}
      </div>
      <dl className="detail-grid compact-detail-grid">
        {cut.cameraLabel && <DetailItem label="Camera">{cut.cameraLabel}</DetailItem>}
        <DetailItem label="Line">{cut.lineNumber}</DetailItem>
        {cut.summary && <DetailItem label="Summary">{cut.summary}</DetailItem>}
        {cut.dialogue && <DetailItem label="Dialogue">{cut.dialogue}</DetailItem>}
      </dl>
      {cut.details && <pre className="raw-detail-text">{cut.details}</pre>}
    </li>
  );
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
  const artifactsById = new Map(detail.artifacts.map((asset) => [asset.id, asset]));
  const sceneBoardImages = new Set<string>();
  const sceneBoards = detail.scenes.map((scene) => {
    const textAssets = uniqueAssets([
      artifactsById.get(scene.sourceArtifactId),
      ...textBoardAssets.filter((asset) => assetMatchesScene(asset, scene))
    ]);
    const imageAssets = storyboardImages.filter((asset) => assetMatchesScene(asset, scene));
    for (const asset of imageAssets) sceneBoardImages.add(asset.id);
    return { scene, textAssets, imageAssets };
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
            {sceneBoards.map(({ scene, textAssets, imageAssets }) => (
              <article className="scene-board-card" aria-label={`${scene.sceneKey} ${scene.title}`} key={scene.id}>
                <div className="scene-board-heading">
                  <div>
                    <h4>{scene.sceneKey} {scene.title}</h4>
                    <span>Line {scene.lineNumber}</span>
                  </div>
                  <div className="scene-board-time">
                    {scene.timeRange && <strong>{scene.timeRange}</strong>}
                    {formatDuration(scene.durationSeconds) && <span>{formatDuration(scene.durationSeconds)}</span>}
                  </div>
                </div>
                <div className="scene-board-layout">
                  <div className="scene-text-panel">
                    <dl className="detail-grid">
                      <DetailItem label="Scene">{scene.sceneKey}</DetailItem>
                      <DetailItem label="Title">{scene.title}</DetailItem>
                      {scene.timeRange && <DetailItem label="Time">{scene.timeRange}</DetailItem>}
                      {formatDuration(scene.durationSeconds) && (
                        <DetailItem label="Duration">{formatDuration(scene.durationSeconds)}</DetailItem>
                      )}
                      {scene.summary && <DetailItem label="Summary">{scene.summary}</DetailItem>}
                    </dl>
                    {scene.details && <pre className="raw-detail-text">{scene.details}</pre>}
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
                    <div className="scene-cut-list">
                      <strong>Cuts</strong>
                      {scene.cuts.length === 0 ? (
                        <p className="quiet-text">No parsed cuts are available for this scene.</p>
                      ) : (
                        <ol>
                          {scene.cuts.map((cut) => <CutDetail cut={cut} key={cut.id} />)}
                        </ol>
                      )}
                    </div>
                  </div>
                  <div className="scene-image-panel">
                    <strong>Storyboard Images</strong>
                    {imageAssets.length === 0 ? (
                      <p className="quiet-text">No storyboard images are matched to this scene.</p>
                    ) : (
                      <div className="storyboard-gallery scene-storyboard-gallery">
                        {imageAssets.map((asset) => (
                          <a href={assetFileUrl(asset.id)} key={asset.id} target="_blank" rel="noreferrer" aria-label={asset.relativePath}>
                            <figure>
                              <img src={assetFileUrl(asset.id)} alt={asset.relativePath} loading="lazy" />
                              <figcaption>{asset.relativePath}</figcaption>
                            </figure>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
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
                <div className="storyboard-gallery scene-storyboard-gallery">
                  {unassignedStoryboardImages.map((asset) => (
                    <a href={assetFileUrl(asset.id)} key={asset.id} target="_blank" rel="noreferrer" aria-label={asset.relativePath}>
                      <figure>
                        <img src={assetFileUrl(asset.id)} alt={asset.relativePath} loading="lazy" />
                        <figcaption>{asset.relativePath}</figcaption>
                      </figure>
                    </a>
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
        {orchestratorArtifacts.length === 0 ? (
          <p className="quiet-text">No orchestrator task, approval, or state records are indexed for this production.</p>
        ) : (
          <ul className="asset-mini-list">
            {orchestratorArtifacts.map((asset) => (
              <li key={asset.id}>
                <span>{asset.kind}</span>
                <code>{asset.relativePath}</code>
              </li>
            ))}
          </ul>
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

