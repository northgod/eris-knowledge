import { Eye } from "lucide-react";
import type { GateId, ProductionSummary } from "../../shared/types";

interface ProductionDetailProps {
  production: ProductionSummary;
  selected?: boolean;
  onSelect?: (productionId: string) => void;
}

const gates: GateId[] = ["G0", "G1", "G2", "G3", "G4"];

function updatedLabel(lastContentMtime: string | null): string {
  return lastContentMtime ? `Updated ${lastContentMtime.slice(0, 10)}` : "No indexed update time";
}

function needsLabel(production: ProductionSummary): string {
  const needs = gates.filter((gate) => {
    const status = production.gates[gate];
    return status === "missing" || status === "partial";
  });
  return needs.length === 0 ? "All gates detected" : `Needs ${needs.join(", ")}`;
}

function issuesLabel(issueCount: number): string {
  return issueCount === 1 ? "1 issue" : `${issueCount} issues`;
}

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
      <div className="production-progress-meta" aria-label="Production progress summary">
        <span>{updatedLabel(production.lastContentMtime)}</span>
        <span>{needsLabel(production)}</span>
        {production.issueCount > 0 && <span className="issue-meta-chip">{issuesLabel(production.issueCount)}</span>}
        {production.checked && <span>checked</span>}
        {production.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
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
