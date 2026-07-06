import type { ProductionSummary } from "../../shared/types";
import { ProductionDetail } from "./ProductionDetail";

interface ProductionListProps {
  productions: ProductionSummary[];
  selectedProductionId?: string | null;
  onSelect?: (productionId: string) => void;
}

export function ProductionList({ productions, selectedProductionId = null, onSelect }: ProductionListProps) {
  return (
    <section className="production-section">
      <h2>Productions</h2>
      <div className="production-grid">
        {productions.map((production) => (
          <ProductionDetail
            key={production.id}
            production={production}
            selected={production.id === selectedProductionId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
