import { AlertTriangle, Eye } from "lucide-react";
import type { ProductionSummary } from "../../shared/types";

interface NeedsAttentionProps {
  productions: ProductionSummary[];
  selectedProductionId?: string | null;
  onSelect?: (productionId: string) => void;
}

export function NeedsAttention({ productions, selectedProductionId = null, onSelect }: NeedsAttentionProps) {
  const items = productions.filter(
    (production) =>
      production.detectionType !== "loose" &&
      production.gates.G1 === "detected" &&
      (production.gates.G2 === "missing" || production.gates.G3 === "missing")
  );

  return (
    <section className="attention-section">
      <h2><AlertTriangle size={18} /> Needs Attention</h2>
      {items.length === 0 ? (
        <p className="quiet-text">No production currently matches the initial attention rules.</p>
      ) : (
        <ul className="attention-list">
          {items.map((item) => {
            const title = `${item.storyName} / ${item.productionPath}`;
            const selected = item.id === selectedProductionId;
            return (
              <li className={selected ? "is-selected" : undefined} key={item.id}>
                <div>
                  <strong>{title}</strong>
                  <span>G2: {item.gates.G2}, G3: {item.gates.G3}</span>
                </div>
                {onSelect && (
                  <button
                    className="secondary-button attention-detail-button"
                    type="button"
                    aria-label={`Show details for ${title}`}
                    onClick={() => onSelect(item.id)}
                  >
                    <Eye size={16} />
                    {selected ? "Selected" : "Details"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
