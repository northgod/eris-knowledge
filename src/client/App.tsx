import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { ArtifactRecord, ProductionDetailPayload, ProductionSummary } from "../shared/types";
import {
  fetchAssets,
  fetchProductionDetail,
  fetchProductions,
  runScan,
  saveManualNote,
  saveManualStatus
} from "./api";
import { AssetBrowser } from "./components/AssetBrowser";
import { Dashboard } from "./components/Dashboard";
import { NeedsAttention } from "./components/NeedsAttention";
import { ProductionInsightPanel } from "./components/ProductionInsightPanel";
import { ProductionList } from "./components/ProductionList";

export function App() {
  const [productions, setProductions] = useState<ProductionSummary[]>([]);
  const [assets, setAssets] = useState<ArtifactRecord[]>([]);
  const [selectedProductionId, setSelectedProductionId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ProductionDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
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

  async function handleSaveNote(note: string) {
    if (!selectedProductionId) return;
    try {
      await saveManualNote("production", selectedProductionId, note);
      setSelectedDetail((current) => (current ? { ...current, manualNote: note } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleToggleChecked(checked: boolean) {
    if (!selectedProductionId) return;
    try {
      await saveManualStatus("production", selectedProductionId, checked);
      setSelectedDetail((current) =>
        current ? { ...current, production: { ...current.production, checked } } : current
      );
      setProductions((current) =>
        current.map((production) =>
          production.id === selectedProductionId ? { ...production, checked } : production
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  function handleAttentionSelect(productionId: string) {
    setSelectedProductionId(productionId);
    window.requestAnimationFrame(() => {
      document.getElementById("selected-production-panel")?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (productions.length === 0) {
      setSelectedProductionId(null);
      return;
    }
    if (!selectedProductionId || !productions.some((production) => production.id === selectedProductionId)) {
      setSelectedProductionId(productions[0].id);
    }
  }, [loading, productions, selectedProductionId]);

  useEffect(() => {
    if (!selectedProductionId) {
      setSelectedDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    fetchProductionDetail(selectedProductionId)
      .then((detail) => {
        if (!cancelled) setSelectedDetail(detail);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedProductionId]);

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
      {!loading && (
        <ProductionList
          productions={productions}
          selectedProductionId={selectedProductionId}
          onSelect={setSelectedProductionId}
        />
      )}
      {!loading && (
        <ProductionInsightPanel
          detail={selectedDetail}
          loading={detailLoading}
          onSaveNote={handleSaveNote}
          onToggleChecked={handleToggleChecked}
        />
      )}
      {!loading && (
        <NeedsAttention
          productions={productions}
          selectedProductionId={selectedProductionId}
          onSelect={handleAttentionSelect}
        />
      )}
      {!loading && <AssetBrowser assets={assets} />}
    </main>
  );
}

