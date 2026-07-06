import { Eye } from "lucide-react";
import type { GateId, ProductionSummary } from "../../shared/types";

interface ProductionDetailProps {
  production: ProductionSummary;
  selected?: boolean;
  onSelect?: (productionId: string) => void;
}

const gates: GateId[] = ["G0", "G1", "G2", "G3", "G4"];

export function ProductionDetail({ production, selected = false, onSelect }: ProductionDetailProps) {
  const title = `${production.storyName} / ${production.productionPath}`;

  return (
    <article className={`production-card${selected ? " is-selected" : ""}`}>
      <div className="production-card-header">
        <div>
          <h3>{title}</h3>
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
      {onSelect && (
        <button
          className="secondary-button detail-button"
          type="button"
          aria-label={`Show details for ${title}`}
          onClick={() => onSelect(production.id)}
        >
          <Eye size={16} />
          {selected ? "Selected" : "Details"}
        </button>
      )}
    </article>
  );
}
