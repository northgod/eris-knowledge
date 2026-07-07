import { AlertTriangle, Eye } from "lucide-react";
import { toNeedsAttentionItem } from "../../shared/attention";
import type { NeedsAttentionItem, ProductionSummary } from "../../shared/types";

interface NeedsAttentionProps {
  productions: ProductionSummary[];
  selectedProductionId?: string | null;
  onSelect?: (productionId: string) => void;
}

export function NeedsAttention({ productions, selectedProductionId = null, onSelect }: NeedsAttentionProps) {
  const items = productions
    .map(toNeedsAttentionItem)
    .filter((item): item is NeedsAttentionItem => item !== null);

  return (
    <section className="attention-section">
      <h2><AlertTriangle size={18} /> Needs Attention</h2>
      {items.length === 0 ? (
        <p className="quiet-text">No production currently needs attention.</p>
      ) : (
        <ul className="attention-list">
          {items.map((item) => {
            const title = `${item.storyName} / ${item.productionPath}`;
            const selected = item.id === selectedProductionId;
            return (
              <li className={selected ? "is-selected" : undefined} key={item.id}>
                <div>
                  <strong>{title}</strong>
                  <span>{item.sceneCount} scenes / {item.cutCount} cuts</span>
                  <div className="attention-reason-list" aria-label={`Attention reasons for ${title}`}>
                    {item.attentionReasons.map((attentionReason) => (
                      <span key={attentionReason.code}>{attentionReason.label}</span>
                    ))}
                  </div>
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
