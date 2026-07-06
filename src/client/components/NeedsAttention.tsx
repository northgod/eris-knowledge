import { AlertTriangle } from "lucide-react";
import type { ProductionSummary } from "../../shared/types";

interface NeedsAttentionProps {
  productions: ProductionSummary[];
}

export function NeedsAttention({ productions }: NeedsAttentionProps) {
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
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.storyName} / {item.productionPath}</strong>
              <span>G2: {item.gates.G2}, G3: {item.gates.G3}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
