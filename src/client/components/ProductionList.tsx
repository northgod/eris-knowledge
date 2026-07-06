import type { ProductionSummary } from "../../shared/types";
import { ProductionDetail } from "./ProductionDetail";

interface ProductionListProps {
  productions: ProductionSummary[];
}

export function ProductionList({ productions }: ProductionListProps) {
  return (
    <section className="production-section">
      <h2>Productions</h2>
      <div className="production-grid">
        {productions.map((production) => (
          <ProductionDetail key={production.id} production={production} />
        ))}
      </div>
    </section>
  );
}
