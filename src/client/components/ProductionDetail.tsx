import type { GateId, ProductionSummary } from "../../shared/types";

interface ProductionDetailProps {
  production: ProductionSummary;
}

const gates: GateId[] = ["G0", "G1", "G2", "G3", "G4"];

export function ProductionDetail({ production }: ProductionDetailProps) {
  return (
    <article className="production-card">
      <div className="production-card-header">
        <div>
          <h3>{production.storyName} / {production.productionPath}</h3>
          <span className="source-label">Read-only source</span>
        </div>
        <span className={`detection-pill detection-${production.detectionType}`}>
          {production.detectionType}
        </span>
      </div>
      <code className="path-line">{production.absolutePath}</code>
      <div className="gate-row">
        {gates.map((gate) => (
          <div className={`gate-chip gate-${production.gates[gate]}`} key={gate}>
            <strong>{gate}</strong>
            <span>{production.gates[gate]}</span>
          </div>
        ))}
      </div>
      <dl className="production-stats">
        <div><dt>Scenes</dt><dd>{production.sceneCount}</dd></div>
        <div><dt>Cuts</dt><dd>{production.cutCount}</dd></div>
        <div><dt>Sheets</dt><dd>{production.storyboardSheetCount}</dd></div>
        <div><dt>Prompts</dt><dd>{production.videoPromptCount}</dd></div>
        <div><dt>Videos</dt><dd>{production.generatedVideoCount}</dd></div>
      </dl>
    </article>
  );
}
