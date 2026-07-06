import { AlertTriangle, FileText, Image, ListTree, Save, Tag, Video } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProductionDetailPayload } from "../../shared/types";

interface ProductionInsightPanelProps {
  detail: ProductionDetailPayload | null;
  loading: boolean;
  onSaveNote?: (note: string) => void | Promise<void>;
  onToggleChecked?: (checked: boolean) => void | Promise<void>;
  onAddTag?: (name: string) => void | Promise<void>;
}

function assetFileUrl(assetId: string): string {
  return `/api/assets/${encodeURIComponent(assetId)}/file`;
}

export function ProductionInsightPanel({
  detail,
  loading,
  onSaveNote,
  onToggleChecked,
  onAddTag
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
  const scenePreview = detail.scenes.slice(0, 8);
  const issuePreview = (detail.issues ?? []).slice(0, 20);
  const storyboardImages = detail.artifacts.filter((asset) => asset.kind === "storyboard_sheet").slice(0, 12);
  const videoPrompts = detail.artifacts.filter((asset) => asset.kind === "video_prompt").slice(0, 20);
  const generatedVideos = detail.artifacts.filter((asset) => asset.kind === "generated_video" || asset.kind === "video").slice(0, 20);
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

      <div className="insight-columns">
        <div className="insight-block">
          <h3>Scenes and Cuts</h3>
          {scenePreview.length === 0 ? (
            <p className="quiet-text">No parsed scenes are available for this production.</p>
          ) : (
            <ul className="scene-list">
              {scenePreview.map((scene) => (
                <li key={scene.id}>
                  <strong>{scene.sceneKey} {scene.title}</strong>
                  {scene.summary && <span>{scene.summary}</span>}
                  {scene.cuts.length > 0 && (
                    <ol>
                      {scene.cuts.slice(0, 4).map((cut) => (
                        <li key={cut.id}>
                          <span>{cut.cutKey}</span>
                          <p>{cut.summary ?? cut.dialogue ?? "No cut summary"}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="insight-block">
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
        </div>
      </div>

      <div className="production-asset-groups">
        <section className="insight-block production-asset-section" aria-label="Storyboard Gallery">
          <h3><Image size={16} /> Storyboard Gallery</h3>
          {storyboardImages.length === 0 ? (
            <p className="quiet-text">No storyboard sheets are indexed for this production.</p>
          ) : (
            <div className="storyboard-gallery">
              {storyboardImages.map((asset) => (
                <figure key={asset.id}>
                  <img src={assetFileUrl(asset.id)} alt={asset.relativePath} loading="lazy" />
                  <figcaption>{asset.relativePath}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>

        <section className="insight-block production-asset-section" aria-label="Video Prompt List">
          <h3><FileText size={16} /> Video Prompt List</h3>
          {videoPrompts.length === 0 ? (
            <p className="quiet-text">No video prompts are indexed for this production.</p>
          ) : (
            <ul className="asset-mini-list">
              {videoPrompts.map((asset) => (
                <li key={asset.id}>
                  <span>{asset.gate ?? "prompt"}</span>
                  <code>{asset.relativePath}</code>
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

