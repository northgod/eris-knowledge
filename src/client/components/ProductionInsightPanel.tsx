import { FileText, ListTree, Save } from "lucide-react";
import { useEffect, useState } from "react";
import type { ProductionDetailPayload } from "../../shared/types";

interface ProductionInsightPanelProps {
  detail: ProductionDetailPayload | null;
  loading: boolean;
  onSaveNote?: (note: string) => void | Promise<void>;
  onToggleChecked?: (checked: boolean) => void | Promise<void>;
}

export function ProductionInsightPanel({ detail, loading, onSaveNote, onToggleChecked }: ProductionInsightPanelProps) {
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    setNoteDraft(detail?.manualNote ?? "");
  }, [detail?.production.id, detail?.manualNote]);

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
    </section>
  );
}

