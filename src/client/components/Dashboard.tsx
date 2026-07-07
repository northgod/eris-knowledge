import { AlertTriangle, CheckCircle2, Database, Layers } from "lucide-react";
import { needsAttention as productionNeedsAttention } from "../../shared/attention";
import type { ProductionSummary } from "../../shared/types";

interface DashboardProps {
  productions: ProductionSummary[];
}

export function Dashboard({ productions }: DashboardProps) {
  const needsAttention = productions.filter(productionNeedsAttention).length;
  const checked = productions.filter((production) => production.checked).length;

  return (
    <section className="dashboard-grid" aria-label="Dashboard">
      <article className="metric-card">
        <div className="metric-icon"><Layers size={18} /></div>
        <span className="metric-label">Productions</span>
        <strong>{productions.length}</strong>
      </article>
      <article className="metric-card">
        <div className="metric-icon"><AlertTriangle size={18} /></div>
        <span className="metric-label">Needs Attention</span>
        <strong>{needsAttention}</strong>
      </article>
      <article className="metric-card">
        <div className="metric-icon"><CheckCircle2 size={18} /></div>
        <span className="metric-label">Checked</span>
        <strong>{checked}</strong>
      </article>
      <article className="metric-card">
        <div className="metric-icon"><Database size={18} /></div>
        <span className="metric-label">Read Only Source</span>
        <strong>ScarletEchoes</strong>
      </article>
    </section>
  );
}
