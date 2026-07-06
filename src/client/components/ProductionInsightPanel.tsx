import { FileText, ListTree } from "lucide-react";
import type { ProductionDetailPayload } from "../../shared/types";

interface ProductionInsightPanelProps {
  detail: ProductionDetailPayload | null;
  loading: boolean;
}

export function ProductionInsightPanel({ detail, loading }: ProductionInsightPanelProps) {
  if (loading) {
    return (
      <section className="insight-panel">
        <h2><ListTree size={18} /> Selected Production</h2>
        <p className="quiet-text">Loading selected production details.</p>
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="insight-panel">
        <h2><ListTree size={18} /> Selected Production</h2>
        <p className="quiet-text">Select a production to inspect parsed scenes, cuts, and source assets.</p>
      </section>
    );
  }

  const assetPreview = detail.artifacts.slice(0, 10);
  const scenePreview = detail.scenes.slice(0, 8);

  return (
    <section className="insight-panel">
      <div className="insight-header">
        <div>
          <h2><ListTree size={18} /> Selected Production</h2>
          <p>{detail.production.storyName} / {detail.production.productionPath}</p>
        </div>
        <span className={`detection-pill detection-${detail.production.detectionType}`}>
          {detail.production.detectionType}
        </span>
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
