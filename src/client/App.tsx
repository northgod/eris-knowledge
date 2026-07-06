import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { ArtifactRecord, ProductionSummary } from "../shared/types";
import { fetchAssets, fetchProductions, runScan } from "./api";
import { AssetBrowser } from "./components/AssetBrowser";
import { Dashboard } from "./components/Dashboard";
import { NeedsAttention } from "./components/NeedsAttention";
import { ProductionList } from "./components/ProductionList";

export function App() {
  const [productions, setProductions] = useState<ProductionSummary[]>([]);
  const [assets, setAssets] = useState<ArtifactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextProductions, nextAssets] = await Promise.all([fetchProductions(), fetchAssets()]);
      setProductions(nextProductions);
      setAssets(nextAssets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function scanAndReload() {
    setLoading(true);
    setError(null);
    try {
      await runScan();
      const [nextProductions, nextAssets] = await Promise.all([fetchProductions(), fetchAssets()]);
      setProductions(nextProductions);
      setAssets(nextAssets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>eris-knowledge</h1>
          <p>Read-only production knowledge for ScarletEchoes</p>
        </div>
        <button className="icon-button" onClick={scanAndReload} aria-label="Run scan">
          <RefreshCw size={18} />
          Scan
        </button>
      </header>
      {error && <div className="error-banner">{error}</div>}
      {loading ? <div className="loading">Loading</div> : <Dashboard productions={productions} />}
      {!loading && <ProductionList productions={productions} />}
      {!loading && <NeedsAttention productions={productions} />}
      {!loading && <AssetBrowser assets={assets} />}
    </main>
  );
}
